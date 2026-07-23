import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { db } from "./firebaseInit.js";
import { handleError, logger } from "./lib/utils.js";
import { RequestWithAuth } from "./types/functions.js";

import {
    checkIpThrottle,
    checkUserRequestGuards,
    recordViolation
} from "./lib/abuse.js";
import { validateApiKey } from "./lib/apiKey.js";

// -- Imports from Handlers (Now Dynamically Loaded) --





// ============================================================================

// Main API Dispatcher
// ============================================================================

export const api = onCall({ memory: "512MiB", timeoutSeconds: 300 }, async (request: CallableRequest<any>) => {
    logger.info(`[API] Incoming request: action=${request.data?.action}, uid=${request.auth?.uid}`);

    // Basic App Check logging (Warn Mode)
    if (!process.env.FUNCTIONS_EMULATOR && request.app === undefined) {
        logger.warn("App Check verification failed. Proceeding (Warn Mode).", { uid: request.auth?.uid });
    }

    if (!request.data || typeof request.data.action !== 'string') {
        logger.error("[API] Invalid or missing request data", new Error("Invalid payload"), { data: request.data });
        throw new HttpsError('invalid-argument', 'Request must include a valid string action.');
    }

    const { action } = request.data;
    let uid = request.auth?.uid;
    const clientIp = request.rawRequest?.ip || "unknown";

    // --- API KEY AUTHENTICATION ---
    if (!uid) {
        const apiKey = request.rawRequest?.headers['x-api-key'] as string | undefined;
        if (apiKey) {
            const apiAuth = await validateApiKey(apiKey);
            if (apiAuth) {
                uid = apiAuth.uid;
                // Properly populate the auth object for downstream handlers
                (request as any).auth = {
                    uid: uid,
                    token: {
                        uid: uid,
                        sub: uid,
                        role: apiAuth.role || 'api_user',
                        scope: apiAuth.scope || ['default'],
                        aud: process.env.GCLOUD_PROJECT || 'dreambees-alchemist',
                        iss: 'https://securetoken.google.com/' + (process.env.GCLOUD_PROJECT || 'dreambees-alchemist')
                    }
                };
                logger.info(`[API] Authenticated via API Key for user: ${uid} (Scopes: ${apiAuth.scope})`);


            } else {
                logger.warn(`[API] Invalid API Key attempt from ${clientIp}`);
                throw new HttpsError('unauthenticated', 'Invalid API Key.');
            }
        }
    }

    logger.info(`[API_DEBUG] action=${action}, uid=${uid}, IP=${clientIp}`);

    try {
        // --- 0. Pre-Flight Actions (Bypass Abuse Checks) ---
        if (action === 'initializeUser') {
            if (!uid) { throw new HttpsError('unauthenticated', 'User must be logged in.'); }

            try {
                logger.info(`[INIT_DEBUG] Creating users/${uid} if missing`);
                const userRef = db.collection('users').doc(uid);
                const discordId = request.auth?.token.firebase?.identities?.['discord.com']?.[0];

                await userRef.create({
                    uid,
                    email: request.auth?.token.email || "",
                    displayName: request.auth?.token.name || "",
                    photoURL: request.auth?.token.picture || "",
                    discordId: discordId || null,
                    birthday: request.data.birthday || null,
                    createdAt: new Date(),
                    zaps: 10,
                    tier: 'free',
                    subscriptionStatus: 'inactive',
                    role: 'user'
                }).catch((err: any) => {
                    if (err?.code === 6 || err?.code === 'already-exists') {
                        logger.info(`[INIT_DEBUG] User doc already exists for ${uid}`);
                        return;
                    }
                    throw err;
                });
                return { success: true };
            } catch (initError: any) {
                console.error(`[INIT_DEBUG] FAILED at Firestore operation:`, {
                    errorMessage: initError.message,
                    errorCode: initError.code,
                    errorName: initError.name,
                    projectId: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'unknown'
                });
                throw initError;
            }
        }

        // --- 1. User & IP Protection (Parallel Execution) ---
        const preFlightChecks: Promise<unknown>[] = [];

        if (uid) {
            const discordId = request.auth?.token.firebase?.identities?.['discord.com']?.[0];
            const createUserData = {
                uid,
                email: request.auth?.token.email || "",
                displayName: request.auth?.token.name || "",
                photoURL: request.auth?.token.picture || "",
                discordId: discordId || null,
                createdAt: new Date(),
                zaps: 10,
                tier: 'free',
                subscriptionStatus: 'inactive',
                role: 'user'
            };
            preFlightChecks.push(
                checkUserRequestGuards(uid, action, 1, 10, 0.5, createUserData, clientIp)
                    .then((userData) => {
                        (request as any).cachedUserData = userData;
                    })
            );
        } else {
            preFlightChecks.push(checkIpThrottle(clientIp));
        }

        await Promise.all(preFlightChecks);

        // --- 3. Scope Enforcement (API Keys) ---
        if (request.auth?.token?.scope) {
            const scopes = request.auth.token.scope as string[];
            const requiredScopes: Record<string, string> = {
                'createGenerationRequest': 'default'
            };



            const required = requiredScopes[action];
            if (required && !scopes.includes(required) && !scopes.includes('default')) {
                logger.warn(`[Scope] Blocked ${action} for user ${uid}. Missing verified scope: ${required}`);
                throw new HttpsError('permission-denied', `Missing required scope: ${required}`);
            }
        }

        const authRequest = request as unknown as RequestWithAuth<any>;

        switch (action) {
            // Generation
            case 'createGenerationRequest': {
                const Generation = await import("./handlers/generation.js");
                return Generation.handleCreateGenerationRequest(authRequest);
            }

            // Billing
            case 'createStripeCheckout': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleCreateStripeCheckout(authRequest);
            }
            case 'createStripePortalSession': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleCreateStripePortalSession(authRequest);
            }
            case 'claimDailyZaps': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleClaimDailyZaps(authRequest);
            }
            case 'updateAutoReplenishSettings': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleUpdateAutoReplenishSettings(authRequest);
            }
            case 'createDynamicCreditPack': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleCreateDynamicCreditPack(authRequest);
            }
            case 'pauseSubscription': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handlePauseSubscription(authRequest);
            }
            case 'resumeSubscription': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleResumeSubscription(authRequest);
            }
            case 'downgradeSubscription': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleDowngradeSubscription(authRequest);
            }
            case 'reactivateSubscription': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleReactivateSubscription(authRequest);
            }
            case 'claimRetentionOffer': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleClaimRetentionOffer(authRequest);
            }
            case 'logChurnEvent': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleLogChurnEvent(authRequest);
            }
            case 'getChurnHistory': {
                const Billing = await import("./handlers/billing.js");
                return Billing.handleGetChurnHistory(authRequest);
            }

            // Data & Ratings
            case 'getGenerationHistory': {
                const Data = await import("./handlers/data.js");
                return Data.handleGetGenerationHistory(authRequest);
            }
            case 'getGenerationStatus': {
                const Data = await import("./handlers/data.js");
                return Data.handleGetGenerationStatus(authRequest);
            }
            case 'getImageDetail': {
                const Data = await import("./handlers/data.js");
                return Data.handleGetImageDetail(authRequest);
            }
            case 'getUserImages': {
                const Data = await import("./handlers/data.js");
                return Data.handleGetUserImages(authRequest);
            }
            case 'deleteImage': {
                const Data = await import("./handlers/data.js");
                return Data.handleDeleteImage(authRequest);
            }




            // API Key Management
            case 'createApiKey': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleCreateApiKey(authRequest);
            }
            case 'listApiKeys': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleListApiKeys(authRequest);
            }
            case 'revokeApiKey': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleRevokeApiKey(authRequest);
            }
            case 'getApiUsageStats': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleGetApiUsageStats(authRequest);
            }

            // CLI Handshake
            case 'initCliHandshake': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleInitCliHandshake(authRequest);
            }
            case 'pollCliHandshake': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handlePollCliHandshake(authRequest);
            }
            case 'completeCliHandshake': {
                const Developer = await import("./handlers/developer.js");
                return Developer.handleCompleteCliHandshake(authRequest);
            }

            default:
                throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
        }
    } catch (error: any) {
        logger.error("[CRITICAL_BACKEND_ERROR]", error, {
            action,
            uid,
            details: error.details,
            metadata: error.metadata && typeof error.metadata.getMap === 'function' ? error.metadata.getMap() : null
        });
        if (error.code === 'resource-exhausted' && uid) {
            recordViolation(uid, 'rate_limit_exceeded').catch(e => logger.error("Failed to record violation", e));
        }
        throw handleError(error, { action, uid });
    }
});

// ============================================================================
// Webhooks & HTTP Triggers (Kept here for now)
// ============================================================================

// Webhooks & HTTP Triggers are now in `web.js`
