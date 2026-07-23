/**
 * Stable job status projections for HTTP and callable APIs.
 */

import { resolveTimestamp } from "./queue-repository.js";

export type GenerationJobStatusView = {
    id: string;
    status: unknown;
    stage: unknown;
    progress: unknown;
    modelId: unknown;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    lqip: string | null;
    error: string | null;
    createdAt: string | null;
    completedAt: string | null;
};

export const formatGenerationJobStatus = (
    id: string,
    data: Record<string, unknown>
): GenerationJobStatusView => ({
    id,
    status: data.status ?? null,
    stage: data.stage ?? null,
    progress: data.progress ?? null,
    modelId: data.modelId ?? null,
    imageUrl: (data.imageUrl as string) || null,
    thumbnailUrl: (data.thumbnailUrl as string) || null,
    lqip: (data.lqip as string) || null,
    error: (data.error as string) || null,
    createdAt: resolveTimestamp(data.createdAt),
    completedAt: resolveTimestamp(data.completedAt)
});

export const formatAdminGenerationJobStatus = (
    id: string,
    data: Record<string, unknown>
) => ({
    success: true,
    ...formatGenerationJobStatus(id, data),
    costZaps: 0,
    creditBypass: true
});
