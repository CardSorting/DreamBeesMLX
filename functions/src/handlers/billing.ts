import { db, FieldValue } from "../firebaseInit.js";
import { handleError, logger } from "../lib/utils.js";
import { createCheckoutSession, createPortalSession } from "../lib/stripe.js";
import { RequestWithAuth } from "../types/functions.js";
import { HttpsError } from "firebase-functions/v2/https";
import Stripe from "stripe";

// ----------------------------------------------------------------------------
// CONFIGURATION & CATALOG
// ----------------------------------------------------------------------------
// Price IDs should ideally come from environment variables or a remote config.
// These match the values in stripe_setup_output.json.
const ZAP_PACK_CATALOG: Record<string, { zaps: number; unitPriceCents: number; priceId: string; label: string }> = {
    taste: { zaps: 15, unitPriceCents: 199, priceId: 'price_1TePpZIA2zQnWbn5YiEaXajs', label: 'Taste Test' },
    starter: { zaps: 50, unitPriceCents: 499, priceId: 'price_1TeOk2IA2zQnWbn5v0I8HQYB', label: 'Starter Pack' },
    booster: { zaps: 150, unitPriceCents: 999, priceId: 'price_1TeOk3IA2zQnWbn5u8JeE7Z0', label: 'Pro Booster' },
    vault: { zaps: 350, unitPriceCents: 1999, priceId: 'price_1TeOk3IA2zQnWbn569bphdyX', label: 'Studio Vault' },
    infinite: { zaps: 1000, unitPriceCents: 4999, priceId: 'price_1TeOk4IA2zQnWbn5FpxaymDB', label: 'Infinite Source' },
    mystic: { zaps: 2500, unitPriceCents: 9999, priceId: 'price_1TePpZIA2zQnWbn51HGTpUj6', label: 'Mystic Bulk' },
};

const DYNAMIC_PACK_MIN_ZAPS = 50;
const DYNAMIC_PACK_MAX_ZAPS = 10000;
const DYNAMIC_PACK_CENTS_PER_ZAP = 5;

// Helper for logging lifecycle events (churn, retention, etc.)
async function logBillingEvent(uid: string, event: { type: string;[key: string]: any }) {
    try {
        await db.collection('users').doc(uid).collection('churnEvents').add({
            ...event,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        logger.error(`[BillingEvent] Failed to log ${event.type} for ${uid}`, err);
    }
}

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2023-10-16' as any
});

// ----------------------------------------------------------------------------
// CORE BILLING HANDLERS
// ----------------------------------------------------------------------------

/**
 * Creates a Stripe Checkout session for a predefined credit pack or subscription.
 */
export const handleCreateStripeCheckout = async (request: RequestWithAuth<any>) => {
    const { priceId, successUrl, cancelUrl, mode } = request.data;
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const userRef = db.collection('users').doc(uid);
    let user = (request as any).cachedUserData;
    if (!user) {
        const userDoc = await userRef.get();
        user = (userDoc.data() as any) || {};
    }

    // Rate limit checkout creation to prevent abuse/errors
    const now = new Date();
    const lastCheckout = user.lastCheckoutSessionTime?.toDate ? user.lastCheckoutSessionTime.toDate() : new Date(0);
    if (now.getTime() - lastCheckout.getTime() < 30000) {
        throw new HttpsError("resource-exhausted", "Please wait a moment before starting another checkout.");
    }

    await userRef.set({ lastCheckoutSessionTime: now }, { merge: true });

    try {
        const sessionUrl = await createCheckoutSession(uid, email, priceId, successUrl, cancelUrl, mode);
        if (!sessionUrl) {
            throw new Error("Stripe failed to return a checkout URL.");
        }
        return { url: sessionUrl };
    } catch (error) {
        throw handleError(error, { uid, context: "Stripe Checkout" });
    }
};

/**
 * Creates a Stripe Customer Portal session for managing subscriptions/billing.
 */
export const handleCreateStripePortalSession = async (request: RequestWithAuth<any>) => {
    const { returnUrl } = request.data;
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    let userData = (request as any).cachedUserData;
    if (!userData) {
        const userDoc = await db.collection('users').doc(uid).get();
        userData = userDoc.data() as any;
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }
    }

    if (!userData?.stripeCustomerId) {
        throw new HttpsError("failed-precondition", "No active subscription found for this account.");
    }

    try {
        const url = await createPortalSession(userData.stripeCustomerId, returnUrl || 'https://dreambees.app/account');
        return { url };
    } catch (error) {
        throw handleError(error, { uid, context: "Stripe Portal" });
    }
};

