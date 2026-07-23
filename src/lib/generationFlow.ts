/**
 * Shared generation UX: stages, progress, and child-friendly copy.
 */

import { getOptimizedImageUrl, idleSaveToLocalStorage } from '../lite-utils';

export type GenerationStage = 'idle' | 'submitting' | 'queued' | 'processing' | 'finishing';

export const STAGE_MESSAGES: Record<Exclude<GenerationStage, 'idle'>, string> = {
  submitting: 'Sending your idea…',
  queued: 'Getting ready…',
  processing: 'Drawing your picture…',
  finishing: 'Almost done…',
};

export const STAGE_ORDER: Exclude<GenerationStage, 'idle'>[] = [
  'submitting',
  'queued',
  'processing',
  'finishing',
];

/** Map Firestore queue doc → UI stage */
export function stageFromQueueDoc(data: {
  status?: string;
  stage?: string;
} | undefined): GenerationStage {
  if (!data?.status) return 'submitting';
  if (data.status === 'queued') return 'queued';
  if (data.status === 'processing') {
    return data.stage === 'saving' ? 'finishing' : 'processing';
  }
  return 'submitting';
}

/** Blend server progress (0–100) with stage fallback for smooth bar */
export function progressPercent(stage: GenerationStage, serverProgress?: number | null): number {
  if (typeof serverProgress === 'number' && serverProgress > 0) {
    return Math.min(99, Math.round(serverProgress));
  }
  switch (stage) {
    case 'submitting':
      return 10;
    case 'queued':
      return 25;
    case 'processing':
      return 55;
    case 'finishing':
      return 90;
    default:
      return 0;
  }
}

export function messageForStage(stage: GenerationStage): string {
  if (stage === 'idle') return 'Creating…';
  return STAGE_MESSAGES[stage] || 'Creating…';
}

export const LONG_RUNNING_MESSAGE = 'Still working — big pictures take a little longer…';
export const ENQUEUE_RETRY_MESSAGE = 'Connecting to the art studio…';
export const IN_LINE_MESSAGE = 'Your idea is in line…';
export const SLOW_START_MESSAGE = 'Still connecting — hang tight…';

export function formatElapsed(ms: number): string | null {
  if (ms < 3000) return null;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `About ${sec}s`;
  return `About ${Math.floor(sec / 60)}m ${sec % 60}s`;
}

/** Creep the bar while waiting for the first Firestore update */
export function smoothIdleProgress(current: number, cap = 22): number {
  return Math.min(cap, current + 1);
}

/** Progress bar never jumps backward between server updates */
export function monotonicProgress(floor: number, next: number): number {
  return Math.max(floor, Math.min(99, next));
}

const PENDING_KEY = 'lite_pending_generation';

/** Pending session TTL — aligned with client recovery window */
export const PENDING_MAX_AGE_MS = 15 * 60 * 1000;

/** Client-side cap aligned with pending session TTL */
export const MAX_GENERATION_MS = 14 * 60 * 1000;

export interface PendingGeneration {
  requestId: string;
  prompt: string;
  startedAt: number;
  userId?: string;
  aspectRatio?: string;
}

export function savePendingGeneration(pending: PendingGeneration): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* private mode / quota */
  }
}

export function loadPendingGeneration(currentUserId?: string): PendingGeneration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGeneration;
    if (!parsed?.requestId || !parsed.startedAt) return null;
    if (Date.now() - parsed.startedAt > PENDING_MAX_AGE_MS) {
      clearPendingGeneration();
      return null;
    }
    const isWeb = !window.electronAPI?.lite;
    if (isWeb) {
      if (!parsed.userId) {
        clearPendingGeneration();
        return null;
      }
    }
    if (currentUserId) {
      if (!parsed.userId || parsed.userId !== currentUserId) {
        clearPendingGeneration();
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingGeneration(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function getPendingTimeRemainingMs(pending: PendingGeneration): number {
  return Math.max(0, PENDING_MAX_AGE_MS - (Date.now() - pending.startedAt));
}

/** Human-readable time until pending session expires */
export function formatPendingTimeRemaining(pending: PendingGeneration): string | null {
  const ms = getPendingTimeRemainingMs(pending);
  if (ms <= 0) return null;
  const min = Math.ceil(ms / 60_000);
  if (min <= 1) return 'about 1 minute';
  return `about ${min} minutes`;
}

export function toHistoryTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return 0;
}

/** Warm the browser cache so the preview appears instantly */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      img.onload = null;
      img.onerror = null;
      resolve();
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      resolve();
    };
    img.src = url;
  });
}

