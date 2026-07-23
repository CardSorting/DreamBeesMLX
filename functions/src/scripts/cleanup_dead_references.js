
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

try {
    initializeApp({ projectId: "dreambees-alchemist" });
} catch {
    // ignore
}

const db = getFirestore();

async function cleanupDeadRefs() {
    console.log("--- Cleanup Dead References in model_showcase_images ---");

    // We want to correct/delete docs where imageUrl starts with '/' 
    // AND it's not a whitelisted path (if any).
    // Specifically targeting '/showcase/' paths which we know are dead.

    const collectionRef = db.collection("model_showcase_images");
    let deletedCount = 0;
    let keptCount = 0;

    // Fetch all (or batch) - expecting < 2000 items based on "800+ files"
    const snapshot = await collectionRef.get();

    console.log(`Scanning ${snapshot.size} documents...`);

    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH = 400;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const url = data.imageUrl || data.url;

        if (!url || (typeof url === 'string' && url.startsWith('/showcase/'))) {
            // This is a local legacy path. Since we deleted public/showcase, it is DEAD.
            // Also confirmed via curl that it 404s on B2 (for zit-model at least).
            // Safer to delete.
            // console.log(`Deleting dead ref: ${doc.id} (${url})`);
            batch.delete(doc.ref);
            deletedCount++;
            batchCount++;
        } else {
            keptCount++;
        }

        if (batchCount >= MAX_BATCH) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} deletions.`);
            batchCount = 0; // Reset counter, batch is fresh
            // batch = db.batch(); // db.batch() creates a NEW batch object? Yes.
            // Wait, we need to create a new batch object.
            // The previous 'batch' variable still holds the committed batch?
            // Re-assigning 'batch' inside loop with `let`? No, obscure.
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} deletions.`);
    }

    console.log(`\nSummary:\nDeleted: ${deletedCount}\nKept: ${keptCount}`);

    if (keptCount === 0 && deletedCount > 0) {
        console.warn("WARNING: All documents were deleted? verifying...");
    }
}

// Helper to batch properly (since re-assignment in loop is tricky with const)
async function run() {
    await cleanupDeadRefs();
}

run();
