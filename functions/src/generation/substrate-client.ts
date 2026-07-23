/**
 * Substrate (Modal) async generation client.
 *
 * Industry-standard async job pattern:
 *   1. POST /generate → job_id
 *   2. Poll GET /result/{id} (primary) with /jobs/{id} fallback
 *
 * Used by the image worker; centralizes submit/poll logic and response parsing.
 */

import { fetchWithTimeout } from "../lib/utils.js";
import { buildSubstratePollUrls, buildSubstrateSubmitUrl } from "./paths.js";

export type SubstratePollResult =
    | { kind: "pending" }
    | { kind: "empty" }
    | { kind: "image"; buffer: Buffer };

export type SubstratePollProgress = {
    poll: number;
    progress: number;
};

export type SubstratePollOptions = {
    maxPolls?: number;
    onProgress?: (progress: SubstratePollProgress) => void | Promise<void>;
};

const DEFAULT_MAX_POLLS = 120;
const SUBSTRATE_USER_AGENT = "DreamBees/1.1";

const findImagePayload = (value: unknown): string | null => {
    if (!value) return null;

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (
            trimmed.startsWith("http://") ||
            trimmed.startsWith("https://") ||
            trimmed.startsWith("data:image/") ||
            /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)
        ) {
            return trimmed;
        }
        return null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const match = findImagePayload(item);
            if (match) return match;
        }
        return null;
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        const preferredKeys = [
            "image", "image_url", "imageUrl", "url",
            "output", "result", "data", "artifact", "artifacts"
        ];
        for (const key of preferredKeys) {
            const match = findImagePayload(record[key]);
            if (match) return match;
        }
    }

    return null;
};

const imagePayloadToBuffer = async (payload: string): Promise<Buffer> => {
    if (payload.startsWith("http://") || payload.startsWith("https://")) {
        const res = await fetchWithTimeout(payload, {
            headers: { "User-Agent": SUBSTRATE_USER_AGENT },
            timeout: 60000
        });
        if (!res.ok) {
            throw new Error(`Generated image download failed (${res.status})`);
        }
        return Buffer.from(await res.arrayBuffer());
    }

    const base64 = payload.startsWith("data:image/")
        ? payload.slice(payload.indexOf(",") + 1)
        : payload;
    return Buffer.from(base64.replace(/\s/g, ""), "base64");
};

export const parseSubstratePollResponse = async (res: Response): Promise<SubstratePollResult> => {
    if (res.status === 202) return { kind: "pending" };
    if (res.status === 404) return { kind: "empty" };

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("image/")) {
        return { kind: "image", buffer: Buffer.from(await res.arrayBuffer()) };
    }

    if (contentType.includes("application/json")) {
        const payload = await res.json() as Record<string, unknown>;
        const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
        const error = payload.error || payload.message || payload.detail;

        if (!res.ok || ["failed", "error", "cancelled", "canceled"].includes(status)) {
            throw new Error(`Substrate generation failed: ${String(error || `status ${res.status}`)}`);
        }

        const imagePayload = findImagePayload(payload);
        if (imagePayload) {
            return { kind: "image", buffer: await imagePayloadToBuffer(imagePayload) };
        }

        if (["queued", "running", "generating", "processing", "pending", "started"].includes(status)) {
            return { kind: "pending" };
        }

        if (["completed", "complete", "succeeded", "success", "done"].includes(status)) {
            throw new Error("Substrate generation completed without an image payload");
        }

        return { kind: "empty" };
    }

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Substrate result request failed (${res.status})${body ? `: ${body.slice(0, 300)}` : ""}`);
    }

    return { kind: "empty" };
};

export const submitSubstrateJob = async (
    endpoint: string,
    body: Record<string, unknown>
): Promise<string> => {
    const submitResponse = await fetchWithTimeout(buildSubstrateSubmitUrl(endpoint), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": SUBSTRATE_USER_AGENT
        },
        body: JSON.stringify(body),
        timeout: 120000
    });

    if (!submitResponse.ok) {
        throw new Error(`Substrate submission failed (${submitResponse.status})`);
    }

    const { job_id } = await submitResponse.json() as { job_id?: string };
    if (!job_id || typeof job_id !== "string") {
        throw new Error("Substrate submission returned no job_id");
    }

    return job_id;
};

export const pollSubstrateJob = async (
    endpoint: string,
    jobId: string,
    options: SubstratePollOptions = {}
): Promise<Buffer> => {
    const maxPolls = options.maxPolls ?? DEFAULT_MAX_POLLS;

    for (let poll = 0; poll < maxPolls; poll++) {
        const delayMs = poll === 0 ? 300 : Math.min(600 + poll * 280, 2800);
        await new Promise((r) => setTimeout(r, delayMs));

        const pollProgress = Math.min(75, 20 + poll * 3);
        await options.onProgress?.({ poll, progress: pollProgress });

        const pollUrls = buildSubstratePollUrls(endpoint, jobId);
        const [resultRes, jobsRes] = await Promise.all([
            fetchWithTimeout(pollUrls.primary, { timeout: 12000 }).catch(() => null),
            fetchWithTimeout(pollUrls.fallback, { timeout: 12000 }).catch(() => null)
        ]);

        let pending = false;
        for (const res of [resultRes, jobsRes]) {
            if (!res) continue;
            const parsed = await parseSubstratePollResponse(res);
            if (parsed.kind === "pending") {
                pending = true;
                continue;
            }
            if (parsed.kind === "image") {
                return parsed.buffer;
            }
        }
        if (pending) continue;
    }

    throw new Error("Substrate generation timed out");
};

/**
 * Submit and poll until image buffer is ready — one-shot SDK-style entry point.
 */
export const executeSubstrateGeneration = async (
    endpoint: string,
    body: Record<string, unknown>,
    options: SubstratePollOptions = {}
): Promise<Buffer> => {
    const jobId = await submitSubstrateJob(endpoint, body);
    return pollSubstrateJob(endpoint, jobId, options);
};
