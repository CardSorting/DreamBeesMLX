/**
 * Centralized generation API path constants, builders, and route resolution.
 *
 * Single source of truth for:
 * - Modal substrate submit/poll URLs
 * - Admin generation HTTP operation lookup
 *
 * Prevents path collisions, ambiguous subpath matches, and internal path leakage.
 */

import { isValidRequestId } from "./contract.js";

// ==============================================================================
// Substrate (Modal inference) API paths
// ==============================================================================

export const SUBSTRATE_PATHS = {
    SUBMIT: "generate",
    RESULT: "result",
    JOBS: "jobs"
} as const;

const joinEndpointPath = (endpoint: string, ...segments: string[]): string => {
    const base = endpoint.replace(/\/+$/, "");
    const suffix = segments.map((s) => s.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
    return suffix ? `${base}/${suffix}` : base;
};

export const buildSubstrateSubmitUrl = (endpoint: string): string =>
    joinEndpointPath(endpoint, SUBSTRATE_PATHS.SUBMIT);

export const buildSubstratePollUrls = (
    endpoint: string,
    jobId: string
): { primary: string; fallback: string } => {
    const encodedJobId = encodeURIComponent(jobId);
    return {
        primary: joinEndpointPath(endpoint, SUBSTRATE_PATHS.RESULT, encodedJobId),
        fallback: joinEndpointPath(endpoint, SUBSTRATE_PATHS.JOBS, encodedJobId)
    };
};

// ==============================================================================
// Admin generation HTTP routes
// ==============================================================================

export const ADMIN_GENERATION_ROUTES = {
    ROOT: "/",
    MODELS: "/models",
    GENERATE: "/generate",
    JOB_PREFIX: "/jobs/"
} as const;

const ADMIN_PATH_PREFIXES = [
    /^\/adminGeneration/i,
    /^\/admin\/generation/i
];

const INVALID_PATH_SENTINEL = "/__invalid__";

/**
 * Strip hosting/function prefixes and collapse trailing slashes.
 * Rejects traversal, double-slash, or percent-encoded traversal patterns.
 */
export const normalizeAdminGenerationPath = (rawPath: string): string => {
    let pathOnly = (rawPath.split("?")[0] || "/").trim();

    try {
        pathOnly = decodeURIComponent(pathOnly);
    } catch {
        return INVALID_PATH_SENTINEL;
    }

    let normalized = pathOnly;
    for (const prefix of ADMIN_PATH_PREFIXES) {
        normalized = normalized.replace(prefix, "");
    }

    normalized = normalized.replace(/\/+$/, "") || "/";

    if (
        normalized.includes("..") ||
        normalized.includes("//") ||
        /%2e%2e/i.test(rawPath) ||
        /[\0\r\n]/.test(normalized)
    ) {
        return INVALID_PATH_SENTINEL;
    }

    return normalized;
};

export type AdminGenerationOperation =
    | { kind: "list_models" }
    | { kind: "submit_generate" }
    | { kind: "get_job_status"; jobId: string }
    | { kind: "invalid_job_id" }
    | { kind: "method_not_allowed"; allowed: string[] }
    | { kind: "not_found" };

const MODELS_PATHS = new Set([ADMIN_GENERATION_ROUTES.ROOT, ADMIN_GENERATION_ROUTES.MODELS]);

/**
 * Declarative operation resolver (OpenAPI-style).
 * Returns 405 semantics for known paths with wrong HTTP method.
 */
export const resolveAdminGenerationOperation = (
    method: string,
    normalizedPath: string
): AdminGenerationOperation => {
    if (normalizedPath === INVALID_PATH_SENTINEL) {
        return { kind: "not_found" };
    }

    const verb = method.toUpperCase();

    if (MODELS_PATHS.has(normalizedPath as typeof ADMIN_GENERATION_ROUTES.ROOT)) {
        if (verb === "GET") return { kind: "list_models" };
        return { kind: "method_not_allowed", allowed: ["GET"] };
    }

    if (normalizedPath === ADMIN_GENERATION_ROUTES.GENERATE) {
        if (verb === "POST") return { kind: "submit_generate" };
        return { kind: "method_not_allowed", allowed: ["POST"] };
    }

    const jobMatch = normalizedPath.match(/^\/jobs\/([^/]+)$/);
    if (jobMatch) {
        const jobId = decodeURIComponent(jobMatch[1]);
        if (!isValidRequestId(jobId)) {
            return { kind: "invalid_job_id" };
        }
        if (verb === "GET") return { kind: "get_job_status", jobId };
        return { kind: "method_not_allowed", allowed: ["GET"] };
    }

    return { kind: "not_found" };
};

export const buildAdminJobPollPath = (requestId: string): string =>
    `${ADMIN_GENERATION_ROUTES.JOB_PREFIX}${encodeURIComponent(requestId)}`;
