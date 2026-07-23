import { timingSafeEqual } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { db } from "../firebaseInit.js";
import { logger, fetchWithTimeout } from "../lib/utils.js";
import { MODEL_IDS, getModelEndpoint, isValidModelId } from "../lib/modelConventions.js";

type DiagnosticProbeMethod = "HEAD" | "GET";

type DiagnosticOptions = {
    includeEndpoints: boolean;
    includeFirestore: boolean;
    probeMethods: DiagnosticProbeMethod[];
    timeoutMs: number;
    requestedModels: string[] | null;
};

const DEFAULT_TIMEOUT_MS = 3500;
const MAX_TIMEOUT_MS = 8000;
const MAX_FIRESTORE_DOCS = 50;
const MODEL_PROBE_CONCURRENCY = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const diagnosticRateLimit = new Map<string, { count: number; resetAt: number }>();

const SECRET_ENV_KEYS = [
    "STRIPE_SECRET_KEY",
    "B2_APP_KEY",
    "B2_KEY_ID",
    "OPENROUTER_API_KEY",
    "REPLICATE_API_TOKEN",
    "CLOUDFLARE_API_TOKEN"
] as const;

const CONFIG_ENV_KEYS = [
    "B2_BUCKET",
    "B2_PUBLIC_URL",
    "CLOUDFLARE_ACCOUNT_ID",
    "GCLOUD_PROJECT",
    "GCP_PROJECT"
] as const;

const redactEndpoint = (endpoint: string): string => {
    try {
        const url = new URL(endpoint);
        return `${url.protocol}//${url.hostname}${url.pathname}`;
    } catch {
        return "invalid-url";
    }
};

const sanitizeError = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);
    return message
        .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
        .replace(/key=([^&\s]+)/gi, "key=[REDACTED]")
        .slice(0, 240);
};

const parseBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["1", "true", "yes", "y"].includes(value.toLowerCase());
    return fallback;
};

const safeEquals = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const consumeDiagnosticRateLimit = (principal: string): { allowed: boolean; retryAfterSeconds?: number } => {
    const now = Date.now();
    const bucket = diagnosticRateLimit.get(principal);

    if (!bucket || bucket.resetAt <= now) {
        diagnosticRateLimit.set(principal, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true };
};

const parseOptions = (req: any): DiagnosticOptions => {
    const query = req.query || {};
    const requestedModelsRaw = typeof query.models === "string" ? query.models : "";
    const requestedModels = requestedModelsRaw
        ? requestedModelsRaw.split(",").map((value: string) => value.trim()).filter(Boolean)
        : null;

    const timeoutCandidate = Number(query.timeoutMs || query.timeout || DEFAULT_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(timeoutCandidate)
        ? Math.min(Math.max(timeoutCandidate, 500), MAX_TIMEOUT_MS)
        : DEFAULT_TIMEOUT_MS;

    const probeMethods: DiagnosticProbeMethod[] = parseBoolean(query.allowGetFallback, false)
        ? ["HEAD", "GET"]
        : ["HEAD"];

    return {
        includeEndpoints: parseBoolean(query.includeEndpoints, false),
        includeFirestore: parseBoolean(query.includeFirestore, true),
        probeMethods,
        timeoutMs,
        requestedModels
    };
};

const isDiagnosticAuthorized = async (req: any): Promise<{ authorized: boolean; principal: string; reason?: string }> => {
    const configuredKey = process.env.ADMIN_DIAGNOSTIC_KEY;
    const suppliedKey = req.get?.("x-admin-diagnostic-key");

    if (configuredKey && suppliedKey && safeEquals(String(suppliedKey), configuredKey)) {
        return { authorized: true, principal: "diagnostic-key" };
    }

    const authorization = req.get?.("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (tokenMatch) {
        try {
            const decoded = await getAuth().verifyIdToken(tokenMatch[1], true);
            const role = (decoded as any).role || (decoded as any).admin;
            if (role === "admin" || role === true) {
                return { authorized: true, principal: decoded.uid || "firebase-admin-token" };
            }
            return { authorized: false, principal: decoded.uid || "firebase-token", reason: "missing-admin-claim" };
        } catch (error) {
            return { authorized: false, principal: "bearer-token", reason: sanitizeError(error) };
        }
    }

    if (!configuredKey) {
        return { authorized: false, principal: "anonymous", reason: "ADMIN_DIAGNOSTIC_KEY_NOT_CONFIGURED" };
    }
    return { authorized: false, principal: "anonymous", reason: "missing-credentials" };
};

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    let nextIndex = 0;

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            results[currentIndex] = await mapper(items[currentIndex]);
        }
    }));

    return results;
}

const classifyReachability = (status?: number): "reachable" | "degraded" | "unreachable" => {
    if (!status) return "unreachable";
    if (status < 500 || status === 501) return "reachable";
    return "degraded";
};

