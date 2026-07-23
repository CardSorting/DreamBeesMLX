import { db } from "../firebaseInit.js";
import { logger } from "./utils.js";
import crypto from "crypto";

/**
 * Hashes an API Key for storage.
 * Uses SHA-256.
 */
export function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validates an API Key provided in headers.
 */
export async function validateApiKey(apiKey?: string): Promise<{ uid: string; scope: string[]; role: string } | null> {
    if (!apiKey) { return null; }

    // 1. Basic format check
    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
        logger.warn(`[Auth] Invalid API Key format.`);
        return null;
    }

    try {
        // 2. Hash the input key to find the document
        const prefix = apiKey.split('_')[1]; // live or test
        const hash = hashKey(apiKey);
        const docId = `sk_${prefix}_${hash}`;

        const keyDoc = await db.collection('api_keys').doc(docId).get();

        if (!keyDoc.exists) {
            logger.warn(`[Auth] API Key not found (Hash mismatch).`);
            return null;
        }

        const data = keyDoc.data() as any;

        if (data.status !== 'active') {
            logger.warn(`[Auth] API Key is ${data.status}.`);
            return null;
        }

        const lastUsedAt =
            typeof data.lastUsed?.toMillis === 'function'
                ? data.lastUsed.toMillis()
                : data.lastUsed
                    ? new Date(data.lastUsed).getTime()
                    : 0;

        // Update usage stats at most every 15 minutes per key.
        if (!lastUsedAt || Date.now() - lastUsedAt > 15 * 60 * 1000) {
            keyDoc.ref.update({ lastUsed: new Date() }).catch(() => { });
        }

        logger.info(`[Auth] API Key authenticated for user: ${data.uid}`);

        return {
            uid: data.uid,
            scope: data.scope || ['default'],
            role: data.role || 'api_user'
        };

    } catch (error) {
        logger.error(`[Auth] Error validating API Key:`, error);
        return null;
    }
}
