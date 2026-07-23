/**
 * Core Service: Cost Orchestrator
 * Orchestrates cost validation and calculation
 * 
 * HARDENED: Zero-latency via flattened User document usage tracking.
 * ALIGNED: Uses ZAP_COSTS from lib/costs.ts exclusively.
 */

import { MODEL_CATEGORIES, MODEL_COSTS } from '../lib/modelConventions.js';

export interface CostValidationResult {
  allowed: boolean;
  estimatedCost: number;
  reason?: string;
}

export class CostOrchestrator {
  /**
   * Calculate final generation cost based on model and user status
   */
  static calculateFinalCost(
    modelId: string,
    isPremiumUser: boolean,
    aspectRatio: string,
    userData?: any,
    isApiKeyRequest: boolean = false
  ): number {
    const now = new Date();
    const todayStr = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}-${now.getUTCDate().toString().padStart(2, '0')}`;

    const userTier = userData?.tier || 'free';

    // 1. Handle Flux 2 Klein 9B model (free but not unlimited, drips/refreshes every 5 hours)
    if (modelId === 'flux-2-klein-9b') {
        const lastRefreshedAt = userData?.fluxKleinLastRefreshedAt?.toMillis
            ? userData.fluxKleinLastRefreshedAt.toMillis()
            : (userData?.fluxKleinLastRefreshedAt || 0);
        
        const now = Date.now();
        const FIVE_HOURS = 5 * 60 * 60 * 1000;
        
        let currentWindowCount = userData?.fluxKleinCount || 0;
        if (now - lastRefreshedAt >= FIVE_HOURS) {
            currentWindowCount = 0;
        }
        
        let freeLimit = 5; // Default Free tier limit
        let overageCost: number = MODEL_COSTS.FAST; // 0.5 zaps (Fast tier)
        
        if (userTier === 'architect') {
            freeLimit = 50;
            overageCost = 0.05;
        } else if (userTier === 'pro') {
            freeLimit = 15;
            overageCost = 0.1;
        }

        // B2B API Key requests always pay the flat developer rate with zero daily caps
        if (isApiKeyRequest) {
            return overageCost;
        }

        if (currentWindowCount < freeLimit) {
            return 0;
        }
        return overageCost;
    }

    // 3. PREMIUM tier (wai-illustrious, nova-3d-cg-xl) runs on A100
    if (MODEL_CATEGORIES.PREMIUM.includes(modelId as any)) {
        if (userTier === 'architect') return 0.4; // 60% discount
        if (userTier === 'pro') return 0.75; // 25% discount
        return MODEL_COSTS.PREMIUM; // 1.0 zaps
    }

    // 4. FAST and STANDARD tiers
    if (isPremiumUser) {
        const fairUseLimit = userTier === 'architect' ? 300 : 100;
        const overageCost = userTier === 'architect' ? 0.05 : 0.1;

        // B2B API Key requests always pay the flat developer rate with zero daily caps
        if (isApiKeyRequest) {
            return overageCost;
        }

        // Enforce daily fair-use cap of standard/fast generations
        const stdFastDate = userData?.stdFastDate;
        const stdFastCount = userData?.stdFastCount || 0;
        const currentTodayCount = (stdFastDate === todayStr) ? stdFastCount : 0;

        if (currentTodayCount < fairUseLimit) {
            return 0; // Free under fair use daily cap
        }
        return overageCost;
    }

    if (MODEL_CATEGORIES.FAST.includes(modelId as any)) {
        return MODEL_COSTS.FAST;
    }

    return MODEL_COSTS.STANDARD;
  }

  /**
   * Validate if user has sufficient cost budget for generation
   */
  static async validateGenerationCost(
    initiatorUid: string,
    modelId: string,
    aspectRatio: string,
    isPremiumUser: boolean,
    database: any,
    cachedUserData?: any, // Optional pre-loaded data
    isApiKeyRequest: boolean = false
  ): Promise<CostValidationResult> {
    // 1. Doc lookup: Use cache or fetch first
    let userData = cachedUserData;
    if (!userData) {
      const userDoc = await database.collection('users').doc(initiatorUid).get();
      if (!userDoc.exists) {
        return { allowed: false, estimatedCost: 0.25, reason: 'User not found' };
      }
      userData = userDoc.data();
    }

    // 2. Calculate final cost using userData
    const finalCost = this.calculateFinalCost(modelId, isPremiumUser, aspectRatio, userData, isApiKeyRequest);

    const balance = userData.zaps || 0;

    // A. Check balance (Subscribers have 'unlimited' zaps which bypasses the comparison)
    if (balance !== 'unlimited' && balance < finalCost) {
      const balanceStr = typeof balance === 'number' ? balance.toFixed(2) : String(balance);
      return {
        allowed: false,
        estimatedCost: finalCost,
        reason: `Insufficient balance. Available: ${balanceStr}, Required: ${finalCost.toFixed(2)}`
      };
    }

    return { allowed: true, estimatedCost: finalCost };
  }
}