export const handleClaimDailyZaps = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new Error("Unauthenticated"); }

    const startTime = Date.now();
    logger.info(`[Claim] Starting hyper-streamlined execution for user ${uid}`);

    const now = new Date();
    const dateId = `${now.getUTCFullYear()}${((now.getUTCMonth() + 1).toString().padStart(2, '0'))}${now.getUTCDate().toString().padStart(2, '0')}`;

    const userRef = db.collection('users').doc(uid);
    const claimRef = db.collection('daily_zap_claims').doc(`${uid}_${dateId}`);
    const cachedUserData = (request as any).cachedUserData;

    try {
        if (cachedUserData?.lastDailyClaimId === dateId) {
            throw new Error("ALREADY_CLAIMED");
        }

        const batch = db.batch();
        batch.create(claimRef, {
            uid,
            dateId,
            createdAt: FieldValue.serverTimestamp()
        });
        batch.update(userRef, {
            zaps: FieldValue.increment(10),
            lastFreeClaimAt: now,
            lastDailyClaimId: dateId
        });
        await batch.commit();

        const duration = Date.now() - startTime;
        logger.info(`[Claim] Hyper-streamlined finish in ${duration}ms for user ${uid}`);

        return {
            success: true,
            zapsAdded: 10,
            message: "Successfully claimed 10 Zaps!"
        };

    } catch (error: any) {
        if (error.message === "ALREADY_CLAIMED" || error.code === 6 || error.code === 'already-exists') {
            throw new Error("You have already claimed your daily Zaps today. Come back tomorrow!");
        }
        logger.error(`[Claim] Failed for user ${uid}:`, error);
        throw error;
    }
};

