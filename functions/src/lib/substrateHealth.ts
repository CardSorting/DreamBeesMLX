import { db, FieldValue } from '../firebaseInit.js';
import { logger } from './utils.js';

/**
 * SubstrateHealth
 * 
 * Forensic circuit breaker for Zap providers.
 * High-velocity health tracking to prevent Zap leakage during outages.
 */
export class SubstrateHealth {
    private static ERROR_THRESHOLD = 5; // Fail fast after 5 consecutive errors
    private static WINDOW_MS = 5 * 60 * 1000; // 5 minute sliding window
    private static HEALTH_CACHE_MS = 10 * 1000;
    private static SUCCESS_WRITE_CACHE_MS = 60 * 1000;
    private static healthCache = new Map<string, { healthy: boolean; expiresAt: number }>();
    private static lastSuccessWriteAt = new Map<string, number>();

    /**
     * Checks if a specific model provider is healthy.
     * Uses a lightweight metadata doc to avoid full collection scans.
     */
    static async isHealthy(modelId: string): Promise<boolean> {
        try {
            const cached = this.healthCache.get(modelId);
            const now = Date.now();
            if (cached && cached.expiresAt > now) {
                return cached.healthy;
            }

            const doc = await db.collection('substrate_health').doc(modelId).get();
            if (!doc.exists) {
                this.healthCache.set(modelId, { healthy: true, expiresAt: now + this.HEALTH_CACHE_MS });
                return true;
            }

            const data = doc.data() as any;

            // If last error was too long ago, we're likely back in service
            if (data.lastErrorAt && (now - data.lastErrorAt.toMillis()) > this.WINDOW_MS) {
                this.healthCache.set(modelId, { healthy: true, expiresAt: now + this.HEALTH_CACHE_MS });
                return true;
            }

            if (data.consecutiveErrors >= this.ERROR_THRESHOLD) {
                logger.warn(`[SUBSTRATE][Health] Model ${modelId} is in circuit-break state.`);
                this.healthCache.set(modelId, { healthy: false, expiresAt: now + this.HEALTH_CACHE_MS });
                return false;
            }

            this.healthCache.set(modelId, { healthy: true, expiresAt: now + this.HEALTH_CACHE_MS });
            return true;
        } catch (e) {
            logger.error("Health Check Failed (Defaulting to Healthy)", e);
            return true;
        }
    }

    /**
     * Record a success for a model (Resets circuit breaker)
     */
    static async recordSuccess(modelId: string) {
        try {
            const now = Date.now();
            const lastWriteAt = this.lastSuccessWriteAt.get(modelId) || 0;
            if (now - lastWriteAt < this.SUCCESS_WRITE_CACHE_MS) {
                this.healthCache.set(modelId, { healthy: true, expiresAt: now + this.HEALTH_CACHE_MS });
                return;
            }

            await db.collection('substrate_health').doc(modelId).set({
                consecutiveErrors: 0,
                lastSuccessAt: new Date(),
                status: 'operational'
            }, { merge: true });
            this.lastSuccessWriteAt.set(modelId, now);
            this.healthCache.set(modelId, { healthy: true, expiresAt: now + this.HEALTH_CACHE_MS });
        } catch (e) { /* silent fail for metrics */ }
    }

    /**
     * Record a failure for a model
     */
    static async recordFailure(modelId: string, error: string) {
        try {
            await db.collection('substrate_health').doc(modelId).set({
                consecutiveErrors: FieldValue.increment(1),
                lastErrorAt: new Date(),
                lastErrorMsg: error,
                status: 'degraded'
            }, { merge: true });
            this.healthCache.delete(modelId);
            this.lastSuccessWriteAt.delete(modelId);
        } catch (e) { /* silent fail for metrics */ }
    }
}
