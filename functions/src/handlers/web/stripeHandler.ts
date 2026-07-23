import { db, FieldValue } from "../../firebaseInit.js";
import { logger } from "../../lib/utils.js";
import { constructWebhookEvent } from "../../lib/stripe.js";
import { Wallet } from "../../lib/wallet.js";
import Stripe from "stripe";

export const handleStripeWebhook = async (req: any, res: any) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    try {
        event = constructWebhookEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
        logger.error("Webhook Error", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const customerId = session.customer as string;
            const mode = session.mode;

            if (!userId) {
                logger.error("No userId in session metadata", session.id);
                return res.json({ received: true });
            }

            await db.runTransaction(async (t) => {
                const requestId = `stripe_evt_${event.id}`;

                if (mode === 'subscription') {
                    // Subscription Activation - credit Zaps bonus based on plan
                    const priceId = session.metadata?.priceId;
                    const tier = (
                        priceId === 'price_1TeOk1IA2zQnWbn5YbTvD7Oj' || 
                        priceId === 'price_1TeOk1IA2zQnWbn5YbTvD7Oj_annual'
                    ) ? 'architect' : 'pro';
                    
                    // Alchemist Pro (Monthly, Annual, or Quarterly) all get 500 zaps per month cycle.
                    // For Quarterly, they still get 500 zaps per month cycle (handled in renewal).
                    // On activation, we give the first month's allowance.
                    const zapsToCredit = tier === 'architect' ? 2500 : 500;

                    const creditResult = await Wallet.credit(
                        userId,
                        zapsToCredit,
                        requestId,
                        { type: 'subscription_activation', stripeSessionId: session.id, priceId },
                        'zaps',
                        t
                    );

                    if (!creditResult.idempotent) {
                        logger.info(`[Subscription] Activated ${tier} for user ${userId}. Credited ${zapsToCredit} Zaps.`);
                        t.update(db.collection('users').doc(userId), {
                            subscriptionStatus: 'active',
                            subscriptionId: session.subscription,
                            stripeCustomerId: customerId,
                            tier: tier
                        });
                    } else {
                        logger.info(`[Subscription] Already processed event ${event.id}`);
                    }

                } else if (mode === 'payment') {
                    // One-time Payment
                    const amount = session.amount_total;
                    const priceId = session.metadata?.priceId;
                    let zapsToAdd = 0;

                    // Support explicit priceId matching or fallback to amount matching
                    if (priceId === 'price_1TePpZIA2zQnWbn5YiEaXajs' || amount === 199) { zapsToAdd = 15; } // Taste Test
                    else if (amount === 499 || amount === 500) { zapsToAdd = 50; }
                    else if (amount === 999) { zapsToAdd = 150; }
                    else if (amount === 1999 || amount === 2000) { zapsToAdd = 350; }
                    else if (amount === 4999) { zapsToAdd = 1000; }
                    else if (priceId === 'price_1TePpZIA2zQnWbn51HGTpUj6' || amount === 9999) { zapsToAdd = 2500; } // Mystic Bulk

                    if (zapsToAdd > 0) {
                        await Wallet.credit(
                            userId,
                            zapsToAdd,
                            requestId,
                            { type: 'purchase', currency: 'zaps', amount: amount, priceId },
                            'zaps',
                            t
                        );
                        t.update(db.collection('users').doc(userId), { 
                            stripeCustomerId: customerId,
                            purchasedZaps: FieldValue.increment(zapsToAdd)
                        });
                    }
                }
            });

        } else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            const requestId = `stripe_evt_${event.id}`;

            if (invoice.billing_reason === 'subscription_cycle') {
                await db.runTransaction(async (t) => {
                    // Find user by stripeCustomerId
                    const userSnapshot = await t.get(db.collection('users').where('stripeCustomerId', '==', customerId).limit(1));

                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        const userData = userDoc.data() as any;
                        const userId = userDoc.id;
                        const tier = userData.tier || 'free';
                        const zapsToCredit = tier === 'architect' ? 2500 : 500;

                        const currentBalance = userData.zaps || 0;
                        const purchasedZaps = userData.purchasedZaps || 0;
                        const currentUnusedSubscriptionZaps = Math.max(0, currentBalance - purchasedZaps);
                        const expiredZaps = currentUnusedSubscriptionZaps;
                        const amountToCredit = Math.max(0, zapsToCredit - expiredZaps);

                        const creditResult = await Wallet.credit(
                            userId,
                            amountToCredit,
                            requestId,
                            { 
                                type: 'subscription_cycle', 
                                invoiceId: invoice.id,
                                expiredZaps,
                                baseCreditAmount: zapsToCredit
                            },
                            'zaps',
                            t
                        );

                        if (!creditResult.idempotent) {
                            t.update(userDoc.ref, { subscriptionStatus: 'active' });
                            logger.info(`[Invoice] Renewed subscription (${tier}) for ${userId}. Expired ${expiredZaps} unused zaps.`);
                        }
                    }
                });
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
            if (!userSnapshot.empty) {
                const userId = userSnapshot.docs[0].id;
                await db.collection('users').doc(userId).update({ 
                    subscriptionStatus: 'inactive',
                    tier: 'free'
                });
            }
        }
        res.json({ received: true });
    } catch (err: any) {
        logger.error("Error processing webhook", err);
        res.status(500).send("Internal Server Error");
    }
};
