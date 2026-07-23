/**
 * Firestore repository for generation_queue documents.
 * Repository pattern — all queue reads/writes go through here.
 */

import { db } from "../firebaseInit.js";
import { GENERATION_QUEUE_COLLECTION, isValidRequestId } from "./contract.js";

export const generationQueueCollection = () =>
    db.collection(GENERATION_QUEUE_COLLECTION);

export const generationQueueDoc = (requestId: string) =>
    generationQueueCollection().doc(requestId);

export async function fetchGenerationQueueDoc(requestId: string) {
    if (!isValidRequestId(requestId)) {
        return { kind: "invalid_id" as const };
    }

    const doc = await generationQueueDoc(requestId).get();
    if (!doc.exists) {
        return { kind: "not_found" as const };
    }

    return { kind: "found" as const, id: doc.id, data: doc.data() as Record<string, unknown> };
}

export const resolveTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    const maybeDate = value as { toDate?: () => Date };
    if (typeof maybeDate.toDate === "function") {
        return maybeDate.toDate().toISOString();
    }
    return typeof value === "string" ? value : null;
};
