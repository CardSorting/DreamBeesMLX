
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
    initializeApp({ projectId: "dreambees-alchemist" });
} catch {
    // ignore
}

const db = getFirestore();

/**
 * Mapped from functions/lib/credits.js for local test isolation
 */
async function deductZapsAtomic(uid, amount, requestId, queueCollection = 'action_logs') {
    const userRef = db.collection('users').doc(uid);
    const queueRef = db.collection(queueCollection).doc(requestId);

    return await db.runTransaction(async (t) => {
        const existingJob = await t.get(queueRef);
        if (existingJob.exists) {
            return { success: true, idempotent: true };
        }

        const userDoc = await t.get(userRef);
        const userData = userDoc.data() || { zaps: 0 };
        const currentBalance = userData.zaps || 0;

        if (currentBalance < amount) {
            throw new Error(`Insufficient Zaps. Need ${amount}, have ${currentBalance}`);
        }

        t.update(userRef, {
            zaps: FieldValue.increment(-amount),
            lastActionTime: FieldValue.serverTimestamp()
        });

        // Log the requestId to prevent future double-deduction
        t.set(queueRef, {
            uid,
            amount,
            timestamp: FieldValue.serverTimestamp(),
            status: 'deducted'
        });

        return { success: true, idempotent: false };
    });
}

async function runTest() {
    const TEST_UID = "test_user_id";
    const REQUEST_ID = `test_race_${Date.now()}`;
    const COST = 1;

    console.log(`[Test] Starting Concurrency Test for UID: ${TEST_UID}, RequestID: ${REQUEST_ID}`);

    // 1. Setup - Ensure user has enough zaps
    await db.collection('users').doc(TEST_UID).set({ zaps: 10 }, { merge: true });
    console.log("[Test] User balance reset to 10 Zaps.");

    // 2. Launch 5 simultaneous requests with the SAME requestId
    console.log("[Test] Launching 5 simultaneous requests...");
    const results = await Promise.allSettled([
        deductZapsAtomic(TEST_UID, COST, REQUEST_ID),
        deductZapsAtomic(TEST_UID, COST, REQUEST_ID),
        deductZapsAtomic(TEST_UID, COST, REQUEST_ID),
        deductZapsAtomic(TEST_UID, COST, REQUEST_ID),
        deductZapsAtomic(TEST_UID, COST, REQUEST_ID)
    ]);

    // 3. Analyze Results
    let successCount = 0;
    let idempotentCount = 0;
    let errorCount = 0;

    results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
            if (res.value.idempotent) {
                console.log(` Request ${i + 1}: IDEMPOTENT (Success)`);
                idempotentCount++;
            } else {
                console.log(` Request ${i + 1}: DEDUCTED (Success)`);
                successCount++;
            }
        } else {
            console.error(` Request ${i + 1}: FAILED`, res.reason);
            errorCount++;
        }
    });

    // 4. Final Balance Check
    const finalDoc = await db.collection('users').doc(TEST_UID).get();
    const finalBalance = finalDoc.data().zaps;

    console.log("\n--- FINAL REPORT ---");
    console.log(`Total Requests: 5`);
    console.log(`Initial Balance: 10`);
    console.log(`Deductions: ${successCount}`);
    console.log(`Idempotent Skips: ${idempotentCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Final Balance: ${finalBalance}`);

    if (successCount === 1 && finalBalance === 9) {
        console.log("\n✅ TEST PASSED: Atomic idempotency is working perfectly!");
    } else {
        console.error("\n❌ TEST FAILED: Race condition detected.");
    }
}

runTest().catch(console.error);
