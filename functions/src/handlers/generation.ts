import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../firebaseInit.js";
import { handleError, logger } from "../lib/utils.js";
import { RequestWithAuth } from "../types/functions.js";
import { enqueueImageGenerationTaskWithRetry } from "../generation/enqueue.js";
// Core orchestration layer
import { ImageGenerationOrchestrator, GenerationResult, GenerationError } from "../core/ImageGenerationOrchestrator.js";

/**
 * HANDLER: Create Generation Request (Infrastructure Layer)
 * 
 * This handler provides Firebase-specific concerns and coordination:
 * - Auth/AuthN/AuthZ
 * - Task queue submission
 * - Error handling
 * 
 * BUSINESS LOGIC delegated to ImageGenerationOrchestrator (Core Layer)
 */
export const handleCreateGenerationRequest = async (request: RequestWithAuth<any>) => {
  // 1. Firebase-specific validation
  if (!process.env.FUNCTIONS_EMULATOR && (request as any).app === undefined) {
    logger.warn("App Check verification failed (Warn Mode)");
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', "User must be authenticated");
  }

  const uid = request.auth.uid;
  const initiatorUid = uid; // Track initiator for security

  // Allow system/admin to submit on behalf of specific user
  const data = request.data;
  const callerRole = (request.auth as any).token?.role || 'user';
  const finalUid = (['admin', 'system'].includes(callerRole) && data.targetUserId) ? data.targetUserId : uid;

  if (!finalUid) {
    throw new HttpsError('unauthenticated', "User must be authenticated");
  }

  // 2. Add Firebase-specific context to request
  const firebaseContext = {
    ...data,
    idempotencyKey: data.idempotencyKey || null,
    cachedUserData: (request as any).cachedUserData || null,
    auth: {
      uid: initiatorUid,
      token: { role: callerRole }
    }
  };

  try {
    // 3. Delegate to Core orchestrator for business logic
    const result: GenerationResult | GenerationError = await ImageGenerationOrchestrator.handleRequest(
      firebaseContext,
      db
    );

    // Check if orchestrator returned an error (properly typed check)
    const errorResult = result as GenerationError;
    if (errorResult.status) {
      const msg = errorResult.error || 'Generation failed';
      if (/insufficient|funds|zaps|exhausted|limit exceeded/i.test(msg)) {
        throw new HttpsError('failed-precondition', msg);
      }
      if (/degraded|unavailable|too many active/i.test(msg)) {
        throw new HttpsError('resource-exhausted', msg);
      }
      throw new HttpsError('internal', msg);
    }

    // 4. Return Firebase-specific response (result is guaranteed to be GenerationResult here - type guard passed)
    const generatedResult = result as GenerationResult;
    const requestId = generatedResult.requestId;

    if (generatedResult.shouldEnqueue !== false) {
      enqueueImageGenerationTaskWithRetry(requestId, firebaseContext, finalUid).catch((enqueueErr) => {
        logger.error(`[Generation Handler] Enqueue failed for ${requestId}`, enqueueErr);
      });
    }

    return {
      requestId
    };
  } catch (error: any) {
    logger.error(`[Generation Handler] Error for user ${uid}:`, error);
    throw handleError(error, { uid, modelId: data.modelId });
  }
};
