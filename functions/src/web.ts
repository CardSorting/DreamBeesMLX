import { onRequest } from "firebase-functions/v2/https";
import { handleStripeWebhook } from "./handlers/web/stripeHandler.js";
import { handleSitemap } from "./handlers/web/sitemapHandler.js";
import { handleRobots } from "./handlers/web/robotsHandler.js";
import { handleLlms } from "./handlers/web/llmsHandler.js";
import { handleApp } from "./handlers/web/appHandler.js";
import { handleDiagnostic } from "./handlers/diagnostic.js";

/**
 * Unified 'web' entry point.
 * Handles App Metadata (SEO), Sitemap generation, Stripe Webhooks, and OpenAI SDK compat.
 */
export const web = onRequest({
    memory: "512MiB",
    cors: true,
    timeoutSeconds: 60,
    secrets: ["ADMIN_DIAGNOSTIC_KEY"]
}, async (req, res) => {
    const path = req.path;

    // 1. Stripe Webhooks
    if (path === '/stripe-webhook') {
        return handleStripeWebhook(req, res);
    }

    // 2. Robots.txt
    if (path === '/robots.txt') {
        return handleRobots(req, res);
    }

    // 2b. LLMs.txt (AI crawler context)
    if (path === '/llms.txt') {
        return handleLlms(req, res);
    }

    // 3. XML Sitemap handling
    if (path === '/sitemap.xml' || path === '/sitemap') {
        return handleSitemap(req, res);
    }

    // 4. Admin Diagnostic (requires admin bearer token or ADMIN_DIAGNOSTIC_KEY)
    if (path === '/admin/diagnostic' || path === '/diagnostic') {
        return handleDiagnostic(req, res);
    }

    // 5. Default: Handle as App Metadata / SEO Injection
    return handleApp(req, res);
});
