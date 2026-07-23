import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "./utils.js";

/**
 * Checks if a user or IP has exceeded a rate limit.
 * Uses a Fixed Window counter strategy in Firestore.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number, turbo: boolean = true): Promise<void> {
    const db = getFirestore();
    const docId = `ratelimit_${key.replace(/[:.]/g, '_')}`;
    const docRef = db.collection('rate_limits').doc(docId);
    const now = Date.now();
    const windowMillis = windowSeconds * 1000;

    // TURBO MODE: Direct increment (Zero contention, much faster)
    if (turbo) {
        const snap = await docRef.get();
        const data = snap.data() || {};
        const count = data.count || 0;
        const resetTime = data.resetTime || 0;

        if (now > resetTime) {
            await docRef.set({ count: 1, resetTime: now + windowMillis, lastUpdated: FieldValue.serverTimestamp() });
            return;
        }

        if (count >= limit) {
            throw new HttpsError('resource-exhausted', `Rate limit exceeded. Try again later.`);
        }

        await docRef.update({ count: FieldValue.increment(1), lastUpdated: FieldValue.serverTimestamp() });
        return;
    }

    // TRANSACTIONAL MODE (Original)
    await db.runTransaction(async (t) => {
        const doc = await t.get(docRef);
        const data = doc.data() || {};
        let count = data.count || 0;
        let resetTime = data.resetTime || 0;

        if (now > resetTime) {
            count = 1;
            resetTime = now + windowMillis;
        } else {
            count++;
        }

        if (count > limit) {
            throw new HttpsError('resource-exhausted', `Rate limit exceeded. Try again later.`);
        }

        t.set(docRef, { count, resetTime, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });
    });
}

/**
 * Checks if an IP is in the global blocklist or temporary throttle list.
 */
export async function checkIpThrottle(ip?: string): Promise<void> {
    if (!ip) { return; }

    const db = getFirestore();
    const cleanIp = ip.replace(/[:.]/g, '_');

    const ipRef = db.collection('abuse_ip_blacklist').doc(cleanIp);
    const rateRef = db.collection('rate_limits').doc(`ratelimit_global_ip_${cleanIp}`);
    const now = Date.now();
    const windowMillis = 60 * 1000;
    const [ipDoc, rateDoc] = await db.getAll(ipRef, rateRef);

    if (ipDoc.exists) {
        const data = ipDoc.data();
        if (data?.blocked) {
            throw new HttpsError('permission-denied', "Access denied from this network.");
        }
    }

    // Global IP Rate Limit (e.g., 60 req/min/IP)
    const rateData = rateDoc.data() || {};
    const count = rateData.count || 0;
    const resetTime = rateData.resetTime || 0;

    if (now > resetTime) {
        await rateRef.set({ count: 1, resetTime: now + windowMillis, lastUpdated: FieldValue.serverTimestamp() });
        return;
    }

    if (count >= 60) {
        throw new HttpsError('resource-exhausted', `Rate limit exceeded. Try again later.`);
    }

    await rateRef.update({ count: FieldValue.increment(1), lastUpdated: FieldValue.serverTimestamp() });
}

/**
 * Checks user-specific restrictions (shadow bans, account locks).
 */
export async function checkUserAbuseStatus(uid?: string, cachedUserData?: any): Promise<void> {
    if (!uid) { return; }

    let userData = cachedUserData;
    if (!userData) {
        const db = getFirestore();
        const userSnap = await db.collection('users').doc(uid).get();
        if (!userSnap.exists) { return; }
        userData = userSnap.data();
    }

    if (userData.isBanned) {
        throw new HttpsError('permission-denied', "Account suspended.");
    }

    if (userData.shadowBanned) {
        const randomDelay = Math.floor(Math.random() * 2000) + 1000; 
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        if (Math.random() > 0.8) {
            throw new HttpsError('unavailable', "System overload, please try again.");
        }
    }
}

/**
 * Returns the rate limit config for a specific action
 */
export function getActionLimits(action: string, isPremium: boolean): { limit: number; window: number } {
    const limits = { limit: 20, window: 60 };

    switch (action) {
        case 'createGenerationRequest':
            limits.limit = isPremium ? 10 : 3;
            limits.window = 60;
            break;

        case 'transformImage':
            limits.limit = isPremium ? 12 : 5;
            limits.window = 60;
            break;

        case 'getGenerationHistory':
        case 'getUserImages':
            limits.limit = 60;
            limits.window = 60;
            break;

        default:
            break;
    }

    return limits;
}