/** Stable route id: prefer request id (gen_*) so local + detail page agree */
export function historyLinkId(item: { id: string; originalRequestId?: string }): string {
  return item.originalRequestId || item.id;
}

/** Canonical id for routes and share links (never raw Firestore doc id when gen_* exists) */
export function canonicalGenerationRouteId(item: {
  id?: string;
  originalRequestId?: string;
  firestoreImageId?: string;
}): string {
  if (item.originalRequestId) return item.originalRequestId;
  if (item.id?.startsWith('gen_')) return item.id;
  return item.id || item.firestoreImageId || '';
}

/** Merge cloud + local history, newest first (deduped by request id) */
export function scopeLocalHistoryForUser(local: any[], userId: string | undefined): any[] {
  if (!userId) return [];
  return local.filter((item) => {
    const params = item.params as Record<string, unknown> | undefined;
    const paramsUserId = params?.userId as string | undefined;
    const ownerId =
      item.userId && item.userId !== 'local' ? item.userId : paramsUserId;
    // Rows without an owner are hidden when signed in (prevents cross-account bleed on shared devices)
    if (!ownerId) return false;
    return ownerId === userId;
  });
}

export function mergeGenerationHistory(local: any[], cloud: any[]): any[] {
  const byKey = new Map<string, any>();

  for (const item of cloud) {
    const key = historyLinkId(item);
    const originalRequestId =
      (item.originalRequestId as string | undefined) ||
      (key.startsWith('gen_') ? key : undefined);
    byKey.set(key, {
      ...item,
      id: key,
      originalRequestId,
      firestoreImageId: item.id,
      previewUrl: item.thumbnailUrl || item.lqip || item.previewUrl,
      createdAt: toHistoryTimestamp(item.createdAt),
    });
  }

  for (const item of local) {
    const key = historyLinkId(item);
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...item,
      id: key,
      originalRequestId:
        item.originalRequestId ||
        existing?.originalRequestId ||
        (key.startsWith('gen_') ? key : undefined),
      firestoreImageId: item.firestoreImageId || existing?.firestoreImageId,
      imageUrl: pickNewerImageUrl(item, existing) || item.imageUrl || existing?.imageUrl,
      thumbnailUrl: item.thumbnailUrl || existing?.thumbnailUrl,
      previewUrl:
        item.previewUrl ||
        item.thumbnailUrl ||
        item.lqip ||
        existing?.previewUrl ||
        existing?.thumbnailUrl ||
        existing?.lqip,
      prompt: item.prompt || existing?.prompt,
      modelId: item.modelId || existing?.modelId,
      userId: item.userId || existing?.userId,
      createdAt: toHistoryTimestamp(item.createdAt) || existing?.createdAt || Date.now(),
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
  );
}

/** Does a history item match a pending session request id? */
export function matchesPendingRequest(
  item: { id?: string; originalRequestId?: string; firestoreImageId?: string },
  requestId: string
): boolean {
  return matchesGenerationRoute(item, requestId);
}

/** Does a history item match a /generation/:id route? */
export function matchesGenerationRoute(
  item: {
    id?: string;
    originalRequestId?: string;
    firestoreImageId?: string;
    params?: Record<string, unknown>;
  },
  routeId: string
): boolean {
  if (!routeId) return false;
  const paramsFsId = item.params?.firestoreImageId as string | undefined;
  return (
    item.id === routeId ||
    item.originalRequestId === routeId ||
    item.firestoreImageId === routeId ||
    paramsFsId === routeId
  );
}

