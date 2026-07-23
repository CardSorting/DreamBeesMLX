import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from functions root
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'dreambees-alchemist' // From previous logs
    });
}
const db = admin.firestore();

// B2 CONFIG
const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_REGION = process.env.B2_REGION;
const B2_BUCKET = process.env.B2_BUCKET;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_PUBLIC_URL = process.env.B2_PUBLIC_URL;

const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APP_KEY,
    },
});

const SHOWCASE_LOCAL_DIR = path.resolve(__dirname, '../../public/showcase');

const modelsToUpdate = [
    'rin-anime-blend',
    'rin-anime-popcute',
    'wai-illustrious'
];

async function uploadFile(localPath, remoteKey) {
    if (!fs.existsSync(localPath)) {
        console.warn(`File not found: ${localPath}`);
        return null;
    }

    const fileContent = fs.readFileSync(localPath);
    console.log(`Uploading to B2: ${remoteKey}...`);

    try {
        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET,
            Key: remoteKey,
            Body: fileContent,
            ContentType: 'image/png',
        }));

        return `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${remoteKey}`;
    } catch (err) {
        console.error(`Failed to upload ${remoteKey}:`, err);
        return null;
    }
}

async function main() {
    for (const modelId of modelsToUpdate) {
        const localPath = path.join(SHOWCASE_LOCAL_DIR, modelId, 'cover.png');
        const remoteKey = `showcase/${modelId}/cover.png`;

        const publicUrl = await uploadFile(localPath, remoteKey);

        if (publicUrl) {
            console.log(`Successfully uploaded. URL: ${publicUrl}`);

            // Update Firestore
            try {
                const modelRef = db.collection('models').doc(modelId);
                await modelRef.update({
                    image: publicUrl
                });
                console.log(`Updated Firestore for model: ${modelId}`);
            } catch (err) {
                console.error(`Failed to update Firestore for ${modelId}:`, err);
            }
        }
    }
    console.log("Done!");
    process.exit(0);
}

main();
