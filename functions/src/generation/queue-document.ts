/**
 * Builds generation_queue Firestore documents from domain inputs.
 * Single shape used by orchestrator and admin handler.
 */

import { FieldValue } from "../firebaseInit.js";
import { GENERATION_JOB_STATUS } from "./contract.js";

export type QueuedGenerationDocumentInput = {
    userId: string;
    prompt: string;
    negativePrompt: string;
    modelId: string;
    aspectRatio: string;
    steps: number;
    cfg: number;
    seed?: number;
    scheduler: string;
    cost: number;
    debited: boolean;
    isAdminBypass?: boolean;
    isApiKeyRequest?: boolean;
    adminPrincipal?: string;
};

export const buildQueuedGenerationDocument = (
    input: QueuedGenerationDocumentInput
): Record<string, unknown> => ({
    userId: input.userId,
    prompt: input.prompt,
    negative_prompt: input.negativePrompt,
    modelId: input.modelId,
    aspectRatio: input.aspectRatio,
    steps: input.steps,
    cfg: input.cfg,
    seed: input.seed,
    scheduler: input.scheduler,
    status: GENERATION_JOB_STATUS.QUEUED,
    stage: "queued",
    progress: 8,
    cost: input.cost,
    debited: input.debited,
    ...(input.isAdminBypass !== undefined ? { isAdminBypass: input.isAdminBypass } : {}),
    ...(input.isApiKeyRequest !== undefined ? { isApiKeyRequest: input.isApiKeyRequest } : {}),
    ...(input.adminPrincipal ? { adminPrincipal: input.adminPrincipal } : {}),
    createdAt: FieldValue.serverTimestamp()
});
