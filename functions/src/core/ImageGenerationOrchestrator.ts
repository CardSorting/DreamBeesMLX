/**
 * Core Service: Image Generation Orchestrator
 * Main coordination layer for image generation flow
 * Orchestrates Domain → Infrastructure components
 */

import { ImageGenerationRequest } from '../domain/models/ImageGenerationRequest.js';
import { PromptPreprocessor } from './PromptPreprocessor.js';
import { CostOrchestrator, CostValidationResult } from './CostOrchestrator.js';
import { MODEL_CATEGORIES } from '../lib/modelConventions.js';
import { ForensicLogger } from '../lib/forensics.js';
import { logger } from '../lib/utils.js';
import { SubstrateHealth } from '../lib/substrateHealth.js';
import { Wallet } from '../lib/wallet.js';
import { FieldValue } from '../firebaseInit.js';
import {
  buildRequestId,
  buildZapRequestId,
  isActiveJobStatus
} from '../generation/contract.js';
import { generationQueueDoc } from '../generation/queue-repository.js';
import { buildQueuedGenerationDocument } from '../generation/queue-document.js';

export interface GenerationResult {
  requestId: string;
  shouldEnqueue?: boolean;
}

export interface GenerationError {
  requestId: string;
  error: string;
  status: 'failed' | 'error';
}

