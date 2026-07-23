import { db, FieldValue } from "../firebaseInit.js";
import { logger } from "../lib/utils.js";
import { Wallet } from "../lib/wallet.js";
import Stripe from "stripe";

const stripeClient = (() => {
    let instance: Stripe;
    return () => {
        if (!instance) {
            if (!process.env.STRIPE_SECRET_KEY) {
                return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
                    apiVersion: "2023-10-16" as any
                });
            }
            instance = new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: "2023-10-16" as any
            });
        }
        return instance;
    };
})();

export class AutoReplenishService {
    /**
     * Trigger auto-replenish of credits if balance drops below threshold
     */
    static async replenishIfNeeded(uid: string, newBalance: number): Promise<void> {
        // 1. Quick guard to avoid unnecessary lookups
        if (newBalance > 100) return;

        try {
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) return;

            const userData = userSnap.data() as any;
            const enabled = userData.autoReplenishEnabled || false;
            const threshold = userData.autoReplenishThreshold ?? 20;
            const pack = userData.autoReplenishPack || 'booster';
            const customerId = userData.stripeCustomerId;

            // Check configuration criteria
            if (!enabled || newBalance > threshold || !customerId) return;

            // 2. Lock check to prevent double billing on simultaneous requests
            const lockRef = db.collection('auto_replenish_locks').doc(uid);
            const lockSnap = await lockRef.get();
            const now = Date.now();

            if (lockSnap.exists) {
                const lockData = lockSnap.data() as any;
                const lockTime = lockData.timestamp?.toDate()?.getTime() || 0;
                // 5 minutes lock expiry
                if (now - lockTime < 300000) {
                    logger.info(`[AutoReplenish] Lock active for user ${uid}. Skipping.`);
                    return;
                }
            }

            logger.info(`[AutoReplenish] Triggered replenishment for ${uid}. Current Balance: ${newBalance}, Threshold: ${threshold}`);

            // Establish lock
            await lockRef.set({ timestamp: FieldValue.serverTimestamp() });

            // 3. Process Charge
            const stripe = stripeClient();
            let amountCents = 999;
            let zapsToAdd = 150;
            let description = 'DreamBees Pro Booster Auto-Replenish';

            if (pack === 'starter') {
                amountCents = 499;
                zapsToAdd = 50;
                description = 'DreamBees Starter Pack Auto-Replenish';
            } else if (pack === 'vault') {
                amountCents = 1999;
                zapsToAdd = 350;
                description = 'DreamBees Studio Vault Auto-Replenish';
            } else if (pack === 'infinite') {
                amountCents = 4999;
                zapsToAdd = 1000;
                description = 'DreamBees Infinite Source Auto-Replenish';
            }

            const customer = await stripe.customers.retrieve(customerId) as any;
            const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

            const paymentParams: Stripe.PaymentIntentCreateParams = {
                amount: amountCents,
                currency: 'usd',
                customer: customerId,
                off_session: true,
                confirm: true,
                description
            };

            if (defaultPaymentMethod) {
                paymentParams.payment_method = defaultPaymentMethod;
            }

            const paymentIntent = await stripe.paymentIntents.create(paymentParams);

            if (paymentIntent.status === 'succeeded') {
                const requestId = `replenish_${paymentIntent.id}`;
                await db.runTransaction(async (t) => {
                    await Wallet.credit(
                        uid,
                        zapsToAdd,
                        requestId,
                        { type: 'auto_replenish', currency: 'zaps', amount: amountCents, pack },
                        'zaps',
                        t
                    );
                    t.update(userRef, {
                        purchasedZaps: FieldValue.increment(zapsToAdd)
                    });
                });
                logger.info(`[AutoReplenish] Succeeded for user ${uid}. Credited ${zapsToAdd} Zaps.`);
            } else {
                throw new Error(`Stripe charge status: ${paymentIntent.status}`);
            }
        } catch (error: any) {
            logger.error(`[AutoReplenish] Failed for user ${uid}:`, error);
            // Disable auto-replenish to prevent loops on declined/expired payment methods
            await db.collection('users').doc(uid).update({
                autoReplenishEnabled: false,
                autoReplenishError: error.message || 'Payment method failed'
            }).catch(() => {});
        } finally {
            // Delete lock
            await db.collection('auto_replenish_locks').doc(uid).delete().catch(() => {});
        }
    }
}
