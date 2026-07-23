import { HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue, getFunctions } from "../firebaseInit.js";
import { handleError } from "../lib/utils.js";
import { RequestWithAuth } from "../types/functions.js";
import { assertValidRequestId } from "../generation/contract.js";
import { formatGenerationJobStatus } from "../generation/job-view.js";
import { fetchGenerationQueueDoc, generationQueueCollection, generationQueueDoc } from "../generation/queue-repository.js";

export const handleGetGenerationHistory = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError('unauthenticated', "Auth required"); }
    const { limit: l = 20, startAfterId, startAfterCreatedAt } = request.data;
    try {
        let q = generationQueueCollection().where('userId', '==', uid).where('status', '==', 'completed').orderBy('createdAt', 'desc').limit(l);
        if (startAfterCreatedAt) {
            q = q.startAfter(new Date(startAfterCreatedAt));
        } else if (startAfterId) {
            const doc = await generationQueueDoc(startAfterId).get();
            if (doc.exists) { q = q.startAfter(doc); }
        }
        const snap = await q.get();
        const jobs = snap.docs.map(d => {
            const data = d.data() as any;
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            };
        }).filter(j => j.hidden !== true);
        const lastVisible = snap.docs[snap.docs.length - 1];
        const lastCreatedAt = lastVisible?.data()?.createdAt;
        return {
            jobs,
            lastVisibleId: lastVisible?.id,
            lastVisibleCreatedAt: lastCreatedAt?.toDate?.()?.toISOString() || lastCreatedAt,
            hasMore: snap.size === l
        };
    } catch (_) { throw handleError(_, { uid }); }
};

export const handleGetGenerationStatus = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError('unauthenticated', "Auth required"); }
    const { jobId } = request.data;
    if (!jobId) { throw new HttpsError('invalid-argument', "Missing jobId"); }

    try {
        assertValidRequestId(jobId);
        const result = await fetchGenerationQueueDoc(jobId);
        if (result.kind === "invalid_id") {
            throw new HttpsError('invalid-argument', "Invalid jobId");
        }
        if (result.kind === "not_found") {
            throw new HttpsError('not-found', "Generation job not found");
        }

        const data = result.data;
        if (data.userId !== uid) {
            throw new HttpsError('permission-denied', "Unauthorized access to job status");
        }

        return formatGenerationJobStatus(result.id, data);
    } catch (e) {
        if (e instanceof HttpsError) throw e;
        throw handleError(e, { uid, jobId });
    }
};

export const handleGetImageDetail = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new Error("Unauthenticated"); }
    try {
        let doc = await db.collection('images').doc(request.data.imageId).get();
        let type = 'image';
        if (!doc.exists) { throw new Error("Not found"); }
        const d = doc.data() as any;
        if (d.userId !== uid) { throw new Error("Unauthorized"); }
        return { id: doc.id, ...d, type, imageUrl: d.imageUrl, createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt };
    } catch (e) { throw handleError(e, { uid }); }
};

export const handleGetUserImages = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new HttpsError('unauthenticated', "Auth required"); }
    const { limit: l = 24, startAfterId, startAfterCreatedAt, filter = 'all' } = request.data;

    try {
        let iQ = db.collection('images')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(l);

        if (startAfterCreatedAt) {
            iQ = iQ.startAfter(new Date(startAfterCreatedAt));
        } else if (startAfterId) {
            const lastDoc = await db.collection('images').doc(startAfterId).get();
            if (lastDoc.exists) {
                iQ = iQ.startAfter(lastDoc);
            }
        }

        const snap = await iQ.get();
        const images = snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as any),
            createdAt: (d.data() as any).createdAt?.toDate?.()?.toISOString() || (d.data() as any).createdAt
        }));

        const lastVisible = snap.docs[snap.docs.length - 1];
        const lastCreatedAt = lastVisible?.data()?.createdAt;
        return {
            images,
            lastVisibleId: lastVisible?.id,
            lastVisibleCreatedAt: lastCreatedAt?.toDate?.()?.toISOString() || lastCreatedAt,
            hasMore: snap.size === l
        };
    } catch (e) { throw handleError(e, { uid }); }
};





export const handleDeleteImage = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new Error("Unauthenticated"); }
    try {
        const doc = await db.collection('images').doc(request.data.imageId).get();
        if (doc.exists) {
            const data = doc.data() as any;
            if (data.userId === uid) {
                getFunctions().taskQueue('locations/us-central1/functions/backgroundWorker').enqueue({
                    taskType: 'cleanup-resource',
                    cleanupType: 'image',
                    imageId: doc.id,
                    imageUrl: data.imageUrl,
                    thumbnailUrl: data.thumbnailUrl
                }).catch(err => console.error("Failed to enqueue cleanup", err));

                await doc.ref.delete();
            } else {
                throw new Error("Unauthorized");
            }
        } else {
            throw new Error("Not found");
        }
        return { success: true };
    } catch (e) { throw handleError(e, { uid }); }
};

export const handleDeleteImagesBatch = async (request: RequestWithAuth<any>) => {
    const uid = request.auth.uid;
    if (!uid) { throw new Error("Unauthenticated"); }
    const { imageIds } = request.data;
    try {
        if (imageIds.length > 50) { throw new Error("Max 50"); }
        const batch = db.batch();
        const refs = imageIds.map(id => db.collection('images').doc(id));
        const docs = await db.getAll(...refs);

        const queue = getFunctions().taskQueue('locations/us-central1/functions/backgroundWorker');

        let sent = 0;
        for (const d of docs) {
            const data = d.data() as any;
            if (d.exists && data.userId === uid) {
                batch.delete(d.ref);
                sent++;

                queue.enqueue({
                    taskType: 'cleanup-resource',
                    cleanupType: 'image',
                    imageId: d.id,
                    imageUrl: data.imageUrl,
                    thumbnailUrl: data.thumbnailUrl
                }).catch(err => console.error("Failed to enqueue batch cleanup", err));
            }
        }
        await batch.commit();
        return { success: true, deleted: sent };
    } catch (error) { throw handleError(error, { uid }); }
};
