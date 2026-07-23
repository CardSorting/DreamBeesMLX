/**
 * Nova 3D CG XL Showcase Generator
 * 
 * Generates high-quality 3D CGI showcase images for the Nova 3D CG XL model
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { executeSubstrateGeneration } from "#substrate/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load Environment ---
const envPath = path.resolve(__dirname, "../.env");
try {
    const envFile = await fs.readFile(envPath, "utf-8");
    envFile.split("\n").forEach(line => {
        const [key, value] = line.split("=");
        if (key && value && !key.startsWith("#")) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch {
    console.warn("Could not read .env file, assuming env vars are set.");
}

// --- Configuration ---
const B2_ENDPOINT = process.env.B2_ENDPOINT || process.env.VITE_B2_ENDPOINT;
const B2_REGION = process.env.B2_REGION || process.env.VITE_B2_REGION;
const B2_BUCKET = process.env.B2_BUCKET || process.env.VITE_B2_BUCKET;
const B2_KEY_ID = process.env.B2_KEY_ID || process.env.VITE_B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY || process.env.VITE_B2_APP_KEY;
const B2_PUBLIC_URL = process.env.B2_PUBLIC_URL || process.env.VITE_B2_PUBLIC_URL;

if (!B2_KEY_ID || !B2_APP_KEY) {
    console.error("Missing B2 Credentials in .env");
    process.exit(1);
}

// --- Init Firebase ---
try {
    initializeApp({ projectId: "dreambees-alchemist" });
} catch {
    // Already initialized
}
const db = getFirestore();

// --- S3 Client for B2 ---
const s3Client = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APP_KEY,
    },
});

const ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
const MODEL_ID = 'nova-3d-cg-xl';

// --- 3D / CGI Focused Prompts ---
const PROMPTS = [
    { title: "Cyberpunk Android", prompt: "A stunning 3D CGI render of a futuristic cyberpunk android girl with glowing blue eyes, intricate mechanical details, cinematic lighting, masterpiece, ultra detailed, vibrant colors, 4k", aesthetic: "3D/CGI" },
    { title: "Dragon Guardian", prompt: "Intricate 3D render of a majestic silver dragon guarding a crystal cave, glowing gems, cinematic composition, unreal engine 5 style, masterwork, volumetric lighting", aesthetic: "Fantasy" },
    { title: "Futuristic Cityscape", prompt: "Hyper-realistic 3D CGI render of a vertical city on a desert planet at sunset, flying vehicles, neon signs, depth of field, Octane Render style, high detail", aesthetic: "Sci-Fi" },
    { title: "Enchanted Forest Spirit", prompt: "3D stylized character of a forest spirit made of leaves and glowing vines, Pixar style, soft lighting, vibrant nature colors, masterpiece, cute but detailed", aesthetic: "Animation" },
    { title: "Space Explorer", prompt: "3D render of a futuristic astronaut standing on a moon surface looking at Earth, detailed spacesuit, reflection on visor, cinematic atmosphere, 8k resolution", aesthetic: "Sci-Fi" },
    { title: "Mythical Warrior", prompt: "Warrior in golden filigree armor, 3D character design, heroic pose, flowing cape, magical aura, masterpiece, detailed textures, cinematic lighting", aesthetic: "Fantasy" },
    { title: "Mecha Unit", prompt: "Close up of a giant mecha head, glowing sensors, battle scars, heavy metal textures, 3D CGI industrial design, masterwork, crisp edges", aesthetic: "Mecha" },
    { title: "Ocean Temple", prompt: "Underwater 3D architectural render of a lost temple, glowing sea life, bubbles, volumetric rays of light, hyper-detailed environment", aesthetic: "Environment" },
    { title: "Steampunk Airship", prompt: "Detailed 3D engine render of a steampunk airship flying through clouds, copper pipes, brass gears, smoke, cinematic perspective, masterpiece", aesthetic: "Steampunk" },
    { title: "Cyber Kitsune", prompt: "A kitsune with nine tails glowing like neon fibers, 3D stylized art, dark background, cinematic shadows, masterpiece, high quality CGI", aesthetic: "Cyber" }
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateWithSDXL(prompt) {
    console.log(`   [SDXL] Submitting: ${prompt.substring(0, 60)}...`);
    const buffer = await executeSubstrateGeneration(ENDPOINT, {
        prompt,
        model: MODEL_ID,
        steps: 30,
        width: 1024,
        height: 1024
    }, {
        pollIntervalMs: 4000,
        onPending: () => process.stdout.write(".")
    });
    console.log("\n   [SDXL] ✓ Received Image Buffer");
    return buffer;
}

async function processAndUpload(imageBuffer, prompt, title, index, aesthetic) {
    const sharpImg = sharp(imageBuffer);
    const webpBuffer = await sharpImg.webp({ quality: 90 }).toBuffer();
    const thumbBuffer = await sharpImg.resize(512, 512, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
    const lqipBuffer = await sharpImg.resize(20, 20, { fit: "inside" }).webp({ quality: 20 }).toBuffer();
    const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

    const timestamp = Date.now();
    const baseKey = `showcase/${MODEL_ID}/batch_nova_${timestamp}_${index}`;
    const originalKey = `${baseKey}.webp`;
    const thumbKey = `${baseKey}_thumb.webp`;

    await s3Client.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: originalKey, Body: webpBuffer, ContentType: "image/webp" }));
    await s3Client.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: "image/webp" }));

    const imageUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${originalKey}`;
    const thumbnailUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${thumbKey}`;

    const docData = {
        modelId: MODEL_ID,
        prompt,
        title,
        imageUrl,
        url: imageUrl,
        thumbnailUrl,
        lqip,
        createdAt: FieldValue.serverTimestamp(),
        userId: "system_nova_showcase_script",
        likesCount: Math.floor(Math.random() * 150) + 100,
        bookmarksCount: Math.floor(Math.random() * 40) + 20,
        isElite: true,
        aesthetic: aesthetic,
        danbooruStyle: false, // This is 3D/CGI, not necessarily Danbooru style
        batch: "nova_initial_showcase"
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    console.log("=== NOVA 3D CG XL SHOWCASE GENERATOR ===");
    console.log(`Model: ${MODEL_ID}`);
    console.log(`Total Prompts: ${PROMPTS.length}\n`);

    for (let i = 0; i < PROMPTS.length; i++) {
        const item = PROMPTS[i];
        try {
            const imageBuffer = await generateWithSDXL(item.prompt);
            const url = await processAndUpload(imageBuffer, item.prompt, item.title, i, item.aesthetic);
            console.log(`   [${i + 1}] ✓ ${url}`);
        } catch (err) {
            console.error(`   [${i + 1}] ✗ ${err.message}`);
        }
        await sleep(5000);
    }
}

main().catch(console.error);
