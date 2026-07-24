/**
 * Shared queue snapshot → UI state (used by generate + session resume).
 */
export type Firestore = any;
const collection = (...args: any[]) => ({}) as any;
const doc = (...args: any[]) => ({}) as any;
const getDoc = async (...args: any[]) => ({ exists: () => false, data: () => ({}) }) as any;
const getDocs = async (...args: any[]) => ({ empty: true, docs: [] }) as any;
const limit = (...args: any[]) => ({}) as any;
const onSnapshot = (...args: any[]) => (() => {}) as any;
const query = (...args: any[]) => ({}) as any;
const where = (...args: any[]) => ({}) as any;
import {
  ENQUEUE_RETRY_MESSAGE,
  GenerationStage,
  MAX_GENERATION_MS,
  messageForStage,
  monotonicProgress,
  progressPercent,
  stageFromQueueDoc,
} from './generationFlow';

export interface QueueSnapshot {
  status?: string;
  stage?: string;
  progress?: number;
  thumbnailUrl?: string;
  lqip?: string;
  imageUrl?: string;
  enqueueError?: string;
  enqueuedAt?: unknown;
  error?: string;
  resultImageId?: string;
  userId?: string;
}

export interface GenerationUiPatch {
  stage: GenerationStage;
  progress: number;
  message: string;
  previewUrl: string | null;
  showEnqueueRetry: boolean;
}

export interface GenerationSuccessPayload {
  imageUrl: string;
  firestoreImageId?: string;
}

export interface GenerationJobCallbacks {
  onProgress: (patch: GenerationUiPatch) => void;
  onSuccess: (payload: GenerationSuccessPayload) => void;
  onFailed: (message: string) => void;
  onConnectionError?: () => void;
  /** Reject queue snapshots that belong to another account */
  expectedUserId?: string;
}

/** Prefer LQIP (instant) then thumbnail then full image */
export function pickPreviewUrl(data: QueueSnapshot): string | null {
  if (data.lqip && typeof data.lqip === 'string') return data.lqip;
  if (data.thumbnailUrl) return data.thumbnailUrl;
  if (data.imageUrl) return data.imageUrl;
  return null;
}

export function patchFromQueueDoc(
  data: QueueSnapshot,
  progressFloor: number
): { patch: GenerationUiPatch; progressFloor: number } {
  const stage = stageFromQueueDoc(data);
  const progress = progressPercent(stage, data.progress);
  const nextFloor = monotonicProgress(progressFloor, progress);
  const showEnqueueRetry = Boolean(data.enqueueError && !data.enqueuedAt);

  return {
    progressFloor: nextFloor,
    patch: {
      stage,
      progress: nextFloor,
      message: showEnqueueRetry ? ENQUEUE_RETRY_MESSAGE : messageForStage(stage),
      previewUrl: pickPreviewUrl(data),
      showEnqueueRetry,
    },
  };
}

export function isQueueTerminal(data: QueueSnapshot): boolean {
  return data.status === 'completed' || data.status === 'failed';
}

export function isQueueSuccess(data: QueueSnapshot): boolean {
  if (!data.imageUrl) return false;
  if (data.status === 'failed') return false;
  if (data.status === 'completed') return true;
  return data.stage === 'done';
}

/** Final image is available — succeed even if status label lags behind */
export function hasCompletableImage(data: QueueSnapshot): boolean {
  if (!data.imageUrl || data.status === 'failed') return false;
  return data.status === 'completed' || data.stage === 'done';
}

export function isQueueInFlight(data: QueueSnapshot): boolean {
  return data.status === 'queued' || data.status === 'processing';
}

export type ProbeGenerationResult =
  | { status: 'complete'; payload: GenerationSuccessPayload }
  | { status: 'failed'; message: string }
  | { status: 'pending' };

/** One-shot read for jobs that finished while the client was away */
export async function probeCompletedGeneration(
  db: Firestore,
  requestId: string,
  expectedUserId?: string
): Promise<ProbeGenerationResult> {
  try {
    const queueSnap = await getDoc(doc(db, 'generation_queue', requestId));
    if (queueSnap.exists()) {
      const queue = queueSnap.data() as QueueSnapshot;
      if (
        expectedUserId &&
        queue.userId &&
        queue.userId !== expectedUserId
      ) {
        return { status: 'failed', message: 'This picture belongs to another account.' };
      }
      if (queue.status === 'failed') {
        return {
          status: 'failed',
          message: (queue.error as string) || 'Something went wrong.',
        };
      }
      if (hasCompletableImage(queue)) {
        return {
          status: 'complete',
          payload: {
            imageUrl: queue.imageUrl as string,
            firestoreImageId: queue.resultImageId as string | undefined,
          },
        };
      }
      if (isQueueSuccess(queue) && queue.imageUrl) {
        return {
          status: 'complete',
          payload: {
            imageUrl: queue.imageUrl as string,
            firestoreImageId: queue.resultImageId as string | undefined,
          },
        };
      }
      if (isQueueInFlight(queue)) {
        return { status: 'pending' };
      }
    }

    const imgSnap = await getDocs(
      query(
        collection(db, 'images'),
        where('originalRequestId', '==', requestId),
        limit(1)
      )
    );
    if (!imgSnap.empty) {
      const imgDoc = imgSnap.docs[0];
      const img = imgDoc.data();
      if (
        expectedUserId &&
        img.userId &&
        img.userId !== expectedUserId
      ) {
        return { status: 'failed', message: 'This picture belongs to another account.' };
      }
      if (img.imageUrl) {
        return {
          status: 'complete',
          payload: {
            imageUrl: img.imageUrl as string,
            firestoreImageId: imgDoc.id,
          },
        };
      }
    }
  } catch {
    /* offline / permission — caller will subscribe */
  }
  return { status: 'pending' };
}

