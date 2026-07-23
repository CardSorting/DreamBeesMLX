import { db, FieldValue } from "../firebaseInit.js";
import { logger } from "./utils.js";

/**
 * Robustly ensures a user document exists in the 'users' collection.
 * Supports external transactions to enable atomic JIT provisioning.
 */
export async function ensureUserExists(
    uid: string, 
    displayName?: string, 
    photoURL?: string,
    t?: FirebaseFirestore.Transaction
): Promise<boolean> {
    if (!uid) return false;

    const logic = async (transaction: FirebaseFirestore.Transaction) => {
        const userRef = db.collection("users").doc(uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) {
            // --- CASE 1: PROVISION NEW ---
            const identifier = displayName || uid.slice(0, 8) || "New Artist";
            const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(identifier)}&background=fbbf24&color=fff`;

            transaction.set(userRef, {
                uid,
                displayName: identifier,
                photoURL: photoURL || fallbackPhoto,
                createdAt: FieldValue.serverTimestamp(),
                lastSeenAt: FieldValue.serverTimestamp(),
                zaps: 10,
                tier: 'free',
                role: 'user'
            });
            logger.info(`[UserSync] Provisioned new user: ${uid} (Name: ${identifier})`);
        } else {
            // --- CASE 2: SYNC EXISTING ---
            transaction.update(userRef, { lastSeenAt: FieldValue.serverTimestamp() });
        }
        return true;
    };

    try {
        if (t) {
            return await logic(t);
        } else {
            return await db.runTransaction(logic);
        }
    } catch (err: any) {
        logger.error(`[UserSync] CRITICAL: Transaction failed for ${uid}`, err);
        return false;
    }
}
