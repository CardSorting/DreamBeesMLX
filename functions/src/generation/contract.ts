/**
 * Generation pipeline contract — shared constants, ID conventions, and validators.
 *
 * Mirrors industry async-job API patterns (Stripe job IDs, GitHub check runs, etc.):
 * - Namespaced request IDs
 * - Strict ID validation before Firestore/queue access
 * - Single source for collection and worker identifiers
 */

// ==============================================================================
// Infrastructure identifiers
// ==============================================================================

export const GENERATION_QUEUE_COLLECTION = "generation_queue" as const;
export const IMAGE_TASK_TYPE = "image" as const;
export const ADMIN_SYSTEM_USER_ID = "_admin_generation" as const;

export const WORKER_LOCATION = "us-central1" as const;
export const WORKER_FUNCTION = "urgentWorker" as const;
export const WORKER_QUEUE_PATH = `locations/${WORKER_LOCATION}/functions/${WORKER_FUNCTION}` as const;

// ==============================================================================
// Request ID conventions
// ==============================================================================

export const REQUEST_ID_PREFIX = {
    ADMIN: "admin_",
    ZAP: "zap_",
    REQUEST: "req_"
} as const;

/** Firestore-safe, URL-safe request IDs (no slashes, traversal, or control chars). */
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const sanitizeIdempotencyKey = (key: string): string => {
    const cleaned = String(key).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
    return cleaned || `${Date.now()}`;
};

export const isValidRequestId = (id: string): boolean =>
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 128 &&
    SAFE_REQUEST_ID_PATTERN.test(id) &&
    !id.includes("..");

export const buildAdminRequestId = (idempotencyKey?: string | null): string => {
    if (idempotencyKey) {
        return `${REQUEST_ID_PREFIX.ADMIN}${sanitizeIdempotencyKey(idempotencyKey)}`;
    }
    return `${REQUEST_ID_PREFIX.ADMIN}${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export const buildZapRequestId = (idempotencyKey: string): string =>
    `${REQUEST_ID_PREFIX.ZAP}${sanitizeIdempotencyKey(idempotencyKey)}`;

export const buildRequestId = (): string =>
    `${REQUEST_ID_PREFIX.REQUEST}${Date.now()}_${Math.random().toString(36).slice(2, 13)}`;

// ==============================================================================
// Job lifecycle
// ==============================================================================

export const GENERATION_JOB_STATUS = {
    QUEUED: "queued",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed"
} as const;

export const IDEMPOTENT_ACTIVE_STATUSES = [
    GENERATION_JOB_STATUS.QUEUED,
    GENERATION_JOB_STATUS.PROCESSING,
    GENERATION_JOB_STATUS.COMPLETED
] as const;

export const isActiveJobStatus = (status: string | undefined): boolean =>
    Boolean(status && (IDEMPOTENT_ACTIVE_STATUSES as readonly string[]).includes(status));

/**
 * Validates a request ID and throws a stable error message when invalid.
 * Used by callable handlers before Firestore access.
 */
export const assertValidRequestId = (id: string, label = "jobId"): void => {
    if (!isValidRequestId(id)) {
        throw new Error(`Invalid ${label}`);
    }
};