const probeModel = async (modelId: string, options: DiagnosticOptions) => {
    const endpoint = getModelEndpoint(modelId);
    const startedAt = Date.now();
    const attempts: any[] = [];

    for (const method of options.probeMethods) {
        const attemptStartedAt = Date.now();
        try {
            const response = await fetchWithTimeout(endpoint, {
                method,
                timeout: options.timeoutMs,
                headers: {
                    "User-Agent": "DreamBees-Diagnostic/1.0",
                    "Accept": "application/json,text/plain,*/*"
                }
            });

            const attempt = {
                method,
                status: response.status,
                statusText: response.statusText,
                latencyMs: Date.now() - attemptStartedAt
            };
            attempts.push(attempt);

            return {
                modelId,
                status: classifyReachability(response.status),
                reachable: classifyReachability(response.status) !== "unreachable",
                latencyMs: Date.now() - startedAt,
                endpointHost: redactEndpoint(endpoint),
                ...(options.includeEndpoints ? { endpoint } : {}),
                attempts
            };
        } catch (error) {
            attempts.push({
                method,
                latencyMs: Date.now() - attemptStartedAt,
                error: sanitizeError(error)
            });
        }
    }

    return {
        modelId,
        status: "unreachable",
        reachable: false,
        latencyMs: Date.now() - startedAt,
        endpointHost: redactEndpoint(endpoint),
        ...(options.includeEndpoints ? { endpoint } : {}),
        attempts
    };
};

export const handleDiagnostic = async (req: any, res: any) => {
    const requestId = req.get?.("x-cloud-trace-context")?.split("/")?.[0] || `diag_${Date.now()}`;
    const startedAt = Date.now();

    res.set("Cache-Control", "no-store, max-age=0");
    res.set("X-Content-Type-Options", "nosniff");

    if (req.method !== "GET" && req.method !== "HEAD") {
        res.set("Allow", "GET, HEAD");
        return res.status(405).json({ success: false, error: "method_not_allowed", requestId });
    }

    const auth = await isDiagnosticAuthorized(req);
    if (!auth.authorized) {
        logger.warn("[Diagnostic] Unauthorized diagnostic access attempt", {
            requestId,
            principal: auth.principal,
            reason: auth.reason,
            ip: req.ip,
            path: req.path
        });
        return res.status(403).json({ success: false, error: "forbidden", requestId });
    }

    const rateLimitKey = `${auth.principal}:${req.ip || "unknown"}`;
    const rateLimit = consumeDiagnosticRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
        res.set("Retry-After", String(rateLimit.retryAfterSeconds || 60));
        logger.warn("[Diagnostic] Rate limited diagnostic request", { requestId, principal: auth.principal, ip: req.ip });
        return res.status(429).json({ success: false, error: "rate_limited", requestId });
    }

    const options = parseOptions(req);
    const allModelIds = Object.values(MODEL_IDS);
    const invalidModels = (options.requestedModels || []).filter(modelId => !isValidModelId(modelId));
    const modelIds = options.requestedModels
        ? options.requestedModels.filter(modelId => isValidModelId(modelId))
        : allModelIds;

    logger.info("[Diagnostic] Starting model endpoint health check", {
        requestId,
        principal: auth.principal,
        modelCount: modelIds.length,
        timeoutMs: options.timeoutMs,
        includeFirestore: options.includeFirestore
    });

    const results: Record<string, any> = {
        success: true,
        requestId,
        timestamp: new Date().toISOString(),
        durationMs: 0,
        audit: {
            principal: auth.principal,
            modelCount: modelIds.length,
            invalidModels,
            timeoutMs: options.timeoutMs,
            probeMethods: options.probeMethods,
            endpointsRedacted: !options.includeEndpoints
        },
        summary: {
            total: modelIds.length,
            reachable: 0,
            degraded: 0,
            unreachable: 0
        },
        models: {}
    };

    const probeResults = await mapWithConcurrency(modelIds, MODEL_PROBE_CONCURRENCY, modelId => probeModel(modelId, options));
    for (const probeResult of probeResults) {
        results.models[probeResult.modelId] = probeResult;
        results.summary[probeResult.status] += 1;
    }

    results.env = Object.fromEntries([
        ...CONFIG_ENV_KEYS.map(key => [key, process.env[key] ? "SET" : "MISSING"]),
        ...SECRET_ENV_KEYS.map(key => [key, process.env[key] ? "SET_REDACTED" : "MISSING"])
    ]);

    if (options.includeFirestore) {
        try {
            const healthSnap = await db.collection("substrate_health").limit(MAX_FIRESTORE_DOCS).get();
            results.substrateHealth = {};
            healthSnap.forEach(doc => {
                const data = doc.data() as any;
                results.substrateHealth[doc.id] = {
                    status: data.status || "unknown",
                    consecutiveErrors: Number(data.consecutiveErrors || 0),
                    lastSuccessAt: data.lastSuccessAt?.toDate?.()?.toISOString?.() || null,
                    lastErrorAt: data.lastErrorAt?.toDate?.()?.toISOString?.() || null,
                    lastErrorMsg: data.lastErrorMsg ? sanitizeError(data.lastErrorMsg) : null
                };
            });
        } catch (healthError: any) {
            results.substrateHealthError = sanitizeError(healthError);
        }
    }

    results.durationMs = Date.now() - startedAt;
    logger.info("[Diagnostic] Completed model endpoint health check", {
        requestId,
        durationMs: results.durationMs,
        summary: results.summary
    });

    if (req.method === "HEAD") {
        return res.status(results.summary.unreachable > 0 ? 207 : 200).end();
    }

    res.status(200).json(results);
};