export class ImageGenerationOrchestrator {
  /**
   * Handle a generation request end-to-end
   * This is the main orchestration point
   */
  static async handleRequest(
    request: any,
    database: any
  ): Promise<GenerationResult | GenerationError> {
    const startTime = Date.now();
    
    // 1. Identify Anchor (requestId or idempotencyKey)
    const requestId = request.idempotencyKey
        ? buildZapRequestId(request.idempotencyKey)
        : (request.requestId || buildRequestId());

    const forensic = new ForensicLogger({
        requestId,
        workerName: 'Orchestrator',
        taskType: 'submission',
        userId: request.auth?.uid || 'anonymous',
        startTime
    });

    forensic.checkpoint('submission_start');

    return this.executeWithIdempotency(requestId, async () => {
      const uid = request.auth?.uid;
      const isApiKeyRequest = request.auth?.token?.role === 'api_user';
      let userData = request.cachedUserData;
      if (!userData) {
        const userDoc = await database.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new Error('User document not found. Please re-authenticate.');
        }
        userData = userDoc.data();
      }

      const userTier = userData.tier || 'free';
      const isPremiumUser = userTier === 'pro' || userTier === 'architect';

      // 2. Preprocess request
      const { sanitizedRequest } = PromptPreprocessor.preprocess(request, isPremiumUser);

      const isHealthy = await SubstrateHealth.isHealthy(sanitizedRequest.modelId);

      if (!isHealthy) {
          forensic.checkpoint('circuit_break_triggered');
          throw new Error(`Provider for ${sanitizedRequest.modelId} is currently degraded. Please try again in a few minutes.`);
      }

      // 3. Validate and calculate cost (Pass userData to avoid re-fetch)
      const validationResult = await CostOrchestrator.validateGenerationCost(
        sanitizedRequest.initiatorUid,
        sanitizedRequest.modelId,
        sanitizedRequest.aspectRatio,
        isPremiumUser,
        database,
        userData, // PASSING ALREADY FETCHED DATA
        isApiKeyRequest
      );

      if (!validationResult.allowed) {
        throw new Error(validationResult.reason || 'Insufficient funds or limit exceeded');
      }

      const finalCost = validationResult.estimatedCost;

      forensic.checkpoint('transaction_prepared');

      // 6. ATOMIC SUBMISSION: Transactional Debit + Queue Document + Daily Usage updates
      let shouldEnqueue = true;
      await database.runTransaction(async (t: any) => {
          const queueRef = generationQueueDoc(requestId);
          const existing = await t.get(queueRef);
          if (existing.exists) {
            const st = (existing.data() as any)?.status;
            if (isActiveJobStatus(st)) {
              shouldEnqueue = false;
              forensic.checkpoint('idempotent_hit');
              return;
            }
          }

          // A. Debit Wallet
          if (finalCost > 0) {
            await Wallet.debit(
                sanitizedRequest.initiatorUid,
                finalCost,
                requestId,
                { auditType: 'zap_generation', modelId: sanitizedRequest.modelId },
                'zaps',
                t,
                true // TURBO MODE: Direct metabolic increment
            );
          }

          // B. Create Queue Entry
          await this.queueRequestInTransaction(
              sanitizedRequest,
              requestId,
              finalCost,
              t,
              database,
              isApiKeyRequest
          );

          // C. Update Daily Usage Counters for fair use & free limits (Skip for API Key requests)
          const userRef = database.collection('users').doc(sanitizedRequest.initiatorUid);
          const updates: any = {};

          if (!isApiKeyRequest) {
              const nowDate = new Date();
              const todayStr = `${nowDate.getUTCFullYear()}-${(nowDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${nowDate.getUTCDate().toString().padStart(2, '0')}`;

              if (sanitizedRequest.modelId === 'flux-2-klein-9b') {
                  const lastRefreshedAt = userData.fluxKleinLastRefreshedAt?.toMillis
                      ? userData.fluxKleinLastRefreshedAt.toMillis()
                      : (userData.fluxKleinLastRefreshedAt || 0);
                  const now = Date.now();
                  const FIVE_HOURS = 5 * 60 * 60 * 1000;

                  if (now - lastRefreshedAt >= FIVE_HOURS) {
                      updates.fluxKleinCount = 1;
                      updates.fluxKleinLastRefreshedAt = FieldValue.serverTimestamp();
                  } else {
                      updates.fluxKleinCount = FieldValue.increment(1);
                      if (!userData.fluxKleinLastRefreshedAt) {
                          updates.fluxKleinLastRefreshedAt = FieldValue.serverTimestamp();
                      }
                  }
              } else {
                  const isFastOrStandard = MODEL_CATEGORIES.FAST.includes(sanitizedRequest.modelId as any) || MODEL_CATEGORIES.STANDARD.includes(sanitizedRequest.modelId as any);
                  if (isFastOrStandard) {
                      if (userData.stdFastDate === todayStr) {
                          updates.stdFastCount = FieldValue.increment(1);
                      } else {
                          updates.stdFastCount = 1;
                          updates.stdFastDate = todayStr;
                      }
                  }
              }
          }

          // Protect purchased Zaps balance
          const balance = userData.zaps || 0;
          if (typeof balance === 'number' && finalCost > 0) {
              const newBalance = Math.max(0, balance - finalCost);
              if (userData.purchasedZaps !== undefined) {
                  updates.purchasedZaps = Math.min(userData.purchasedZaps, newBalance);
              }
          }

          if (Object.keys(updates).length > 0) {
              t.update(userRef, updates);
          }
      });

      // 7. Background Auto-Replenishment trigger (does not block client response)
      if (shouldEnqueue && finalCost > 0) {
          const balance = userData.zaps || 0;
          if (typeof balance === 'number') {
              const newBalance = Math.max(0, balance - finalCost);
              import('./AutoReplenishService.js').then(({ AutoReplenishService }) => {
                  AutoReplenishService.replenishIfNeeded(sanitizedRequest.initiatorUid, newBalance).catch((err) => {
                      logger.error("[Orchestrator] Auto-replenish background trigger failed", err);
                  });
              }).catch((importErr) => {
                  logger.error("[Orchestrator] Failed to import AutoReplenishService", importErr);
              });
          }
      }

      forensic.checkpoint('submission_complete');

      return {
        requestId,
        shouldEnqueue
      };
    });
  }

  /**
   * Execute operation with idempotency check
   */
  private static async executeWithIdempotency(
    requestId: string,
    operation: () => Promise<GenerationResult | GenerationError>
  ): Promise<GenerationResult | GenerationError> {
    try {
      const result = await operation();
      if (!result) {
        throw new Error('Operation completed with no result');
      }

      return result;
    } catch (error: any) {
      console.error(`[Orchestrator] Error in requestId ${requestId}:`, error);
      return {
        requestId,
        error: error.message || 'Unknown error',
        status: 'failed'
      };
    }
  }

  /**
   * Queue request for generation (Transactional Version)
   */
  private static async queueRequestInTransaction(
    request: ImageGenerationRequest,
    requestId: string,
    cost: number,
    t: any,
    database: any,
    isApiKeyRequest: boolean = false
  ): Promise<void> {
    const safeParams = request.getSafeParameters();

    const ref = generationQueueDoc(requestId);
    t.set(ref, buildQueuedGenerationDocument({
      userId: request.requestorUid,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      modelId: request.modelId,
      aspectRatio: safeParams.aspectRatio,
      steps: safeParams.steps,
      cfg: safeParams.cfg,
      seed: request.seed,
      scheduler: request.scheduler,
      cost,
      debited: true,
      isApiKeyRequest
    }));
  }
}
