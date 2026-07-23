/**
 * Nova 3D CG XL - Anime Legends Showcase
 * 
 * Generates 25 famous anime characters in high-quality 3D CGI style.
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

// --- 25 Famous Anime Characters ---
const PROMPTS = [
    { title: "Asuka Langley Soryu", prompt: "1girl, asuka langley soryu \(evangelion\), red hair, plugsuit, cockpit, 3d render, cgi, cinematic lighting, masterpiece, ultra detailed", aesthetic: "Neon Genesis" },
    { title: "Rei Ayanami", prompt: "1girl, ayanami rei \(evangelion\), short blue hair, plugsuit, bandages, moon background, 3d render, cgi, ethereal lighting, masterpiece", aesthetic: "Neon Genesis" },
    { title: "Naruto Uzumaki", prompt: "1boy, naruto uzumaki \(naruto\), blonde spiky hair, orange jacket, nine tails aura, rasengan, 3d render, cgi, action pose, masterpiece", aesthetic: "Naruto" },
    { title: "Sasuke Uchiha", prompt: "1boy, sasuke uchiha \(naruto\), black hair, sharingan, chidori, lightning, 3d render, cgi, dark atmosphere, masterpiece", aesthetic: "Naruto" },
    { title: "Monkey D. Luffy", prompt: "1boy, monkey d. luffy \(one piece\), straw hat, red vest, gear 5, clouds, laughter, 3d render, cgi, vibrant colors, masterpiece", aesthetic: "One Piece" },
    { title: "Nico Robin", prompt: "1girl, nico robin \(one piece\), long black hair, sunglasses, petals, archaeological ruins, 3d render, cgi, elegant, masterpiece", aesthetic: "One Piece" },
    { title: "Ichigo Kurosaki", prompt: "1boy, ichigo kurosaki \(bleach\), orange hair, shinigami uniform, zangetsu, soul society, 3d render, cgi, intense, masterpiece", aesthetic: "Bleach" },
    { title: "Rukia Kuchiki", prompt: "1girl, rukia kuchiki \(bleach\), short black hair, shinigami uniform, sode no shirayuki, ice, 3d render, cgi, graceful, masterpiece", aesthetic: "Bleach" },
    { title: "Anya Forger", prompt: "1girl, anya forger \(spy x family\), pink hair, hair ornaments, peanuts, funny expression, 3d render, cgi, cute, masterpiece", aesthetic: "Spy x Family" },
    { title: "Yor Forger", prompt: "1girl, yor forger \(spy x family\), black hair, red dress, thorns, assassin, 3d render, cgi, cinematic lighting, masterpiece", aesthetic: "Spy x Family" },
    { title: "Mikasa Ackerman", prompt: "1girl, mikasa ackerman \(attack on titan\), short black hair, red scarf, survey corps uniform, 3d vertical maneuvering gear, 3d render, cgi, gritty, masterpiece", aesthetic: "AOT" },
    { title: "Eren Yeager", prompt: "1boy, eren yeager \(attack on titan\), long brown hair, green eyes, titan form in background, paths, 3d render, cgi, epic, masterpiece", aesthetic: "AOT" },
    { title: "Power", prompt: "1girl, power \(chainsaw man\), blonde hair, red horns, yellow suit, blood scythe, 3d render, cgi, chaotic energy, masterpiece", aesthetic: "Chainsaw Man" },
    { title: "Makima", prompt: "1girl, makima \(chainsaw man\), red hair, suit, yellow eyes, looking at viewer, 3d render, cgi, mysterious, masterpiece", aesthetic: "Chainsaw Man" },
    { title: "Frieren", prompt: "1girl, frieren \(frieren\), white hair, elf ears, staff, spell circle, 3d render, cgi, magical atmosphere, masterpiece", aesthetic: "Frieren" },
    { title: "Fern", prompt: "1girl, fern \(frieren\), purple hair, mage robe, casting spell, 3d render, cgi, soft lighting, masterpiece", aesthetic: "Frieren" },
    { title: "Aqua", prompt: "1girl, aqua \(konosuba\), blue hair, goddess, water, crying, 3d render, cgi, vibrant, masterpiece", aesthetic: "Konosuba" },
    { title: "Megumin", prompt: "1girl, megumin \(konosuba\), brown hair, witch hat, eyepatch, explosion in background, 3d render, cgi, masterpiece", aesthetic: "Konosuba" },
    { title: "Ai Hoshino", prompt: "1girl, ai hoshino \(oshi no ko\), purple hair, star eyes, idol outfit, stage lights, 3d render, cgi, sparkly, masterpiece", aesthetic: "Oshi no Ko" },
    { title: "Ruby Hoshino", prompt: "1girl, ruby hoshino \(oshi no ko\), blonde hair, idol, dancing, 3d render, cgi, bright, masterpiece", aesthetic: "Oshi no Ko" },
    { title: "Chisato Nishikigi", prompt: "1girl, chisato nishikigi \(lycoris recoil\), blonde bob, red uniform, dodging bullets, 3d render, cgi, high speed, masterpiece", aesthetic: "Lycoris" },
    { title: "Takina Inoue", prompt: "1girl, takina inoue \(lycoris recoil\), long black hair, blue uniform, aiming gun, 3d render, cgi, precise, masterpiece", aesthetic: "Lycoris" },
    { title: "Marin Kitagawa", prompt: "1girl, marin kitagawa \(my darling\), blonde hair with pink tips, school uniform, camera, 3d render, cgi, beautiful, masterpiece", aesthetic: "Marin" },
    { title: "Violet Evergarden", prompt: "1girl, violet evergarden \(violet evergarden\), blonde hair, blue dress, mechanical arms, writing letter, 3d render, cgi, emotional lighting, masterpiece", aesthetic: "Violet" },
    { title: "Saber", prompt: "1girl, artoria pendragon \(fate\), blonde hair, armor, excalibur, golden aura, 3d render, cgi, heroic, masterpiece", aesthetic: "Fate" }
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
    const baseKey = `showcase/${MODEL_ID}/anime_legends_${timestamp}_${index}`;
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
        userId: "system_nova_anime_showcase_script",
        likesCount: Math.floor(Math.random() * 100) + 50,
        bookmarksCount: Math.floor(Math.random() * 30) + 10,
        isElite: true,
        aesthetic: aesthetic,
        danbooruStyle: false,
        batch: "nova_anime_legends"
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    console.log("=== NOVA 3D CG XL - ANIME LEGENDS GENERATOR ===");
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
