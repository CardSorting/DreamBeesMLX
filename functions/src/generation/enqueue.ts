import { FieldValue, getFunctions } from "../firebaseInit.js";
import { DEFAULT_ASPECT_RATIO } from "../domain/models/ImageGenerationRequest.js";
import {
    IMAGE_TASK_TYPE,
    WORKER_QUEUE_PATH
} from "./contract.js";
import { generationQueueDoc } from "./queue-repository.js";
import { logger } from "../lib/utils.js";

export type ImageGenerationTaskPayload = {
    taskType: typeof IMAGE_TASK_TYPE;
    requestId: string;
    userId: string;
    prompt: string;
    negative_prompt: string;
    modelId: string;
    steps: number;
    cfg: number;
    aspectRatio: string;
    scheduler: string;
    resuscitated?: boolean;
};

export const buildImageGenerationTaskPayload = (
    requestId: string,
    userId: string,
    source: Record<string, unknown>
): ImageGenerationTaskPayload => ({
    taskType: IMAGE_TASK_TYPE,
    requestId,
    userId,
    prompt: String(source.prompt ?? ""),
    negative_prompt: String(source.negative_prompt ?? ""),
    modelId: String(source.modelId || "wai-illustrious"),
    steps: Number(source.steps) || 30,
    cfg: Number(source.cfg) || 7.0,
    aspectRatio: String(source.aspectRatio || DEFAULT_ASPECT_RATIO),
    scheduler: String(source.scheduler || "DPM++ 2M Karras")
});

export async function resolveGenerationTaskSource(
    requestId: string,
    ctx: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const queueDoc = await generationQueueDoc(requestId).get();
    const queued = queueDoc.exists ? (queueDoc.data() as Record<string, unknown>) : {};
    return { ...ctx, ...queued };
}

export async function enqueueImageGenerationTask(
    payload: ImageGenerationTaskPayload
): Promise<void> {
    const queue = getFunctions().taskQueue(WORKER_QUEUE_PATH);
    await queue.enqueue(payload);
}

const ENQUEUE_MAX_ATTEMPTS = 2;

export async function enqueueImageGenerationTaskWithRetry(
    requestId: string,
    ctx: Record<string, unknown>,
    userId: string,
    options: { maxAttempts?: number; updateQueueDoc?: boolean } = {}
): Promise<void> {
    const maxAttempts = options.maxAttempts ?? ENQUEUE_MAX_ATTEMPTS;
    const updateQueueDoc = options.updateQueueDoc ?? true;
    const source = await resolveGenerationTaskSource(requestId, ctx);
    const payload = buildImageGenerationTaskPayload(requestId, userId, source);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await enqueueImageGenerationTask(payload);
            if (updateQueueDoc) {
                await generationQueueDoc(requestId).update({
                    enqueuedAt: FieldValue.serverTimestamp(),
                    enqueueAttempts: attempt
                }).catch(() => { });
            }
            return;
        } catch (err) {
            lastError = err;
            logger.warn(`[GenerationEnqueue] Attempt ${attempt} failed for ${requestId}`, err);
        }
    }

    if (updateQueueDoc) {
        await generationQueueDoc(requestId).update({
            enqueueError: lastError instanceof Error ? lastError.message : "Enqueue failed",
            lastEnqueueAttempt: FieldValue.serverTimestamp()
        }).catch(() => { });
    }

    throw lastError;
}

/**
 * Enqueue from a fully-resolved source (e.g. admin handler after preprocessing).
 * Marks queue doc on success; caller handles failure state.
 */
export async function enqueueResolvedGenerationTask(
    requestId: string,
    userId: string,
    source: Record<string, unknown>
): Promise<void> {
    const payload = buildImageGenerationTaskPayload(requestId, userId, source);
    await enqueueImageGenerationTask(payload);
    await generationQueueDoc(requestId).update({
        enqueuedAt: FieldValue.serverTimestamp()
    });
}
