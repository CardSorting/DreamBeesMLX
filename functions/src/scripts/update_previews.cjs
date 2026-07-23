
const admin = require('firebase-admin');
const serviceAccount = require('../dreambees-app-gen-v1-firebase-adminsdk-fbsvc-195fd20c32.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const UPDATES = [];

async function updatePreviews() {
    const collectionRef = db.collection('models');

    console.log('Updating preview images (image & previewImages)...');

    for (const update of UPDATES) {
        const docRef = collectionRef.doc(update.id);
        try {
            // Update both the main thumbnail and the gallery fallback
            await docRef.update({
                image: update.image,
                previewImages: update.previewImages,
                // Clean up the wrong field if it exists (optional but good practice)
                previewImage: admin.firestore.FieldValue.delete()
            });
            console.log(`✓ Updated ${update.id}`);
        } catch (error) {
            console.error(`✗ Failed to update ${update.id}:`, error.message);
        }
    }
}

updatePreviews().catch(console.error);