/** Map profile/history item → detail view model */
export function mapHistoryItemToDetail(raw: Record<string, unknown>) {
  const params = raw.params as Record<string, unknown> | undefined;
  const aspectRatio =
    (raw.aspectRatio as string | undefined) ||
    (params?.aspectRatio as string | undefined) ||
    (params?.size as string | undefined);
  const firestoreImageId =
    (raw.firestoreImageId as string | undefined) ||
    (params?.firestoreImageId as string | undefined);
  return {
    id: (raw.id as string) || '',
    userId: (raw.userId as string) || 'local',
    createdAt: toHistoryTimestamp(raw.createdAt) || Date.now(),
    imageUrl: raw.imageUrl as string,
    previewUrl: (raw.thumbnailUrl as string) || (raw.previewUrl as string) || (raw.lqip as string),
    prompt: (raw.prompt as string) || 'Generated image',
    negativePrompt: (raw.negative_prompt as string) || (raw.negativePrompt as string),
    modelId: (raw.modelId as string) || 'unknown',
    parameters: {
      steps: raw.steps as number | undefined,
      guidanceScale: raw.cfg as number | undefined,
      size: aspectRatio,
    },
    firestoreImageId,
  };
}

export interface GenerationHistoryEntry {
  id: string;
  prompt: string;
  imageUrl: string;
  modelId?: string;
  params?: Record<string, unknown>;
  createdAt: number;
  firestoreImageId?: string;
  userId?: string;
}

/** Normalize a row from Electron SQLite or localStorage into a consistent history shape */
export function normalizeLocalGenerationEntry(raw: Record<string, unknown>): GenerationHistoryEntry {
  const params = (raw.params as Record<string, unknown> | undefined) || {};
  const entry: GenerationHistoryEntry = {
    id: String(raw.id || ''),
    prompt: String(raw.prompt || ''),
    imageUrl: String(raw.imageUrl || ''),
    createdAt: toHistoryTimestamp(raw.createdAt) || Date.now(),
  };
  if (raw.modelId) entry.modelId = String(raw.modelId);
  const userId = (raw.userId as string | undefined) || (params.userId as string | undefined);
  if (userId) entry.userId = userId;
  const firestoreImageId =
    (raw.firestoreImageId as string | undefined) || (params.firestoreImageId as string | undefined);
  if (firestoreImageId) entry.firestoreImageId = firestoreImageId;
  if (Object.keys(params).length > 0) entry.params = { ...params };
  return entry;
}

/** Build a history row for local SQLite + displayHistory */
export function buildGenerationHistoryEntry(opts: {
  requestId: string;
  prompt: string;
  imageUrl: string;
  modelId?: string;
  params?: Record<string, unknown>;
  firestoreImageId?: string;
  userId?: string;
}): GenerationHistoryEntry {
  const entry: GenerationHistoryEntry = {
    id: opts.requestId,
    prompt: opts.prompt,
    imageUrl: opts.imageUrl,
    createdAt: Date.now(),
  };
  if (opts.modelId) entry.modelId = opts.modelId;
  if (opts.userId) {
    entry.userId = opts.userId;
    entry.params = { ...entry.params, userId: opts.userId };
  }
  if (opts.params) entry.params = { ...entry.params, ...opts.params };
  if (opts.firestoreImageId) {
    entry.firestoreImageId = opts.firestoreImageId;
    entry.params = { ...entry.params, firestoreImageId: opts.firestoreImageId };
  }
  return entry;
}

const LOCAL_STORAGE_KEY = 'lite_generations_v3';
const LOCAL_MAX_ENTRIES = 500;

function localStorageKeyForUser(userId: string): string {
  return `${LOCAL_STORAGE_KEY}_${userId}`;
}

/** Per-user localStorage key (for cross-tab sync listeners) */
export function localHistoryStorageKey(userId: string): string {
  return localStorageKeyForUser(userId);
}

