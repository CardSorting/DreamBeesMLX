
const admin = require('firebase-admin');
const serviceAccount = require('../dreambees-app-gen-v1-firebase-adminsdk-fbsvc-195fd20c32.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedUsers() {
    console.log("Starting user seed for wallet fields...");
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        console.log('No users found.');
        return;
    }

    let updatedCount = 0;
    const batchSize = 500;
    let batch = db.batch();
    let operationCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};
        if (data.zaps === undefined) updates.zaps = 0;
        if (data.subscriptionStatus === undefined) updates.subscriptionStatus = 'inactive';

        if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            updatedCount++;
            operationCount++;

            if (operationCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
                console.log(`Committed batch of ${batchSize} updates...`);
            }
        }
    }

    if (operationCount > 0) {
        await batch.commit();
    }

    console.log(`Seed complete. Updated ${updatedCount} users.`);
}

seedUsers().catch(console.error);
