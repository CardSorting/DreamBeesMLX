const admin = require('firebase-admin');
const serviceAccount = require('../dreambees-app-gen-v1-firebase-adminsdk-fbsvc-195fd20c32.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const uid = 'Quql4R4qEJQ8bDybBe6y46VnZHi1';

async function fixUser() {
    console.log(`Attempting to fix user ${uid}...`);
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
        console.log('User document already exists in Firestore.');
        return;
    }

    try {
        const userRecord = await admin.auth().getUser(uid);
        console.log('Found Auth user:', userRecord.email);

        await userRef.set({
            uid: uid,
            email: userRecord.email || "",
            displayName: userRecord.displayName || "",
            photoURL: userRecord.photoURL || "",
            createdAt: new Date(),
            zaps: 10,
            subscriptionStatus: 'inactive',
            role: 'user'
        });
        console.log(`Successfully created Firestore document for user ${uid}.`);
    } catch (e) {
        console.error('Error fetching from Auth or creating in Firestore:', e);
    }
}

fixUser().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
