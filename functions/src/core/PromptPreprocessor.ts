/**
 * Core Service: Prompt Preprocessor
 * Orchestrates prompt sanitization and model-specific adjustments
 * Pure orchestration logic
 */

import { ImageGenerationRequest } from '../domain/models/ImageGenerationRequest.js';
import { MODEL_GENERATION_PARAMS } from '../lib/modelConventions.js';

export class PromptPreprocessor {
  /**
   * Preprocess a raw request into a domain-ready format
   */
  static preprocess(
    request: any,
    isPremiumUser: boolean
  ): {
    sanitizedRequest: ImageGenerationRequest;
    qualityTagsApplied: boolean;
  } {
    // 1. Create domain request (handles validation and basic sanitization)
    const domainRequest = ImageGenerationRequest.create(request);
    
    // 2. Apply model-specific quality tags
    const originalPrompt = domainRequest.prompt;
    const processedPrompt = this.applyModelQualityTags(
      originalPrompt,
      domainRequest.modelId
    );
    
    const qualityTagsApplied = processedPrompt !== originalPrompt;
    
    // 3. Re-wrap in domain model with processed prompt
    // Use the constructor to maintain domain integrity
    const processedRequest = new ImageGenerationRequest(
      domainRequest.initiatorUid,
      domainRequest.requestorUid,
      processedPrompt,
      domainRequest.negativePrompt,
      domainRequest.modelId,
      domainRequest.aspectRatio,
      domainRequest.steps,
      domainRequest.cfg,
      domainRequest.seed,
      domainRequest.scheduler,
      domainRequest.idempotencyKey,
      domainRequest.targetUserId
    );
    
    return {
      sanitizedRequest: processedRequest,
      qualityTagsApplied
    };
  }

  /**
   * Internal: Apply model-specific quality tags from conventions
   */
  private static applyModelQualityTags(prompt: string, modelId: string): string {
    const config = (MODEL_GENERATION_PARAMS as any)[modelId];
    if (config?.qualityTags) {
        const tags = config.qualityTags;
        const normalizedPrompt = prompt.toLowerCase();
        
        // Check if tags (or key part of them) already exist to avoid duplication
        if (!normalizedPrompt.includes('3d render') && modelId === 'nova-3d-cg-xl') {
            return prompt + tags;
        }
    }
    return prompt;
  }

  /**
   * Validate prompt is safe for AI generation
   */
  static isPromptSafe(prompt: string): boolean {
    if (!prompt || prompt.length < 5) return false;
    if (prompt.length > 10000) return false;
    
    // Basic safety check for injection patterns
    const forbidden = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /eval\(/i
    ];
    
    return !forbidden.some(pattern => pattern.test(prompt));
  }

  /**
   * Calculate prompt complexity score for abuse detection
   */
  static calculatePromptComplexity(prompt: string): number {
    let score = 0;
    const clean = prompt.trim();
    
    if (clean.length > 100) score += 20;
    if (clean.length > 500) score += 30;
    
    const artisticKeywords = [
      'cinematic', 'photorealistic', 'artstation', 'masterpiece',
      'ultra detailed', '8k', 'ray tracing'
    ];
    
    artisticKeywords.forEach(keyword => {
      if (clean.toLowerCase().includes(keyword)) {
        score += 15;
      }
    });
    
    return Math.min(score, 100);
  }
}