/** Strip Firebase callable prefix for readable toast copy */
export function parseCallableError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  const raw = e?.message || '';
  const stripped = raw.replace(/^[^\s]+\s*:\s*/, '').trim();

  if (e?.code === 'functions/failed-precondition') {
    return stripped || 'Not enough credits to create this picture.';
  }
  if (e?.code === 'functions/resource-exhausted') {
    return stripped || 'The art studio is busy. Please try again in a moment.';
  }
  if (e?.code === 'functions/unauthenticated') {
    return 'Please sign in again.';
  }
  if (e?.code === 'functions/deadline-exceeded') {
    return 'The request timed out. Please try again.';
  }
  if (e?.code === 'functions/permission-denied') {
    return stripped || 'You do not have permission to do that.';
  }
  if (e?.code === 'functions/internal') {
    return stripped || 'Something went wrong on our side. Please try again.';
  }
  if (e?.code === 'functions/unavailable' || e?.code === 'functions/unknown') {
    return stripped || 'The service is temporarily unavailable. Please try again.';
  }
  return stripped || 'Could not start. Please try again.';
}

/** Prefer the URL from the source with the newer timestamp */
function pickNewerImageUrl(local?: any, cloud?: any): string | undefined {
  const localUrl = local?.imageUrl as string | undefined;
  const cloudUrl = cloud?.imageUrl as string | undefined;
  if (!cloudUrl) return localUrl;
  if (!localUrl) return cloudUrl;
  const localTs = toHistoryTimestamp(local?.createdAt) || 0;
  const cloudTs = toHistoryTimestamp(cloud?.createdAt) || 0;
  return cloudTs >= localTs ? cloudUrl : localUrl;
}

/** Persist to Electron SQLite or localStorage (web, scoped by user) */
export async function persistGenerationEntry(entry: GenerationHistoryEntry): Promise<void> {
  let electronSaved = false;

  if (window.electronAPI?.lite?.saveGeneration) {
    try {
      await window.electronAPI.lite.saveGeneration(entry);
      electronSaved = true;
    } catch (err) {
      console.warn('[Lite] Electron save failed, using localStorage:', err);
    }
  }

  if (!entry.userId) return;

  try {
    const key = localStorageKeyForUser(entry.userId);
    const raw = localStorage.getItem(key);
    const all: GenerationHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((g) => {
      if (g.id === entry.id) return false;
      if (entry.firestoreImageId && g.firestoreImageId === entry.firestoreImageId) return false;
      const p = g.params as Record<string, unknown> | undefined;
      if (entry.firestoreImageId && p?.firestoreImageId === entry.firestoreImageId) return false;
      return true;
    });
    idleSaveToLocalStorage(
      key,
      JSON.stringify([entry, ...filtered].slice(0, LOCAL_MAX_ENTRIES))
    );
  } catch {
    /* private mode / quota — electron may still have saved */
    if (!electronSaved) throw new Error('Could not save picture locally');
  }
}

/** Load local history from Electron or user-scoped localStorage */
export async function loadLocalGenerations(limit = 50, userId?: string): Promise<GenerationHistoryEntry[]> {
  if (window.electronAPI?.lite?.getGenerations) {
    try {
      const all = await window.electronAPI.lite.getGenerations(Math.max(limit, 100));
      const normalized = all.map((g) => normalizeLocalGenerationEntry(g as Record<string, unknown>));
      if (!userId) return normalized.slice(0, limit);
      return scopeLocalHistoryForUser(normalized, userId).slice(0, limit);
    } catch (err) {
      console.warn('[Lite] Electron history read failed, trying localStorage:', err);
    }
  }

  if (!userId) return [];

  try {
    const key = localStorageKeyForUser(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return (JSON.parse(raw) as GenerationHistoryEntry[])
        .map((g) => normalizeLocalGenerationEntry(g as unknown as Record<string, unknown>))
        .slice(0, limit);
    }

    // One-time migration from legacy shared key
    const legacyRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!legacyRaw) return [];
    const legacy = (JSON.parse(legacyRaw) as GenerationHistoryEntry[])
      .filter((g) => !g.userId || g.userId === userId || g.userId === 'local')
      .map((g) => normalizeLocalGenerationEntry(g as unknown as Record<string, unknown>));
    if (legacy.length > 0) {
      localStorage.setItem(key, JSON.stringify(legacy.slice(0, LOCAL_MAX_ENTRIES)));
    }
    return legacy.slice(0, limit);
  } catch {
    return [];
  }
}