/**
 * Checks if user has exceeded their daily quota.
 */
export async function checkUserQuota(uid: string, action: string): Promise<void> {
    if (!uid) { return; }

    let dailyLimit = 100;
    const isHighCost = false;

    if (isHighCost) {
        dailyLimit = 20;
    }

    try {
        await checkRateLimit(`quota:${uid}:${action}`, dailyLimit, 86400);
    } catch (e: any) {
        if (e.code === 'resource-exhausted') {
            throw new HttpsError('resource-exhausted', `Daily limit reached for ${action}. Please try again tomorrow or upgrade.`);
        }
        throw e;
    }
}

/**
 * Checks the user's abuse score.
 */
export async function checkAbuseScore(uid: string): Promise<void> {
    if (!uid) { return; }
    const db = getFirestore();
    const scoreRef = db.collection('abuse_scores').doc(uid);
    const scoreDoc = await scoreRef.get();

    if (scoreDoc.exists) {
        const data = scoreDoc.data();
        if (data && data.score < 0) {
            if (data.score < -50) {
                throw new HttpsError('permission-denied', "Account restricted due to low trust score.");
            }
        }
    }
}

/**
 * Token Bucket Rate Limiter
 */
export async function checkTokenBucket(key: string, cost: number, capacity: number, refillRate: number): Promise<void> {
    const db = getFirestore();
    const docRef = db.collection('rate_limits').doc(`token_bucket_${key.replace(/[:.]/g, '_')}`);
    const now = Date.now();

    await db.runTransaction(async (t) => {
        const doc = await t.get(docRef);
        const data = doc.data() || {};

        let tokens = data.tokens !== undefined ? data.tokens : capacity;
        const lastRefill = data.lastRefill || now;

        const delta = (now - lastRefill) / 1000;
        const tokensToAdd = delta * refillRate;

        tokens = Math.min(capacity, tokens + tokensToAdd);

        if (tokens < cost) {
            throw new HttpsError('resource-exhausted', "Rate limit exceeded. Please wait.");
        }

        t.set(docRef, {
            tokens: tokens - cost,
            lastRefill: now,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

/**
 * Combined per-user request guards:
 * - abuse score
 * - short-window token bucket
 * - daily action quota
 *
 * Keeping these in one transaction cuts separate Firestore roundtrips while
 * preserving atomic limiter updates.
 */
export async function checkUserRequestGuards(
    uid: string,
    action: string,
    cost: number = 1,
    capacity: number = 10,
    refillRate: number = 0.5,
    createUserData?: Record<string, any>,
    ip?: string
): Promise<Record<string, any> | null> {
    if (!uid) { return null; }

    const db = getFirestore();
    const now = Date.now();
    const cleanIp = ip?.replace(/[:.]/g, '_');
    const userRef = db.collection('users').doc(uid);
    const scoreRef = db.collection('abuse_scores').doc(uid);
    const ipRef = cleanIp ? db.collection('abuse_ip_blacklist').doc(cleanIp) : null;
    const ipRateRef = cleanIp ? db.collection('rate_limits').doc(`ratelimit_global_ip_${cleanIp}`) : null;
    const bucketKey = `tb:${uid}:${action}`.replace(/[:.]/g, '_');
    const bucketRef = db.collection('rate_limits').doc(`token_bucket_${bucketKey}`);
    const quotaKey = `quota:${uid}:${action}`.replace(/[:.]/g, '_');
    const quotaRef = db.collection('rate_limits').doc(`ratelimit_${quotaKey}`);
    const ipWindowMillis = 60 * 1000;
    const quotaWindowMillis = 86400 * 1000;
 
    const userData = await db.runTransaction(async (t) => {
        const [userDoc, scoreDoc, ipDoc, ipRateDoc, bucketDoc, quotaDoc] = await Promise.all([
            t.get(userRef),
            t.get(scoreRef),
            ipRef ? t.get(ipRef) : Promise.resolve(null),
            ipRateRef ? t.get(ipRateRef) : Promise.resolve(null),
            t.get(bucketRef),
            t.get(quotaRef)
        ]);
 
        const resolvedUserData = userDoc.exists ? userDoc.data() || {} : createUserData || null;
        if (!resolvedUserData) {
            throw new HttpsError('not-found', 'User not found.');
        }

        const tier = resolvedUserData.tier || 'free';
        let dailyLimit = 500;
        
        if (action === 'createGenerationRequest') {
            if (tier === 'pro') {
                dailyLimit = 1000;
            } else if (tier === 'architect') {
                dailyLimit = 5000;
            } else {
                dailyLimit = 10; // Free user daily limit: 10 generations
            }
        } else {
            if (tier === 'pro') {
                dailyLimit = 5000;
            } else if (tier === 'architect') {
                dailyLimit = 10000;
            }
        }
 
        if (!userDoc.exists && createUserData) {
            t.set(userRef, createUserData);
        }

        if (resolvedUserData.isBanned) {
            throw new HttpsError('permission-denied', "Account suspended.");
        }

        if (ipDoc?.exists && ipDoc.data()?.blocked) {
            throw new HttpsError('permission-denied', "Access denied from this network.");
        }

        if (scoreDoc.exists) {
            const scoreData = scoreDoc.data();
            if (scoreData && scoreData.score < -50) {
                throw new HttpsError('permission-denied', "Account restricted due to low trust score.");
            }
        }

        if (ipRateRef) {
            const ipRateData = ipRateDoc?.data() || {};
            const ipCount = ipRateData.count || 0;
            const ipResetTime = ipRateData.resetTime || 0;

            if (now <= ipResetTime && ipCount >= 60) {
                throw new HttpsError('resource-exhausted', `Rate limit exceeded. Try again later.`);
            }

            t.set(ipRateRef, {
                count: now > ipResetTime ? 1 : ipCount + 1,
                resetTime: now > ipResetTime ? now + ipWindowMillis : ipResetTime,
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });
        }

        const bucketData = bucketDoc.data() || {};
        let tokens = bucketData.tokens !== undefined ? bucketData.tokens : capacity;
        const lastRefill = bucketData.lastRefill || now;
        const delta = (now - lastRefill) / 1000;
        tokens = Math.min(capacity, tokens + delta * refillRate);

        if (tokens < cost) {
            throw new HttpsError('resource-exhausted', "Rate limit exceeded. Please wait.");
        }

        const quotaData = quotaDoc.data() || {};
        const quotaCount = quotaData.count || 0;
        const resetTime = quotaData.resetTime || 0;
        const nextQuota = now > resetTime ? 1 : quotaCount + 1;

        if (now <= resetTime && quotaCount >= dailyLimit) {
            throw new HttpsError('resource-exhausted', `Daily limit reached for ${action}. Please try again tomorrow or upgrade.`);
        }

        t.set(bucketRef, {
            tokens: tokens - cost,
            lastRefill: now,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        t.set(quotaRef, {
            count: nextQuota,
            resetTime: now > resetTime ? now + quotaWindowMillis : resetTime,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        return resolvedUserData;
    });

    if (userData?.shadowBanned) {
        const randomDelay = Math.floor(Math.random() * 2000) + 1000;
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        if (Math.random() > 0.8) {
            throw new HttpsError('unavailable', "System overload, please try again.");
        }
    }

    return userData;
}

/**
 * Records a violation (e.g. rate limit hit)
 */
export async function recordViolation(uid: string, type: string): Promise<void> {
    if (!uid) { return; }
    const db = getFirestore();
    await db.collection('abuse_logs').add({
        userId: uid,
        type: type,
        timestamp: FieldValue.serverTimestamp()
    });
}

/**
 * Checks and increments a cumulative limit (e.g. for cost tracking).
 */
export async function checkCumulativeLimit(key: string, increment: number, limit: number, windowSeconds: number): Promise<void> {
    const db = getFirestore();
    const docId = `cumulative_${key.replace(/[:.]/g, '_')}`;
    const docRef = db.collection('rate_limits').doc(docId);

    await db.runTransaction(async (t) => {
        const doc = await t.get(docRef);
        const data = doc.data() || {};

        const currentTotal = data.total || 0;

        if (currentTotal + increment > limit) {
            throw new HttpsError('resource-exhausted', `Daily limit reached for ${key}. Limit: $${limit.toFixed(2)}`);
        }

        const now = Date.now();
        t.set(docRef, {
            total: currentTotal + increment,
            lastUpdated: FieldValue.serverTimestamp(),
            expireAt: new Date(now + windowSeconds * 1000)
        }, { merge: true });
    });
}
