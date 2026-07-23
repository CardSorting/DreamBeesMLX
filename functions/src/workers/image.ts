import { db, FieldValue } from "../firebaseInit.js";
import { Wallet } from "../lib/wallet.js";
import { getS3Client, logger, retryOperation, fetchWithRetry } from "../lib/utils.js";
import { B2_BUCKET, B2_PUBLIC_URL } from "../lib/constants.js";
import { isValidModelId } from "../lib/modelConventions.js";
import { ForensicLogger } from "../lib/forensics.js";
import { SubstrateHealth } from "../lib/substrateHealth.js";
import { DEFAULT_ASPECT_RATIO, Sanitizer } from "../domain/models/ImageGenerationRequest.js";
import { executeSubstrateGeneration } from "../generation/substrate-client.js";
import { buildSubstrateRequestBody } from "../generation/substrate-request-builder.js";
import { generationQueueDoc } from "../generation/queue-repository.js";

/**
 * Main worker for image generation tasks
 */
export const processImageTask = async (req: { data: any }): Promise<void> => {
    const {
        requestId, userId, modelId, negative_prompt,
        steps = 30, cfg = 7, aspectRatio = DEFAULT_ASPECT_RATIO,
        scheduler, promptHash, promptMetadata
    } = req.data;

    let prompt: string = req.data.prompt;

    if (prompt && prompt.length > 1500) {
        prompt = prompt.substring(0, 1500);
    }

    const forensic = new ForensicLogger({
        requestId,
        workerName: 'ImageWorker',
        taskType: 'image',
        userId,
        startTime: Date.now()
    });

    const docRef = generationQueueDoc(requestId);
    let debitedCost = 1;
    let isAdminBypass = false;

    // --- DETERMINISTIC LOCK: Atomic State Transition ---
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) { throw new Error("Job document missing"); }
            const data = doc.data() as any;
            debitedCost = data.cost || debitedCost;
            isAdminBypass = Boolean(data.isAdminBypass);

            if (['processing', 'completed'].includes(data.status)) {
                throw new Error(`IDEMPOTENCY_BLOCK: Status is ${data.status}`);
            }

            t.update(docRef, {
                status: "processing",
                stage: "generating",
                progress: 15,
                startedAt: FieldValue.serverTimestamp()
            });
        });
        forensic.checkpoint('locked_and_processing');
    } catch (e: any) {
        if (e.message.includes('IDEMPOTENCY_BLOCK')) {
            forensic.checkpoint('skipped_idempotent');
            return;
        }
        throw e;
    }
    // ---------------------------------------------------

    let imageUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let lqip: string | null = null;
    let imageBuffer: Buffer | null = null;

    try {

        const safeAspectRatio = Sanitizer.validateAspectRatio(aspectRatio);
        const resolution = Sanitizer.toNormalizedDimensions(safeAspectRatio);

        // --- MODEL EXECUTION ---
        if (!isValidModelId(modelId)) {
            throw new Error(`Unsupported model ID: ${modelId}`);
        }

            imageBuffer = await (async () => {
                if (modelId === 'flux-2-dev' || modelId === 'flux-2-klein-9b') {
                    logger.info(`[${requestId}] Running Cloudflare Workers AI generation for model: ${modelId}`);

                    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
                    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

                    if (!accountId || !apiToken) {
                        throw new Error("Missing Cloudflare credentials");
                    }

                    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/${modelId}`;

                    // Construct multipart form data
                    const form = new FormData();
                    form.append('prompt', prompt);
                    form.append('width', String(resolution.width));
                    form.append('height', String(resolution.height));
                    if (steps) {
                        form.append('steps', String(steps));
                    }

                    // Request wrapper to serialize boundary
                    const formResponse = new Response(form);
                    const formContentType = formResponse.headers.get('content-type')!;
                    const formBuffer = Buffer.from(await formResponse.arrayBuffer());

                    await docRef.update({ stage: "generating", progress: 20 }).catch(() => { });

                    const response = await fetchWithRetry(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiToken}`,
                            'Content-Type': formContentType
                        },
                        body: formBuffer,
                        timeout: 120000
                    });

                    await docRef.update({ stage: "generating", progress: 60 }).catch(() => { });

                    return Buffer.from(await response.arrayBuffer());
                }

                logger.info(`[${requestId}] Running SDXL generation for model: ${modelId}`);

                const body = buildSubstrateRequestBody({
                    modelId,
                    prompt,
                    negative_prompt,
                    steps,
                    cfg,
                    scheduler,
                    aspectRatio: safeAspectRatio,
                    width: resolution.width,
                    height: resolution.height
                });

                const { getModelEndpoint } = await import("../lib/modelConventions.js");
                const endpoint = getModelEndpoint(modelId);

                let lastPersistedPollProgress = 20;
                let lastPersistedPollAt = Date.now();
                await docRef.update({ stage: "generating", progress: lastPersistedPollProgress }).catch(() => { });

                return executeSubstrateGeneration(endpoint, body, {
                    onProgress: async ({ progress: pollProgress }) => {
                        const now = Date.now();
                        if (
                            pollProgress >= lastPersistedPollProgress + 5 ||
                            now - lastPersistedPollAt >= 8000
                        ) {
                            lastPersistedPollProgress = pollProgress;
                            lastPersistedPollAt = now;
                            await docRef.update({ stage: "generating", progress: pollProgress }).catch(() => { });
                        }
                    }
                });
            })();


        if (!imageBuffer || imageBuffer.length < 100) {
            throw new Error("Failed to generate or retrieve image buffer");
        }

        const { default: sharp } = await import("sharp");

        // LQIP first — smallest encode, pushed to client before full resize/upload work
        const lqipBuffer = await sharp(imageBuffer)
            .resize(20, 20, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 20 })
            .toBuffer();
        lqip = `data:image/webp;base64,${lqipBuffer.toString('base64')}`;
        await docRef.update({ progress: 78, lqip, stage: "generating" }).catch(() => { });

        const [webpBuffer, thumbBuffer] = await Promise.all([
            sharp(imageBuffer).webp({ quality: 90 }).toBuffer(),
            sharp(imageBuffer).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
        ]);

        const baseFolder = `generated/${userId}/${Date.now()}`;
        const originalFilename = `${baseFolder}.webp`;
        const thumbFilename = `${baseFolder}_thumb.webp`;

        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = await getS3Client();

        forensic.checkpoint('upload_starting');
        thumbnailUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${thumbFilename}`;

        // Thumbnail first — client can show preview before full upload finishes
        await s3.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: thumbFilename, Body: thumbBuffer, ContentType: "image/webp" }));
        await docRef.update({
            stage: "saving",
            progress: 85,
            thumbnailUrl,
            lqip
        }).catch(() => { });

        await s3.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: originalFilename, Body: webpBuffer, ContentType: "image/webp" }));
        forensic.checkpoint('upload_complete');

        imageUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${originalFilename}`;
        const imageRef = db.collection("images").doc();

        // Signal completion immediately — catalog write can finish in the background
        await retryOperation(() => docRef.update({
            status: "completed",
            stage: "done",
            progress: 100,
            imageUrl, thumbnailUrl, lqip,
            resultImageId: imageRef.id,
            completedAt: new Date()
        }));

        imageRef.set({
            userId, prompt, negative_prompt, steps, cfg, aspectRatio: safeAspectRatio, modelId,
            imageUrl, thumbnailUrl, lqip, promptHash, promptMetadata,
            isPublic: true,
            createdAt: FieldValue.serverTimestamp(), originalRequestId: requestId
        }).catch((catalogErr) => {
            logger.error(`[${requestId}] Catalog write failed`, catalogErr);
        });

        // RECORD SUCCESS
        await SubstrateHealth.recordSuccess(modelId);


    } catch (error: any) {
        forensic.fail(error);

        if (userId && !userId.startsWith('anonymous') && !isAdminBypass && debitedCost > 0) {
            try {
                // RECORD FAILURE FOR CIRCUIT BREAKER
                await SubstrateHealth.recordFailure(modelId, error.message);

                // DETERMINISTIC REFUND ID
                const refundId = `refund_worker_${requestId}`;
                await Wallet.credit(userId, debitedCost, refundId, {
                    auditType: 'worker_refund',
                    originalRequestId: requestId,
                    reason: error.message
                });
            } catch (refundError: any) {
                logger.error("Refund Error", refundError);
            }
        }

        await docRef.update({
            status: "failed",
            error: error.message,
            failedAt: FieldValue.serverTimestamp()
        }).catch(() => { });
    }
};
