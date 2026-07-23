
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Manually define constants to avoid import issues
const B2_ENDPOINT = 'https://s3.us-west-004.backblazeb2.com';
const B2_REGION = 'us-west-004';
const B2_BUCKET = 'printeregg';
const B2_PUBLIC_URL = 'https://cdn.dreambeesai.com';
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;

async function uploadAssets() {
    const s3 = new S3Client({
        endpoint: B2_ENDPOINT,
        region: B2_REGION,
        credentials: {
            accessKeyId: B2_KEY_ID,
            secretAccessKey: B2_APP_KEY,
        },
    });

    const assets = [
        { name: 'hero_background_bee', path: '/Users/bozoegg/.gemini/antigravity/brain/81267c4c-23b7-4624-8bfc-b22f7b3c684c/hero_background_bee_1777509577091.png' },
        { name: 'electron_app_mockup', path: '/Users/bozoegg/.gemini/antigravity/brain/81267c4c-23b7-4624-8bfc-b22f7b3c684c/electron_app_mockup_1777509592330.png' }
    ];

    for (const asset of assets) {
        const fileContent = fs.readFileSync(asset.path);
        const fileName = `assets/${asset.name}_${Date.now()}.png`;
        
        console.log(`Uploading ${asset.name}...`);
        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET,
            Key: fileName,
            Body: fileContent,
            ContentType: 'image/png'
        }));
        
        console.log(`URL: ${B2_PUBLIC_URL}/file/${B2_BUCKET}/${fileName}`);
    }
}

uploadAssets().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
