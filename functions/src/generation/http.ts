/**
 * Standardized JSON API responses for generation HTTP endpoints.
 * Inspired by RFC 7807 Problem Details — stable error codes, no internal leakage.
 */

type JsonRecord = Record<string, unknown>;

export const sendJson = (res: { status: (code: number) => { json: (body: JsonRecord) => void } }, status: number, body: JsonRecord) => {
    res.status(status).json(body);
};

export const sendNotFound = (res: Parameters<typeof sendJson>[0]) =>
    sendJson(res, 404, { success: false, error: "not_found" });

export const sendMethodNotAllowed = (res: Parameters<typeof sendJson>[0] & { set?: (k: string, v: string) => void }, allowed: string[]) => {
    res.set?.("Allow", allowed.join(", "));
    sendJson(res, 405, { success: false, error: "method_not_allowed" });
};

export const sendInvalidJobId = (res: Parameters<typeof sendJson>[0]) =>
    sendJson(res, 400, { success: false, error: "invalid_job_id" });

export const sendForbidden = (res: Parameters<typeof sendJson>[0]) =>
    sendJson(res, 403, { success: false, error: "forbidden" });

export const sendRateLimited = (res: Parameters<typeof sendJson>[0] & { set?: (k: string, v: string) => void }, retryAfterSeconds: number) => {
    res.set?.("Retry-After", String(retryAfterSeconds));
    sendJson(res, 429, { success: false, error: "rate_limited" });
};

export const sendAccepted = (res: Parameters<typeof sendJson>[0], body: JsonRecord) =>
    sendJson(res, 202, body);
