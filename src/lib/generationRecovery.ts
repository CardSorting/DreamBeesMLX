/**
 * Pending-job recovery (history match, Firestore probe, failed cleanup).
 * Used by LiteContext resume, late-watcher, visibility, and online handlers.
 */
import type { Firestore } from 'firebase/firestore';
import { probeCompletedGeneration } from './generationSession';
import {
  finalizeClaimedPendingJob,
  loadPendingGeneration,
  type GenerationHistoryEntry,
  type PendingGeneration,
} from './generationFlow';

export type PendingRecoveryResult =
  | { status: 'complete'; entry: GenerationHistoryEntry; pending: PendingGeneration }
  | { status: 'failed'; message: string; pending: PendingGeneration }
  | { status: 'none' }
  | { status: 'busy' };

export interface RecoverPendingOptions {
  db: Firestore;
  uid: string;
  claimRef: { current: string | null };
  /** Latest merged history snapshot */
  history: Array<{
    id?: string;
    imageUrl?: string;
    firestoreImageId?: string;
    originalRequestId?: string;
    params?: Record<string, unknown>;
  }>;
  matchesRequest: (
    item: RecoverPendingOptions['history'][number],
    requestId: string
  ) => boolean;
}

/**
 * Try to finish a pending session without attaching new listeners.
 * Returns `busy` when another recovery call is in flight (use a ref guard in the caller).
 */
export async function recoverPendingGeneration(
  options: RecoverPendingOptions
): Promise<PendingRecoveryResult> {
  const { db, uid, claimRef, history, matchesRequest } = options;

  const pending = loadPendingGeneration(uid);
  if (!pending) return { status: 'none' };

  const inHistory = history.find((item) => matchesRequest(item, pending.requestId));
  if (inHistory?.imageUrl) {
    const entry = await finalizeClaimedPendingJob({
      claimRef,
      requestId: pending.requestId,
      prompt: pending.prompt,
      imageUrl: inHistory.imageUrl,
      userId: uid,
      firestoreImageId: inHistory.firestoreImageId as string | undefined,
      params: pending.aspectRatio ? { aspectRatio: pending.aspectRatio } : undefined,
    });
    if (!entry) return { status: 'busy' }; // another completion path holds the claim
    return { status: 'complete', entry, pending };
  }

  const probed = await probeCompletedGeneration(db, pending.requestId, uid);
  if (probed.status === 'complete') {
    const entry = await finalizeClaimedPendingJob({
      claimRef,
      requestId: pending.requestId,
      prompt: pending.prompt,
      imageUrl: probed.payload.imageUrl,
      userId: uid,
      firestoreImageId: probed.payload.firestoreImageId,
      params: pending.aspectRatio ? { aspectRatio: pending.aspectRatio } : undefined,
    });
    if (!entry) return { status: 'busy' };
    return { status: 'complete', entry, pending };
  }

  if (probed.status === 'failed') {
    return { status: 'failed', message: probed.message, pending };
  }

  return { status: 'none' };
}
