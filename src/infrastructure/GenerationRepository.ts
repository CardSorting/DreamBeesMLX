/**
 * [LAYER: INFRASTRUCTURE]
 * Local + Firestore generation resolution for detail views.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { auth } from '../firebase.ts';
import { GenerationDetail } from '../domain/models/GenerationDetail';
import {
  buildGenerationHistoryEntry,
  loadLocalGenerations,
  persistGenerationEntry,
  toHistoryTimestamp,
} from '../lib/generationFlow';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class GenerationRepository {
  async getById(generationId: string): Promise<GenerationDetail> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const local = await this.findLocal(generationId);
        if (this.hasUsableLocalDetail(local)) {
          return this.enrichWithMetadata(local);
        }

        const remote = await this.fetchFromFirestore(generationId);

        const resolved = this.mergeLocalAndRemote(local, remote);
        if (!resolved) {
          throw new Error(`Generation not found: ${generationId}`);
        }

        if (remote) {
          this.cacheLocally(resolved).catch(() => { });
        }

        return this.enrichWithMetadata(resolved);
      } catch (error) {
        lastError = error;
        if (error instanceof PermissionError) throw error;
        if (error instanceof Error && error.message.includes('not found')) throw error;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 450));
          continue;
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`Generation not found: ${generationId}`);
  }

  private hasUsableLocalDetail(local: GenerationDetail | null): local is GenerationDetail {
    return Boolean(local?.imageUrl);
  }

  /** Prefer cloud image URL when local row is stale or missing media */
  private mergeLocalAndRemote(
    local: GenerationDetail | null,
    remote: GenerationDetail | null
  ): GenerationDetail | null {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;

    const localExtra = local as GenerationDetail & { firestoreImageId?: string };
    const remoteExtra = remote as GenerationDetail & { firestoreImageId?: string };

    return {
      ...remote,
      ...local,
      imageUrl: this.pickBestImageUrl(local, remote),
      previewUrl:
        local.previewUrl ||
        remote.previewUrl ||
        (remote as GenerationDetail & { thumbnailUrl?: string }).thumbnailUrl ||
        (local as GenerationDetail & { thumbnailUrl?: string }).thumbnailUrl,
      prompt: local.prompt || remote.prompt,
      modelId: local.modelId !== 'unknown' ? local.modelId : remote.modelId,
      parameters: { ...remote.parameters, ...local.parameters },
      firestoreImageId: remoteExtra.firestoreImageId || localExtra.firestoreImageId,
    } as GenerationDetail;
  }

  /** Prefer newer cloud URL when local was saved before catalog sync finished */
  private pickBestImageUrl(
    local: GenerationDetail,
    remote: GenerationDetail
  ): string {
    if (!remote.imageUrl) return local.imageUrl;
    if (!local.imageUrl) return remote.imageUrl;
    if ((remote.createdAt || 0) >= (local.createdAt || 0)) return remote.imageUrl;
    return local.imageUrl;
  }

  async getAllGenerations(): Promise<GenerationDetail[]> {
    try {
      const uid = auth.currentUser?.uid;
      const raw = await loadLocalGenerations(1000, uid);
      return raw.map((g) => this.mapToDomainModel(g));
    } catch (error) {
      console.warn('[GenerationRepository] Local history load failed:', error);
      return [];
    }
  }

  async saveGeneration(generation: any): Promise<void> {
    const detail = this.mapToDomainModel(generation);
    await this.cacheLocally(detail);
  }

  private async cacheLocally(generation: GenerationDetail): Promise<void> {
    const extra = generation as GenerationDetail & { firestoreImageId?: string };
    const entry = buildGenerationHistoryEntry({
      requestId: generation.id,
      prompt: generation.prompt,
      imageUrl: generation.imageUrl,
      modelId: generation.modelId,
      userId: generation.userId !== 'local' && generation.userId !== 'unknown'
        ? generation.userId
        : auth.currentUser?.uid,
      firestoreImageId: extra.firestoreImageId,
      params: (generation.parameters || {}) as Record<string, unknown>,
    });
    await persistGenerationEntry(entry);
  }

  private async findLocal(generationId: string): Promise<GenerationDetail | null> {
    const uid = auth.currentUser?.uid;
    const raw = await loadLocalGenerations(1000, uid);
    const all = raw.map((g) => this.mapToDomainModel(g));
    const match = all.find((g) => {
      const extra = g as GenerationDetail & { firestoreImageId?: string };
      const fromParams = (extra.parameters as Record<string, unknown> | undefined)?.firestoreImageId;
      return (
        g.id === generationId ||
        extra.firestoreImageId === generationId ||
        fromParams === generationId
      );
    });
    return match || null;
  }

  private async fetchFromFirestore(generationId: string): Promise<GenerationDetail | null> {
    try {
      const isRequestId = generationId.startsWith('gen_');

      if (!isRequestId) {
        const imageSnap = await getDoc(doc(db, 'images', generationId));
        if (imageSnap.exists()) {
          const data = imageSnap.data();
          this.assertReadableByCurrentUser(data.userId as string | undefined);
          return this.mapFirestoreImage(imageSnap.id, data);
        }
      }

      const queueSnap = await getDoc(doc(db, 'generation_queue', generationId));
      if (queueSnap.exists()) {
        const queueData = queueSnap.data();
        this.assertReadableByCurrentUser(queueData?.userId as string | undefined);
        const mapped = this.mapFirestoreQueue(generationId, queueData);
        if (mapped) return mapped;
      }

      const byRequest = await getDocs(
        query(
          collection(db, 'images'),
          where('originalRequestId', '==', generationId),
          limit(1)
        )
      );
      if (!byRequest.empty) {
        const d = byRequest.docs[0];
        const data = d.data();
        this.assertReadableByCurrentUser(data.userId as string | undefined);
        return this.mapFirestoreImage(d.id, data);
      }
    } catch (error: any) {
      const code = error?.code || '';
      const msg = error?.message || String(error);
      if (code === 'permission-denied' || /permission/i.test(msg)) {
        throw new PermissionError('You do not have access to this picture.');
      }
      console.warn('[GenerationRepository] Firestore lookup failed:', error);
    }

    return null;
  }

  private mapFirestoreImage(docId: string, data: Record<string, unknown>): GenerationDetail {
    const linkId = (data.originalRequestId as string) || docId;
    const detail = {
      id: linkId,
      userId: (data.userId as string) || 'unknown',
      createdAt: toHistoryTimestamp(data.createdAt) || Date.now(),
      imageUrl: data.imageUrl as string,
      previewUrl: (data.thumbnailUrl as string) || (data.lqip as string),
      prompt: (data.prompt as string) || 'Generated image',
      negativePrompt: data.negative_prompt as string | undefined,
      modelId: (data.modelId as string) || 'unknown',
      parameters: {
        steps: data.steps as number | undefined,
        guidanceScale: data.cfg as number | undefined,
        size: data.aspectRatio as string | undefined,
      },
      revision: 1,
    } as GenerationDetail & { firestoreImageId?: string };
    detail.firestoreImageId = docId;
    return detail;
  }

  private mapFirestoreQueue(
    requestId: string,
    data: Record<string, unknown>
  ): GenerationDetail | null {
    if (!data.imageUrl) return null;
    const detail = {
      id: requestId,
      userId: (data.userId as string) || 'unknown',
      createdAt: toHistoryTimestamp(data.createdAt) || Date.now(),
      imageUrl: data.imageUrl as string,
      previewUrl: (data.thumbnailUrl as string) || (data.lqip as string),
      prompt: (data.prompt as string) || 'Generated image',
      negativePrompt: data.negative_prompt as string | undefined,
      modelId: (data.modelId as string) || 'unknown',
      parameters: {
        steps: data.steps as number | undefined,
        guidanceScale: data.cfg as number | undefined,
        size: data.aspectRatio as string | undefined,
      },
      revision: 1,
    } as GenerationDetail & { firestoreImageId?: string };
    const catalogId = data.resultImageId as string | undefined;
    if (catalogId) detail.firestoreImageId = catalogId;
    return detail;
  }

  private mapToDomainModel(raw: any): GenerationDetail {
    const params = raw.params as Record<string, unknown> | undefined;
    const userId =
      raw.userId && raw.userId !== 'local'
        ? raw.userId
        : (params?.userId as string | undefined) || 'local';
    const detail = {
      id: raw.id,
      userId,
      createdAt: raw.createdAt || Date.now(),
      imageUrl: raw.imageUrl,
      previewUrl: raw.previewUrl || raw.thumbnailUrl,
      variantUrls: raw.variantUrls,
      prompt: raw.prompt,
      negativePrompt: raw.negativePrompt || raw.negative_prompt,
      modelId: raw.modelId,
      modelType: raw.modelType,
      seed: raw.seed,
      parameters: {
        size: params?.size || raw.params?.size || raw.aspectRatio,
        steps: params?.steps ?? raw.params?.steps ?? raw.steps,
        guidanceScale: params?.guidanceScale ?? raw.params?.guidanceScale ?? raw.cfg,
        quality: params?.quality ?? raw.params?.quality,
        style: params?.style ?? raw.params?.style,
        format: params?.format ?? raw.params?.format,
      },
      generationTime: raw.generationTime,
      revision: raw.revision || 1,
    } as GenerationDetail & { firestoreImageId?: string };
    if (raw.firestoreImageId) detail.firestoreImageId = raw.firestoreImageId;
    else if (raw.params?.firestoreImageId) detail.firestoreImageId = raw.params.firestoreImageId;
    return detail;
  }

  private assertReadableByCurrentUser(ownerId: string | undefined): void {
    const uid = auth.currentUser?.uid;
    if (!uid || !ownerId || ownerId === 'unknown' || ownerId === 'local') return;
    if (ownerId !== uid) {
      throw new PermissionError('You do not have access to this picture.');
    }
  }

  private enrichWithMetadata(generation: GenerationDetail): GenerationDetail {
    if (!generation.imageUrl) {
      throw new Error('Generation is missing an image');
    }
    return generation;
  }
}
