import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
    initializeApp({ projectId: "dreambees-alchemist" });
} catch {
    // ignore
}

const db = getFirestore();

const COLLECTIONS = ['images', 'mockups'];
const BATCH_SIZE = 200;

const normalizeReference = (data) => {
    const imageUrl = data.imageUrl || data.url || data.thumbnailUrl;
    return {
        ...data,
        imageUrl,
        url: data.url || data.imageUrl || imageUrl,
        aspectRatio: data.aspectRatio || '1:1'
    };
};

async function backfillAliases() {
    console.log("--- Backfilling generation aliases + optional generations docs ---");

    for (const collectionName of COLLECTIONS) {
        console.log(`Scanning ${collectionName}...`);
        let lastDoc = null;
        let processed = 0;
        let created = 0;

        while (true) {
            let queryRef = db.collection(collectionName).orderBy('createdAt', 'desc').limit(BATCH_SIZE);
            if (lastDoc) queryRef = queryRef.startAfter(lastDoc);

            const snapshot = await queryRef.get();
            if (snapshot.empty) break;

            const batch = db.batch();

            snapshot.docs.forEach((docSnap) => {
                processed += 1;
                const data = docSnap.data();
                const normalized = normalizeReference(data);
                const aliasRef = db.collection('generation_aliases').doc(docSnap.id);

                batch.set(aliasRef, {
                    targetId: docSnap.id,
                    collection: collectionName,
                    originalRequestId: data.originalRequestId || null,
                    createdAt: FieldValue.serverTimestamp()
                }, { merge: true });

                // Optionally mirror into generations for legacy clients
                const generationsRef = db.collection('generations').doc(docSnap.id);
                batch.set(generationsRef, {
                    ...normalized,
                    _sourceCollection: collectionName,
                    mirroredAt: FieldValue.serverTimestamp()
                }, { merge: true });

                created += 1;
            });

            await batch.commit();
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }

        console.log(`Finished ${collectionName}: processed ${processed}, mirrored ${created}`);
    }
}

backfillAliases()
    .then(() => {
        console.log('Backfill complete.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Backfill failed:', err);
        process.exit(1);
    });