
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

try {
    initializeApp();
} catch { }

const db = getFirestore();

async function reconcileUsers() {
    console.log("Starting Wallet Reconciliation...");

    const usersSnap = await db.collection('users').get();
    let totalDiscrepancies = 0;

    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const storedZaps = userData.zaps || 0;

        // Fetch all transactions for this user
        const txSnap = await db.collection('wallet_transactions')
            .where('userId', '==', uid)
            .orderBy('timestamp', 'asc') // Order by time to replay history
            .get();

        let calculatedZaps = 0;

        // Replay history
        txSnap.docs.forEach(doc => {
            const tx = doc.data();
            const currency = tx.currency || 'zaps';
            const amount = tx.amount || 0;

            if (currency === 'zaps') {
                if (tx.type === 'credit') calculatedZaps += amount;
                else if (tx.type === 'debit') calculatedZaps -= amount;
            }
        });

        const zapDiff = Math.abs(storedZaps - calculatedZaps);

        // Tolerance for floating point
        const TOLERANCE = 0.5;

        if (zapDiff > TOLERANCE) {
            console.error(`[DISCREPANCY] User: ${uid}`);
            console.error(`  Zaps: Stored=${storedZaps}, Calc=${calculatedZaps}, Diff=${storedZaps - calculatedZaps}`);
            totalDiscrepancies++;
        }
    }

    console.log(`Reconciliation Complete. Found ${totalDiscrepancies} discrepant users.`);
}

reconcileUsers().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
