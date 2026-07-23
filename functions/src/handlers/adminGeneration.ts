import { db, FieldValue } from "../firebaseInit.js";
import { authorizeAdminRequest } from "../lib/adminGate.js";
import { logger } from "../lib/utils.js";
import { PromptPreprocessor } from "../core/PromptPreprocessor.js";
import { SubstrateHealth } from "../lib/substrateHealth.js";
import {
    buildAdminJobPollPath,
    normalizeAdminGenerationPath,
    resolveAdminGenerationOperation
} from "../generation/paths.js";
import {
    ADMIN_SYSTEM_USER_ID,
    buildAdminRequestId,
    isActiveJobStatus
} from "../generation/contract.js";
import { buildQueuedGenerationDocument } from "../generation/queue-document.js";
import { fetchGenerationQueueDoc, generationQueueDoc } from "../generation/queue-repository.js";
import { formatAdminGenerationJobStatus } from "../generation/job-view.js";
import { enqueueResolvedGenerationTask } from "../generation/enqueue.js";
import {
    sendAccepted,
    sendForbidden,
    sendInvalidJobId,
    sendJson,
    sendMethodNotAllowed,
    sendNotFound,
    sendRateLimited
} from "../generation/http.js";
import {
    MODEL_IDS,
    MODEL_CATEGORIES,
    MODEL_GENERATION_PARAMS,
    getModelCost
} from "../lib/modelConventions.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const consumeRateLimit = (principal: string, ip: string): { allowed: boolean; retryAfterSeconds?: number } => {
    const now = Date.now();
    const key = `${principal}:${ip}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true };
};

const requireAdmin = async (req: any, res: any): Promise<{ principal: string } | null> => {
    const auth = await authorizeAdminRequest(req, "ADMIN_GENERATION_KEY");
    if (!auth.authorized) {
        logger.warn("[AdminGeneration] Unauthorized access attempt", {
            principal: auth.principal,
            reason: auth.reason,
            ip: req.ip
        });
        sendForbidden(res);
        return null;
    }

    const rateLimit = consumeRateLimit(auth.principal, req.ip || "unknown");
    if (!rateLimit.allowed) {
        sendRateLimited(res, rateLimit.retryAfterSeconds || 60);
        return null;
    }

    return { principal: auth.principal };
};

const listModels = () => {
    const models = Object.values(MODEL_IDS).map((id) => {
        const params = (MODEL_GENERATION_PARAMS as Record<string, Record<string, unknown>>)[id] || {};
        let tier: string = "STANDARD";
        if (MODEL_CATEGORIES.PREMIUM.includes(id as never)) tier = "PREMIUM";
        else if (MODEL_CATEGORIES.FAST.includes(id as never)) tier = "FAST";
        else if (MODEL_CATEGORIES.ULTRA.includes(id as never)) tier = "ULTRA";

        return {
            id,
            tier,
            retailCostZaps: getModelCost(id),
            adminCostZaps: 0,
            defaultSteps: params.defaultSteps ?? (tier === "FAST" ? 8 : 30),
            defaultCfg: params.defaultCfg ?? (tier === "FAST" ? 7 : 7),
            defaultScheduler: params.defaultScheduler ?? "DPM++ 2M Karras",
            hiresFix: params.hiresFix ?? false
        };
    });

    return { success: true, models, count: models.length };
};

const handleGenerate = async (req: any, res: any, principal: string) => {
    const body = req.body || {};
    const requestId = buildAdminRequestId(body.idempotencyKey);

    const firebaseContext = {
        ...body,
        auth: {
            uid: ADMIN_SYSTEM_USER_ID,
            token: { role: "admin" }
        }
    };

    let sanitizedRequest;
    try {
        const { sanitizedRequest: processed } = PromptPreprocessor.preprocess(firebaseContext, true);
        sanitizedRequest = processed;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid request";
        return sendJson(res, 400, { success: false, error: "invalid_request", message });
    }

    const isHealthy = await SubstrateHealth.isHealthy(sanitizedRequest.modelId);
    if (!isHealthy) {
        return sendJson(res, 503, {
            success: false,
            error: "provider_degraded",
            message: `Provider for ${sanitizedRequest.modelId} is currently degraded.`
        });
    }

    const safeParams = sanitizedRequest.getSafeParameters();
    let shouldEnqueue = true;

    await db.runTransaction(async (t) => {
        const queueRef = generationQueueDoc(requestId);
        const existing = await t.get(queueRef);
        if (existing.exists) {
            const status = (existing.data() as { status?: string })?.status;
            if (isActiveJobStatus(status)) {
                shouldEnqueue = false;
                return;
            }
        }

        t.set(queueRef, buildQueuedGenerationDocument({
            userId: ADMIN_SYSTEM_USER_ID,
            prompt: sanitizedRequest.prompt,
            negativePrompt: sanitizedRequest.negativePrompt,
            modelId: sanitizedRequest.modelId,
            aspectRatio: safeParams.aspectRatio,
            steps: safeParams.steps,
            cfg: safeParams.cfg,
            seed: sanitizedRequest.seed,
            scheduler: sanitizedRequest.scheduler,
            cost: 0,
            debited: false,
            isAdminBypass: true,
            isApiKeyRequest: false,
            adminPrincipal: principal
        }));
    });

    if (shouldEnqueue) {
        try {
            await enqueueResolvedGenerationTask(requestId, ADMIN_SYSTEM_USER_ID, {
                prompt: sanitizedRequest.prompt,
                negative_prompt: sanitizedRequest.negativePrompt,
                modelId: sanitizedRequest.modelId,
                steps: safeParams.steps,
                cfg: safeParams.cfg,
                aspectRatio: safeParams.aspectRatio,
                scheduler: sanitizedRequest.scheduler
            });
        } catch (enqueueError) {
            logger.error("[AdminGeneration] Enqueue failed", enqueueError);
            await generationQueueDoc(requestId).update({
                status: "failed",
                error: "Failed to enqueue generation task",
                failedAt: FieldValue.serverTimestamp()
            }).catch(() => { });
            return sendJson(res, 500, { success: false, error: "enqueue_failed", requestId });
        }
    }

    logger.info("[AdminGeneration] Job submitted", {
        requestId,
        modelId: sanitizedRequest.modelId,
        principal
    });

    return sendAccepted(res, {
        success: true,
        requestId,
        modelId: sanitizedRequest.modelId,
        costZaps: 0,
        creditBypass: true,
        status: "queued",
        pollUrl: buildAdminJobPollPath(requestId)
    });
};

const handleJobStatus = async (res: any, jobId: string) => {
    const result = await fetchGenerationQueueDoc(jobId);
    if (result.kind === "invalid_id") {
        return sendInvalidJobId(res);
    }
    if (result.kind === "not_found") {
        return sendNotFound(res);
    }
    if (!result.data.isAdminBypass) {
        return sendForbidden(res);
    }

    return sendJson(res, 200, formatAdminGenerationJobStatus(result.id, result.data));
};

export const handleAdminGeneration = async (req: any, res: any) => {
    res.set("Cache-Control", "no-store, max-age=0");
    res.set("X-Content-Type-Options", "nosniff");

    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, X-Admin-Generation-Key, Authorization");
        return res.status(204).end();
    }

    const operation = resolveAdminGenerationOperation(
        req.method || "GET",
        normalizeAdminGenerationPath(req.path || "/")
    );

    const auth = await requireAdmin(req, res);
    if (!auth) return;

    switch (operation.kind) {
        case "list_models":
            return sendJson(res, 200, listModels());
        case "get_job_status":
            return handleJobStatus(res, operation.jobId);
        case "submit_generate":
            return handleGenerate(req, res, auth.principal);
        case "invalid_job_id":
            return sendInvalidJobId(res);
        case "method_not_allowed":
            return sendMethodNotAllowed(res, operation.allowed);
        case "not_found":
        default:
            res.set("Allow", "GET, POST, OPTIONS");
            return sendNotFound(res);
    }
};
