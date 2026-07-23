import { db, FieldValue } from "../firebaseInit.js";
import { logger, retryOperation } from "./utils.js";
import { Wallet } from "./wallet.js";
import { CostManager, ZapCostKey } from "./costs.js";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Billing Wrapper Utility
 */
export class Billing {

    /**
     * Executes an Atomic Transaction: Debit + Database Writes.
     */
    static async runAtomic(
        uid: string,
        costOrKey: number | ZapCostKey | string,
        requestId: string,
        metadata: any,
        dbCallback: (transaction: FirebaseFirestore.Transaction, cost: number) => Promise<void>
    ): Promise<any> {
        if (!uid) { throw new HttpsError('unauthenticated', "User must be authenticated"); }

        try {
            const cost = (typeof costOrKey === 'number') ? costOrKey : await CostManager.get(costOrKey);

            let result: any = { success: false };

            await db.runTransaction(async (t) => {
                const debitResult = await Wallet.debit(uid, cost, requestId, metadata, 'zaps', t);

                if (debitResult.idempotent) {
                    result = debitResult;
                    return;
                }

                await dbCallback(t, cost);
                result.success = true;
                result.requestId = requestId;
                result.cost = cost;
            });

            return result;

        } catch (error: any) {
            if (error instanceof HttpsError) { throw error; }
            throw new HttpsError('internal', error.message);
        }
    }

    /**
     * Executes an Async Action: Debit -> Action -> (Refund on Failure).
     */
    static async runAsync(
        uid: string,
        costOrKey: number | ZapCostKey | string,
        requestId: string,
        metadata: any,
        actionCallback: (cost: number) => Promise<any>,
        options: { retries?: number } = {}
    ): Promise<any> {
        if (!uid) { throw new HttpsError('unauthenticated', "User must be authenticated"); }

        const cost = (typeof costOrKey === 'number') ? costOrKey : await CostManager.get(costOrKey);

        const debitResult = await Wallet.debit(uid, cost, requestId, metadata);

        if (debitResult.idempotent) {
            return { success: true, idempotent: true };
        }

        try {
            return await retryOperation(async () => {
                return await actionCallback(cost);
            }, { retries: options.retries || 0, context: `Billing.runAsync(${requestId})` });

        } catch (error: any) {
            logger.error(`[Billing] Action failed for ${requestId}, initiating refund.`, error);

            try {
                await Wallet.credit(uid, cost, `refund_${requestId}`, {
                    type: 'refund',
                    originalRequestId: requestId,
                    reason: error.message
                });
            } catch (refundError: any) {
                logger.error(`[Billing] CRITICAL: Refund failed for ${requestId}`, refundError);
                try {
                    await db.collection('failed_refunds').add({
                        uid, cost, requestId,
                        originalError: error.message,
                        refundError: refundError.message,
                        metadata: metadata || {},
                        createdAt: FieldValue.serverTimestamp(),
                        status: 'pending_manual_review'
                    });
                } catch (dlqError: any) {
                    logger.error(`[Billing] SUPER CRITICAL: Failed to write to DLQ for ${requestId}`, dlqError);
                }
            }

            throw error;
        }
    }

    /**
     * Executes a Two-Phase Flow: Debit + Init (Atomic) -> Async Work (Async)
     */
    static async runTwoPhase(
        uid: string,
        costOrKey: number | ZapCostKey | string,
        requestId: string,
        metadata: any,
        initCallback: (transaction: FirebaseFirestore.Transaction) => Promise<void>,
        actionCallback: (cost: number) => Promise<any>,
        options: { retries?: number } = {}
    ): Promise<any> {
        if (!uid) { throw new HttpsError('unauthenticated', "User must be authenticated"); }

        const cost = (typeof costOrKey === 'number') ? costOrKey : await CostManager.get(costOrKey);
        let idempotent = false;

        await db.runTransaction(async (t) => {
            const debitResult = await Wallet.debit(uid, cost, requestId, metadata, 'zaps', t);
            if (debitResult.idempotent) {
                idempotent = true;
                return;
            }
            await initCallback(t);
        });

        if (idempotent) { return { success: true, idempotent: true }; }

        try {
            return await retryOperation(async () => {
                return await actionCallback(cost);
            }, { retries: options.retries || 0, context: `Billing.runTwoPhase(${requestId})` });

        } catch (error: any) {
            logger.error(`[Billing] TwoPhase Action failed for ${requestId}, refunding.`, error);
            try {
                await Wallet.credit(uid, cost, `refund_${requestId}`, {
                    type: 'refund',
                    originalRequestId: requestId,
                    reason: error.message
                });
            } catch (refundError: any) {
                logger.error(`[Billing] CRITICAL: Refund failed for ${requestId}`, refundError);
                try {
                    await db.collection('failed_refunds').add({
                        uid, cost, requestId,
                        originalError: error.message,
                        refundError: refundError.message,
                        metadata: metadata || {},
                        createdAt: FieldValue.serverTimestamp(),
                        status: 'pending_manual_review'
                    });
                } catch (dlqError: any) {
                    logger.error(`[Billing] SUPER CRITICAL: Failed to write to DLQ for ${requestId}`, dlqError);
                }
            }
            throw error;
        }
    }
}
