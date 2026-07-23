import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue } from "../firebaseInit.js";
import { logger, retryOperation } from "../lib/utils.js";
import { Wallet } from "../lib/wallet.js";
import { buildImageGenerationTaskPayload, enqueueImageGenerationTask } from "../generation/enqueue.js";
import { generationQueueCollection } from "../generation/queue-repository.js";

/**
 * Scheduled function to clean up stale jobs and RESUSCITATE stuck jobs.
 * Runs every 5 minutes for high-velocity health.
 */
export const staleJobCleanup = onSchedule("every 5 minutes", async (_event) => {
    logger.info("Starting scheduled stale job and resuscitation cleanup");

    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000);
    const resuscitationThreshold = new Date(Date.now() - 90 * 1000);

    try {
        const staleJobs = await generationQueueCollection()
            .where("status", "in", ["queued", "processing"])
            .where("createdAt", "<=", staleThreshold)
            .limit(50)
            .get();

        const resuscitateJobs = await generationQueueCollection()
            .where("status", "==", "queued")
            .where("createdAt", "<=", resuscitationThreshold)
            .where("createdAt", ">", staleThreshold)
            .limit(50)
            .get();

        if (!staleJobs.empty) {
            logger.info(`Found ${staleJobs.size} stale generation_queue jobs`);

            const batch = db.batch();
            const refundPromises: Promise<unknown>[] = [];

            for (const doc of staleJobs.docs) {
                const data = doc.data();
                const requestId = doc.id;
                const userId = data.userId;

                logger.warn(`Cleaning up stale job ${requestId}`, { userId, status: data.status });

                batch.update(doc.ref, {
                    status: "failed",
                    error: "Task timed out or worker hung (Automated Recovery)",
                    failedAt: FieldValue.serverTimestamp()
                });

                if (userId && !userId.startsWith("anonymous")) {
                    const cost = data.cost || 0;
                    if (cost > 0) {
                        refundPromises.push(
                            retryOperation(async () => {
                                await Wallet.credit(userId, cost, `refund_stale_${requestId}`, {
                                    auditType: "stale_recovery_refund",
                                    originalRequestId: requestId,
                                    reason: "stale_job_recovery"
                                }, "zaps");
                            }, { context: `Refund stale job ${requestId}` })
                        );
                    } else {
                        refundPromises.push(
                            retryOperation(async () => {
                                await Wallet.credit(userId, 1.0, `refund_stale_fallback_${requestId}`, {
                                    auditType: "stale_recovery_refund_fallback",
                                    originalRequestId: requestId,
                                    reason: "stale_job_recovery_fallback"
                                });
                            }, { context: `Refund fallback for ${requestId}` })
                        );
                    }
                }
            }

            await batch.commit();

            if (refundPromises.length > 0) {
                const results = await Promise.allSettled(refundPromises);
                const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
                if (failures.length > 0) {
                    logger.error(`Failed to refund ${failures.length} stale jobs`, failures[0].reason);
                }
            }
        }

        if (!resuscitateJobs.empty) {
            logger.info(`Resuscitating ${resuscitateJobs.docs.length} stuck queued jobs`);

            for (const doc of resuscitateJobs.docs) {
                const data = doc.data();
                const requestId = doc.id;

                if (data.enqueuedAt && !data.enqueueError) {
                    continue;
                }

                logger.info(`[RESUSCITATE] Re-enqueuing job ${requestId}`, { userId: data.userId });

                const payload = buildImageGenerationTaskPayload(requestId, data.userId, data);
                payload.resuscitated = true;

                await enqueueImageGenerationTask(payload).catch(err => logger.error(`Resuscitation failed for ${requestId}`, err));

                await doc.ref.update({
                    enqueuedAt: FieldValue.serverTimestamp(),
                    resuscitationCount: FieldValue.increment(1),
                    lastResuscitatedAt: FieldValue.serverTimestamp(),
                    enqueueError: FieldValue.delete()
                }).catch(() => { });
            }
        }

        logger.info("generation_queue maintenance cycle complete");
    } catch (error: any) {
        logger.error("Error during generation_queue maintenance", error);
    }
});
