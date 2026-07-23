import Stripe from "stripe";
import { logger } from "./utils.js";

const stripeClient = (() => {
    let instance: Stripe;
    return () => {
        if (!instance) {
            if (!process.env.STRIPE_SECRET_KEY) {
                // During deployment analysis, this might be missing.
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

/**
 * Creates a Stripe Checkout Session for a subscription.
 */
export async function createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    mode: 'subscription' | 'payment' = 'subscription'
): Promise<string | null> {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
        mode: mode,
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        metadata: {
            userId: userId,
            priceId: priceId
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return session.url;
}

/**
 * Constructs a Stripe Webhook Event from the request.
 */
export function constructWebhookEvent(rawBody: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    const stripe = stripeClient();
    try {
        return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
        logger.error(`Webhook signature verification failed: ${err.message}`, err);
        throw err;
    }
}

/**
 * Creates a Stripe Customer Portal Session.
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    return session.url;
}