export const handleUpdateAutoReplenishSettings = async (request: RequestWithAuth<any>) => {
    const { enabled, threshold, pack } = request.data;
    const uid = request.auth.uid;
    if (!uid) { throw new Error("Unauthenticated"); }

    const userRef = db.collection('users').doc(uid);
    try {
        await userRef.set({
            autoReplenishEnabled: Boolean(enabled),
            autoReplenishThreshold: Number(threshold) || 20,
            autoReplenishPack: pack || 'booster'
        }, { merge: true });

        return { success: true };
    } catch (error) {
        throw handleError(error, { uid, context: "Update Auto-Replenish Settings" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Dynamic custom-amount credit pack
// Accepts { zaps: number, successUrl, cancelUrl }
// Creates a one-time Stripe Checkout session for that Zap amount
// ----------------------------------------------------------------------------
export const handleCreateDynamicCreditPack = async (request: RequestWithAuth<any>) => {
    const { zaps, successUrl, cancelUrl } = request.data;
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const numZaps = Math.floor(Number(zaps));
    if (!Number.isFinite(numZaps) || numZaps < DYNAMIC_PACK_MIN_ZAPS || numZaps > DYNAMIC_PACK_MAX_ZAPS) {
        throw new HttpsError('invalid-argument', `Zap count must be between ${DYNAMIC_PACK_MIN_ZAPS} and ${DYNAMIC_PACK_MAX_ZAPS}.`);
    }

    const unitCents = DYNAMIC_PACK_CENTS_PER_ZAP;
    const totalCents = numZaps * unitCents;

    const userRef = db.collection('users').doc(uid);
    let user = (request as any).cachedUserData;
    if (!user) {
        const userDoc = await userRef.get();
        user = (userDoc.data() as any) || {};
    }

    const now = new Date();
    const lastCheckout = user.lastCheckoutSessionTime?.toDate ? user.lastCheckoutSessionTime.toDate() : new Date(0);
    if (now.getTime() - lastCheckout.getTime() < 30000) {
        throw new HttpsError("resource-exhausted", "Please wait a moment before starting another checkout.");
    }

    await userRef.set({ lastCheckoutSessionTime: now }, { merge: true });

    try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        unit_amount: totalCents,
                        product_data: {
                            name: `${numZaps.toLocaleString()} Zaps (Custom Pack)`,
                            description: 'One-time AI generation credit pack. Zaps never expire.',
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId: uid,
                zaps: String(numZaps),
                packType: 'dynamic-custom',
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        return { url: session.url, zaps: numZaps, totalCents };
    } catch (error) {
        throw handleError(error, { uid, context: "Dynamic Credit Pack" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Pause subscription (snooze 1/2/3 months)
// ----------------------------------------------------------------------------
export const handlePauseSubscription = async (request: RequestWithAuth<any>) => {
    const { months } = request.data;
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const numMonths = Math.max(1, Math.min(3, Math.floor(Number(months) || 1)));
    const pausedUntil = new Date();
    pausedUntil.setUTCMonth(pausedUntil.getUTCMonth() + numMonths);

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as any;
    if (!userData?.stripeSubscriptionId) {
        throw new HttpsError("failed-precondition", "No active subscription found to pause.");
    }

    try {
        const stripe = getStripe();
        try {
            await stripe.subscriptions.update(userData.stripeSubscriptionId, {
                pause_collection: {
                    behavior: 'void',
                    resumes_at: Math.floor(pausedUntil.getTime() / 1000),
                } as any,
            });
        } catch (stripeErr: any) {
            logger.warn(`[Pause] Stripe pause_collection unsupported for ${userData.stripeSubscriptionId}, using local-only pause`, stripeErr?.message);
        }

        await userRef.set({
            pausedUntil,
            pauseRequestedAt: new Date(),
            pauseMonths: numMonths,
            subscriptionStatus: 'paused',
        }, { merge: true });

        await logBillingEvent(uid, {
            type: 'pause',
            months: numMonths,
            pausedUntil: pausedUntil.toISOString()
        });

        return { success: true, pausedUntil: pausedUntil.toISOString(), months: numMonths };
    } catch (error) {
        throw handleError(error, { uid, context: "Pause Subscription" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Resume a paused subscription
// ----------------------------------------------------------------------------
export const handleResumeSubscription = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as any;
    if (!userData?.stripeSubscriptionId) {
        throw new HttpsError("failed-precondition", "No subscription found to resume.");
    }

    try {
        const stripe = getStripe();
        try {
            await stripe.subscriptions.update(userData.stripeSubscriptionId, {
                pause_collection: null as any,
            });
        } catch (stripeErr: any) {
            logger.warn(`[Resume] Stripe resume unsupported for ${userData.stripeSubscriptionId}, using local-only`, stripeErr?.message);
        }

        await userRef.set({
            pausedUntil: FieldValue.delete(),
            pauseRequestedAt: FieldValue.delete(),
            pauseMonths: FieldValue.delete(),
            subscriptionStatus: 'active',
        }, { merge: true });

        await logBillingEvent(uid, { type: 'resume' });

        return { success: true };
    } catch (error) {
        throw handleError(error, { uid, context: "Resume Subscription" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Downgrade subscription (Architect -> Alchemist or Alchemist -> Dreamer)
// ----------------------------------------------------------------------------
const DOWNGRADE_TARGETS: Record<string, { target: string; priceIdMonthly: string; priceIdAnnual: string; priceIdQuarterly: string }> = {
    architect: {
        target: 'pro',
        priceIdMonthly: 'price_1TeOk1IA2zQnWbn5V7GsiAB6',
        priceIdAnnual: 'price_1TeOk1IA2zQnWbn5V7GsiAB6_annual',
        priceIdQuarterly: 'price_1TePpaIA2zQnWbn54zkMkNjH',
    },
    pro: {
        target: 'free',
        priceIdMonthly: '',
        priceIdAnnual: '',
        priceIdQuarterly: '',
    },
};

export const handleDowngradeSubscription = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as any;
    if (!userData?.stripeSubscriptionId) {
        throw new HttpsError("failed-precondition", "No active subscription found to downgrade.");
    }

    const currentTier = userData.tier;
    if (!currentTier || currentTier === 'free') {
        throw new HttpsError("failed-precondition", "Already on free tier.");
    }

    const plan = DOWNGRADE_TARGETS[currentTier];
    if (!plan) {
        throw new HttpsError("invalid-argument", `No supported downgrade path from ${currentTier}.`);
    }

    try {
        const stripe = getStripe();

        if (plan.target === 'free') {
            await stripe.subscriptions.update(userData.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await userRef.set({
                scheduledDowngrade: 'free',
                downgradeScheduledAt: new Date(),
            }, { merge: true });
        } else {
            const sub = await stripe.subscriptions.retrieve(userData.stripeSubscriptionId);
            const itemId = sub.items.data[0]?.id;
            if (!itemId) throw new Error("Subscription has no items to update.");

            const isAnnual = sub.items.data[0]?.price?.recurring?.interval === 'year';
            const isQuarterly = sub.items.data[0]?.price?.recurring?.interval === 'month' && sub.items.data[0]?.price?.recurring?.interval_count === 3;

            let newPriceId = plan.priceIdMonthly;
            if (isAnnual) newPriceId = plan.priceIdAnnual;
            else if (isQuarterly) newPriceId = plan.priceIdQuarterly;

            if (!newPriceId) throw new Error("No price ID for target tier.");

            await stripe.subscriptions.update(userData.stripeSubscriptionId, {
                items: [{ id: itemId, price: newPriceId }],
                proration_behavior: 'create_prorations',
            });
            await userRef.set({
                scheduledDowngrade: plan.target,
                downgradeScheduledAt: new Date(),
            }, { merge: true });
        }

        await logBillingEvent(uid, {
            type: 'downgrade',
            from: currentTier,
            to: plan.target
        });

        return { success: true, newTier: plan.target };
    } catch (error) {
        throw handleError(error, { uid, context: "Downgrade Subscription" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Reactivate (for users who previously cancelled but want to come back)
// ----------------------------------------------------------------------------
export const handleReactivateSubscription = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as any;
    if (!userData?.stripeCustomerId) {
        throw new HttpsError("failed-precondition", "No Stripe customer found. Please subscribe via the pricing page.");
    }

    try {
        const stripe = getStripe();
        const subs = await stripe.subscriptions.list({ customer: userData.stripeCustomerId, status: 'active' });
        for (const sub of subs.data) {
            if (sub.cancel_at_period_end) {
                await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
            }
        }

        await userRef.set({
            pausedUntil: FieldValue.delete(),
            scheduledDowngrade: FieldValue.delete(),
            downgradeScheduledAt: FieldValue.delete(),
            subscriptionStatus: 'active',
            reactivatedAt: new Date(),
        }, { merge: true });

        await logBillingEvent(uid, { type: 'reactivate' });

        return { success: true };
    } catch (error) {
        throw handleError(error, { uid, context: "Reactivate Subscription" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Claim a retention offer
// ----------------------------------------------------------------------------
const RETENTION_COUPONS: Record<string, { couponId: string; bonusZaps: number; label: string }> = {
    'discount-30': { couponId: 'retention_30_off_3mo', bonusZaps: 0, label: '30% off for 3 months' },
    'switch-monthly': { couponId: '', bonusZaps: 0, label: 'Switched to monthly' },
    'pause': { couponId: '', bonusZaps: 0, label: 'Paused subscription' },
    'bonus-zaps': { couponId: '', bonusZaps: 200, label: '+200 Bonus Zaps' },
    'support': { couponId: '', bonusZaps: 0, label: 'Escalated to support' },
    'discount-50': { couponId: 'retention_50_off_1mo', bonusZaps: 0, label: '50% off next month' },
};

export const handleClaimRetentionOffer = async (request: RequestWithAuth<any>) => {
    const { offer, reason } = request.data;
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const cfg = RETENTION_COUPONS[offer];
    if (!cfg) {
        throw new HttpsError('invalid-argument', `Unknown retention offer: ${offer}`);
    }

    const userRef = db.collection('users').doc(uid);
    try {
        const updateData: Record<string, any> = {};
        if (cfg.bonusZaps > 0) {
            updateData.zaps = FieldValue.increment(cfg.bonusZaps);
        }
        if (Object.keys(updateData).length > 0) {
            await userRef.set(updateData, { merge: true });
        }

        await logBillingEvent(uid, {
            type: 'retention_offer_claimed',
            offer,
            reason: reason || null,
            couponId: cfg.couponId || null,
            bonusZaps: cfg.bonusZaps,
        });

        return {
            success: true,
            offer,
            label: cfg.label,
            couponId: cfg.couponId || null,
            bonusZaps: cfg.bonusZaps,
        };
    } catch (error) {
        throw handleError(error, { uid, context: "Claim Retention Offer" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Log a churn event
// ----------------------------------------------------------------------------
export const handleLogChurnEvent = async (request: RequestWithAuth<any>) => {
    const { type, reason, step, metadata } = request.data;
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    const allowedTypes = new Set([
        'cancel_started',
        'cancel_reason_selected',
        'cancel_completed',
        'cancel_abandoned',
        'pause_started',
        'pause_completed',
        'downgrade_started',
        'downgrade_completed',
    ]);

    if (!allowedTypes.has(type)) {
        throw new HttpsError('invalid-argument', `Unknown churn event type: ${type}`);
    }

    try {
        await logBillingEvent(uid, {
            type,
            reason: reason || null,
            step: step || null,
            metadata: metadata || null,
        });
        return { success: true };
    } catch (error) {
        throw handleError(error, { uid, context: "Log Churn Event" });
    }
};

// ----------------------------------------------------------------------------
// NEW: Get the user's churn event history
// ----------------------------------------------------------------------------
export const handleGetChurnHistory = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError("unauthenticated", "User must be logged in."); }

    try {
        const snap = await db.collection('users').doc(uid)
            .collection('churnEvents')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const events = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        return { success: true, events };
    } catch (error) {
        throw handleError(error, { uid, context: "Get Churn History" });
    }
};
