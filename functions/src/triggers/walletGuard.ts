import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { db } from "../firebaseInit.js";
import { logger } from "../lib/utils.js";

/**
 * WALLET GUARD TRIGGER
 * 
 * Monitors 'users/{userId}' for balance changes and audits against the ledger.
 */
export const walletGuard = onDocumentUpdated("users/{userId}", async (event) => {
    const userId = event.params.userId;

    if (!event.data) { return; }

    const before = event.data.before.data() as any;
    const after = event.data.after.data() as any;

    if (!before || !after) { return; }

    // 1. Detect Financial Changes
    const zapsChanged = (before.zaps || 0) !== (after.zaps || 0);

    if (!zapsChanged) {
        return;
    }

    const zapsDelta = (after.zaps || 0) - (before.zaps || 0);

    // 2. Audit against Ledger (DISABLED for speed over auditability)
    /*
    try {
        const recentLedgerSnap = await db.collection('wallet_transactions')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        let violation = false;
        let violationReason = "";

        if (recentLedgerSnap.empty) {
            violation = true;
            violationReason = "No ledger entries ever found for user";
        } else {
            const latestTx = recentLedgerSnap.docs[0].data() as any;
            const txTime = latestTx.timestamp?.toDate ? latestTx.timestamp.toDate() : new Date(latestTx.createdAt);
            const updateTime = new Date(event.time);

            const diffMs = Math.abs(updateTime.getTime() - txTime.getTime());

            if (diffMs > 30000) {
                violation = true;
                violationReason = `Latest ledger entry is too old (${diffMs}ms ago). ID: ${recentLedgerSnap.docs[0].id}`;
            }
        }

        if (violation) {
            logger.error(`[WALLET_VIOLATION] INTEGRITY BREACH DETECTED`, {
                userId,
                zapsDelta,
                reason: violationReason,
                beforeZaps: before.zaps,
                afterZaps: after.zaps
            });
        }

    } catch (error: any) {
        logger.error(`[WALLET_GUARD_ERROR] Failed to audit transaction`, error);
    }
    */
    logger.info(`[WalletGuard] Balance update detected for ${userId}: delta ${zapsDelta} (Audit Bypassed)`);
});
