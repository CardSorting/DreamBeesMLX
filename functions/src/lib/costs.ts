import { logger } from './utils.js';

export const ZAP_COSTS = {
    // Generation
    IMAGE_GENERATION: 0.5,           // Standard (non-subscriber)
    IMAGE_GENERATION_TURBO: 1.0,     // Turbo Mode
    IMAGE_GENERATION_PREMIUM: 1.0    // Premium Models
} as const;

export type ZapCostKey = keyof typeof ZAP_COSTS;

/**
 * CostManager
 * Standardized hardcoded pricing for maximum determinism and zero-latency.
 */
export const CostManager = {
    /**
     * Get the cost for a specific key.
     */
    async get(key: ZapCostKey | string): Promise<number> {
        const defaultCost = (ZAP_COSTS as any)[key];
        if (defaultCost === undefined) {
            logger.warn(`[CostManager] Unknown cost key: ${key}, defaulting to 0`);
            return 0;
        }
        return defaultCost;
    }
};
