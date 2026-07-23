import { HttpsError } from "firebase-functions/v2/https";
import { generationQueueCollection } from "../generation/queue-repository.js";
import { db } from "../firebaseInit.js";
import { logger } from "../lib/utils.js";
import { hashKey } from "../lib/apiKey.js";
import crypto from "crypto";
import { RequestWithAuth } from "../types/functions.js";

/**
 * Handle Create API Key request
 */
export const handleCreateApiKey = async (request: RequestWithAuth<{ name?: string, scope?: string[] }>) => {
    const { name, scope } = request.data;
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Login required'); }

    const randomBytes = crypto.randomBytes(24).toString('hex');
    const prefix = 'sk_live_';
    const rawKey = `${prefix}${randomBytes}`;

    const hash = hashKey(rawKey);
    const docId = `sk_live_${hash}`;

    const newKeyData = {
        uid: request.auth.uid,
        name: name || "Unnamed Key",
        prefix: prefix,
        lastChars: rawKey.slice(-4),
        scope: scope || ['default'],
        createdAt: new Date(),
        status: 'active',
        lastUsed: null
    };

    await db.collection('api_keys').doc(docId).set(newKeyData);

    logger.info(`[Auth] Generated new API Key for ${request.auth.uid}: ${name}`);

    return {
        success: true,
        key: rawKey,
        meta: newKeyData
    };
};

/**
 * Handle List API Keys request
 */
export const handleListApiKeys = async (request: RequestWithAuth<any>) => {
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Login required'); }

    const snapshot = await db.collection('api_keys')
        .where('uid', '==', request.auth.uid)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .get();

    const keys = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            name: d.name,
            prefix: d.prefix,
            lastChars: d.lastChars,
            createdAt: d.createdAt,
            lastUsed: d.lastUsed,
            scope: d.scope
        };
    });

    return { keys };
};

/**
 * Handle Revoke API Key request
 */
export const handleRevokeApiKey = async (request: RequestWithAuth<{ keyId: string }>) => {
    const { keyId } = request.data;
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Login required'); }

    const keyRef = db.collection('api_keys').doc(keyId);
    const doc = await keyRef.get();

    if (!doc.exists) {
        throw new HttpsError('not-found', 'Key not found');
    }

    const data = doc.data();
    if (data?.uid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Not your key');
    }

    await keyRef.update({ status: 'revoked', revokedAt: new Date() });

    logger.info(`[Auth] Revoked API Key ${keyId} for user ${request.auth.uid}`);

    return { success: true };
};

/**
 * CLI Handshake: Initialize a pairing session
 */
export const handleInitCliHandshake = async (request: RequestWithAuth<any>) => {
    // Pairing ID is public, but let's make it friendly
    const pairingId = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"

    await db.collection('cli_handshakes').doc(pairingId).set({
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minute expiry
    });

    return { pairingId };
};

/**
 * CLI Handshake: Poll for completion
 */
export const handlePollCliHandshake = async (request: RequestWithAuth<{ pairingId: string }>) => {
    const { pairingId } = request.data;
    if (!pairingId) throw new HttpsError('invalid-argument', 'Missing pairingId');

    const snap = await db.collection('cli_handshakes').doc(pairingId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Pairing session not found or expired');

    const data = snap.data();
    if (data?.status === 'complete') {
        // Return the key ONLY once, then delete or mark as used
        const key = data.apiKey;
        await db.collection('cli_handshakes').doc(pairingId).delete();
        return { status: 'complete', apiKey: key };
    }

    if (data?.expiresAt.toDate() < new Date()) {
        await db.collection('cli_handshakes').doc(pairingId).delete();
        return { status: 'expired' };
    }

    return { status: 'pending' };
};

/**
 * Web Handshake: Complete authorization
 */
export const handleCompleteCliHandshake = async (request: RequestWithAuth<{ pairingId: string, name?: string }>) => {
    const { pairingId, name } = request.data;
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');
    if (!pairingId) throw new HttpsError('invalid-argument', 'Missing pairingId');

    const handshakeRef = db.collection('cli_handshakes').doc(pairingId);
    const snap = await handshakeRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Pairing session not found or expired');

    const handshakeData = snap.data();
    if (handshakeData?.status !== 'pending') {
        throw new HttpsError('failed-precondition', 'Handshake already completed or expired');
    }

    // Generate a real API key for this user
    const apiKeyResult = await handleCreateApiKey({
        ...request,
        data: { name: name || "Marie CLI Handshake", scope: ['default'] }
    });

    await handshakeRef.update({
        status: 'complete',
        uid: request.auth.uid,
        apiKey: apiKeyResult.key,
        completedAt: new Date()
    });

    return { success: true };
};

/**
 * Get API Usage Stats for Developer Dashboard
 */
export const handleGetApiUsageStats = async (request: RequestWithAuth<any>) => {
    if (!request.auth) { throw new HttpsError('unauthenticated', 'Login required'); }
    const uid = request.auth.uid;

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const snapshot = await generationQueueCollection()
            .where('userId', '==', uid)
            .where('isApiKeyRequest', '==', true)
            .where('createdAt', '>=', thirtyDaysAgo)
            .get();

        let totalRequests = 0;
        let totalCost = 0;
        const modelCounts: Record<string, number> = {};
        const dailyCounts: Record<string, number> = {};

        // Pre-fill last 7 days for dailyCounts
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dailyCounts[dateStr] = 0;
        }

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            totalRequests++;
            totalCost += data.cost || 0;

            const modelId = data.modelId || 'unknown';
            modelCounts[modelId] = (modelCounts[modelId] || 0) + 1;

            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                // Only count if it's in our dailyCounts keys
                if (dateStr in dailyCounts) {
                    dailyCounts[dateStr]++;
                }
            }
        });

        // Convert dailyCounts to ordered array
        const chartData = Object.entries(dailyCounts).map(([date, count]) => ({
            date,
            count
        }));

        return {
            success: true,
            stats: {
                totalRequests,
                totalCost: parseFloat(totalCost.toFixed(2)),
                modelBreakdown: modelCounts,
                chartData
            }
        };
    } catch (err: any) {
        logger.error(`[Developer] Error getting API Usage Stats:`, err);
        throw new HttpsError('internal', err.message || 'Failed to retrieve API statistics');
    }
};
