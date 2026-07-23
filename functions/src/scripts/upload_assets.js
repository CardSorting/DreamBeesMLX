import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from functions root (one level up from scripts)
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

// CONFIG
const SOURCE_DIR = path.resolve(__dirname, '../../src/assets/images/landing');
const TARGET_DIR = path.resolve(__dirname, '../../src/data'); // Place to save the manifest
const MANIFEST_FILE = path.join(TARGET_DIR, 'landing_assets.json');
const BUCKET_FOLDER = 'assets/landing'; // Folder in B2

// ENV - Fallback to what we know if env fails to load for some reason, 
// but usually dotenv works. We use the keys from process.env directly here
// matching utils.js
const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_REGION = process.env.B2_REGION;
const B2_BUCKET = process.env.B2_BUCKET;
const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_PUBLIC_URL = process.env.B2_PUBLIC_URL;

if (!B2_BUCKET || !B2_KEY_ID) {
    console.error("Missing B2 credentials in environment.");
    process.exit(1);
}

const s3 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APP_KEY,
    },
});

async function uploadFile(filePath) {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    // Simple mime detection
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.png')) contentType = 'image/png';
    else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (fileName.endsWith('.webp')) contentType = 'image/webp';

    const key = `${BUCKET_FOLDER}/${fileName}`;

    console.log(`Uploading ${fileName} to ${key}...`);

    try {
        await s3.send(new PutObjectCommand({
            Bucket: B2_BUCKET,
            Key: key,
            Body: fileContent,
            ContentType: contentType,
            // ACL: 'public-read' // Uncomment if bucket isn't public policy enabled
        }));

        // Return the public URL
        return `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${key}`;
    } catch (err) {
        console.error(`Failed to upload ${fileName}:`, err);
        return null;
    }
}

async function main() {
    console.log(`Scanning ${SOURCE_DIR}...`);

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory not found: ${SOURCE_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(SOURCE_DIR).filter(f => !f.startsWith('.'));
    const manifest = {};

    for (const file of files) {
        const fullPath = path.join(SOURCE_DIR, file);
        if (fs.statSync(fullPath).isFile()) {
            const url = await uploadFile(fullPath);
            if (url) {
                manifest[file] = url;
            }
        }
    }

    console.log("Generating manifest...");
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
    console.log(`Manifest saved to ${MANIFEST_FILE}`);
}

main();