/**
 * Realtime queue subscription. The optional images fallback is for legacy jobs whose
 * queue doc did not receive the final image URL.
 * Used by both active generate() and session resume after refresh.
 */
export function subscribeToGenerationJob(
  db: Firestore,
  requestId: string,
  initialProgressFloor: number,
  callbacks: GenerationJobCallbacks,
  options: { listenForImageFallback?: boolean } = {}
): () => void {
  let settled = false;
  let progressFloor = initialProgressFloor;

  const guard = <Args extends any[]>(fn: (...args: Args) => void) => {
    return (...args: Args) => {
      if (settled) return;
      fn(...args);
    };
  };

  const succeed = guard((payload: GenerationSuccessPayload) => {
    settled = true;
    callbacks.onSuccess(payload);
  });

  const unsubQueue = onSnapshot(
    doc(db, 'generation_queue', requestId),
    guard((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data) return;

      const queue = data as QueueSnapshot;

      if (
        callbacks.expectedUserId &&
        queue.userId &&
        queue.userId !== callbacks.expectedUserId
      ) {
        settled = true;
        callbacks.onFailed('This picture belongs to another account.');
        return;
      }

      if (hasCompletableImage(queue)) {
        succeed({
          imageUrl: queue.imageUrl as string,
          firestoreImageId: queue.resultImageId as string | undefined,
        });
        return;
      }

      if (queue.status === 'failed') {
        settled = true;
        callbacks.onFailed((queue.error as string) || 'Something went wrong.');
        return;
      }

      if (isQueueInFlight(queue)) {
        const { patch, progressFloor: next } = patchFromQueueDoc(queue, progressFloor);
        progressFloor = next;
        callbacks.onProgress(patch);
        return;
      }

      if (isQueueSuccess(queue)) {
        succeed({
          imageUrl: queue.imageUrl as string,
          firestoreImageId: queue.resultImageId as string | undefined,
        });
      }
    }),
    guard(() => {
      callbacks.onConnectionError?.();
    })
  );

  const unsubImages = options.listenForImageFallback
    ? onSnapshot(
        query(
          collection(db, 'images'),
          where('originalRequestId', '==', requestId),
          limit(1)
        ),
        guard((snap) => {
          if (snap.empty) return;
          const imgDoc = snap.docs[0];
          const img = imgDoc.data();
          if (
            callbacks.expectedUserId &&
            img.userId &&
            img.userId !== callbacks.expectedUserId
          ) {
            settled = true;
            callbacks.onFailed('This picture belongs to another account.');
            return;
          }
          if (img.imageUrl) {
            succeed({ imageUrl: img.imageUrl as string, firestoreImageId: imgDoc.id });
          }
        }),
        guard(() => {
          callbacks.onConnectionError?.();
        })
      )
    : null;

  return () => {
    settled = true;
    unsubQueue();
    unsubImages?.();
  };
}

export interface AttachGenerationSessionOptions {
  requestId: string;
  startedAt: number;
  initialProgressFloor?: number;
  onProgress: (patch: GenerationUiPatch) => void;
  onSuccess: (payload: GenerationSuccessPayload) => void;
  onFailed: (message: string) => void;
  onHardTimeout: () => void;
  onConnectionError?: () => void;
  expectedUserId?: string;
  listenForImageFallback?: boolean;
}

/**
 * Subscribe to queue updates with a client-side hard timeout.
 * Shared by session resume and active generate flows.
 */
export function attachGenerationSession(
  db: Firestore,
  options: AttachGenerationSessionOptions
): () => void {
  const {
    requestId,
    startedAt,
    initialProgressFloor = 10,
    onProgress,
    onSuccess,
    onFailed,
    onHardTimeout,
    onConnectionError,
    expectedUserId,
    listenForImageFallback = false,
  } = options;

  const remainingMs = Math.max(5000, MAX_GENERATION_MS - (Date.now() - startedAt));
  const hardTimeout = setTimeout(onHardTimeout, remainingMs);

  const unsub = subscribeToGenerationJob(db, requestId, initialProgressFloor, {
    onProgress,
    expectedUserId,
    onSuccess: (payload) => {
      clearTimeout(hardTimeout);
      onSuccess(payload);
    },
    onFailed: (message) => {
      clearTimeout(hardTimeout);
      onFailed(message);
    },
    onConnectionError,
  }, { listenForImageFallback });

  return () => {
    clearTimeout(hardTimeout);
    unsub();
  };
}