/** Grid-friendly thumb URL (prefer thumbnail/LQIP over full image) */
export function historyThumbUrl(item: {
  imageUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  lqip?: string;
}): string {
  return (
    (item.thumbnailUrl as string) ||
    (item.previewUrl as string) ||
    (item.lqip as string) ||
    item.imageUrl ||
    ''
  );
}

/** Drop incomplete rows from merged history */
export function filterDisplayableHistory(items: any[]): any[] {
  return items.filter(
    (item) => typeof item.imageUrl === 'string' && item.imageUrl.length > 0
  );
}

/** Preload, persist locally, return entry for in-memory history */
export async function commitGenerationSuccess(
  entry: GenerationHistoryEntry,
  options?: { preload?: boolean }
): Promise<GenerationHistoryEntry> {
  if (options?.preload !== false) {
    await preloadImage(getOptimizedImageUrl(entry.imageUrl) || entry.imageUrl);
  }
  await persistGenerationEntry(entry);
  return entry;
}

/**
 * Ensure only one code path (resume listener, late watcher, etc.) finishes a pending job.
 * Pass a ref object `{ current: string | null }` from the React layer.
 */
export function tryClaimGenerationCompletion(
  handledRef: { current: string | null },
  requestId: string
): boolean {
  if (handledRef.current === requestId) return false;
  handledRef.current = requestId;
  return true;
}

export function releaseGenerationCompletionClaim(
  handledRef: { current: string | null },
  requestId: string
): void {
  if (handledRef.current === requestId) handledRef.current = null;
}

/** Finish a pending job from a history row (late watcher / profile sync) */
export async function completePendingFromHistory(
  handledRef: { current: string | null },
  pending: PendingGeneration,
  match: { imageUrl: string; firestoreImageId?: string },
  userId: string
): Promise<GenerationHistoryEntry | null> {
  return finalizeClaimedPendingJob({
    claimRef: handledRef,
    requestId: pending.requestId,
    prompt: pending.prompt,
    imageUrl: match.imageUrl,
    userId,
    firestoreImageId: match.firestoreImageId,
    params: pending.aspectRatio ? { aspectRatio: pending.aspectRatio } : undefined,
  });
}

/**
 * Claim + persist a completed job (single-flight via claimRef).
 * Returns null if another path already claimed this requestId.
 */
export async function finalizeClaimedPendingJob(opts: {
  claimRef: { current: string | null };
  requestId: string;
  prompt: string;
  imageUrl: string;
  userId: string;
  firestoreImageId?: string;
  modelId?: string;
  params?: Record<string, unknown>;
}): Promise<GenerationHistoryEntry | null> {
  if (!tryClaimGenerationCompletion(opts.claimRef, opts.requestId)) return null;
  try {
    return await persistCompletedGeneration({
      requestId: opts.requestId,
      prompt: opts.prompt,
      imageUrl: opts.imageUrl,
      userId: opts.userId,
      firestoreImageId: opts.firestoreImageId,
      modelId: opts.modelId,
      params: opts.params,
    });
  } catch (err) {
    releaseGenerationCompletionClaim(opts.claimRef, opts.requestId);
    throw err;
  }
}

/** Build + persist a completed job (shared by resume, generate, late-completion) */
export async function persistCompletedGeneration(opts: {
  requestId: string;
  prompt: string;
  imageUrl: string;
  userId: string;
  firestoreImageId?: string;
  modelId?: string;
  params?: Record<string, unknown>;
}): Promise<GenerationHistoryEntry> {
  return commitGenerationSuccess(
    buildGenerationHistoryEntry({
      requestId: opts.requestId,
      prompt: opts.prompt,
      imageUrl: opts.imageUrl,
      userId: opts.userId,
      firestoreImageId: opts.firestoreImageId,
      modelId: opts.modelId,
      params: opts.params,
    })
  );
}
