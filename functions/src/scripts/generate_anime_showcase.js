/**
 * Specialized Anime Showcase Generator
 * 
 * Generates elite showcase images for new anime models focusing on 
 * world-class anime pop culture icons with ultra-detailed prompts.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { executeSubstrateGeneration } from "#substrate/client";
import { loadEnv, requireB2Credentials } from "./load-env.mjs";

const ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
const DEFAULT_MODEL_ID = 'rin-anime-blend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadedEnv = await loadEnv();
if (!loadedEnv) {
    console.warn("No .env file found — using existing environment variables.");
}

const {
    B2_ENDPOINT,
    B2_REGION,
    B2_BUCKET,
    B2_KEY_ID,
    B2_APP_KEY,
    B2_PUBLIC_URL
} = requireB2Credentials();
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

const MODEL_OVERRIDE = process.env.MODEL_OVERRIDE || DEFAULT_MODEL_ID;
const CONCURRENCY = 4; // Standard SDXL concurrency

// ========================================
// ELITE ANIME PROMPTS - Ultra High Quality
// ========================================
const PROMPTS_PER_MODEL = {

    // ========================================
    // WORLD-CLASS EROTIC ART - ECCHI, HENTAI & SEDUCTIVE
    // ========================================
    "wai-illustrious-erotic": [
        // ARTISTIC ECCHI - SENSUAL ATMOSPHERE
        "rating_suggestive, 1girl, seductive elf maiden in an enchanted hot spring, steam rising around delicate porcelain skin, wet silver hair cascading down bare shoulders, luminous violet eyes with inviting gaze, soft candlelight reflections on water surface, traditional Japanese onsen architecture, cherry blossoms floating in mist, artistic nudity, high fantasy romance atmosphere, Kyoto Animation softness, romantic lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, beautiful demoness succubus reclining on velvet cushions in a gothic boudoir, crimson eyes glowing with desire, curved horns and flowing black hair, sheer lace lingerie barely concealing, moonlight streaming through stained glass windows, rich burgundy and gold color palette, mature feminine curves, sensual elegance, dark fantasy seduction, atmospheric depth, intricate fabric details, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, alluring kitsune spirit with nine glowing tails, traditional shrine maiden outfit partially open, porcelain skin with mystical markings, golden eyes with vertical pupils, soft sakura petals dancing in evening breeze, torii gate at sunset background, ethereal seduction, yokai romance aesthetic, soft focus background, magical atmosphere, artistic partial nudity, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, mermaid siren on moonlit ocean rocks, bioluminescent scales shimmering on bare skin, flowing aquamarine hair covering strategic areas, hypnotic gaze beckoning sailors, starry night sky reflection on calm waters, romantic tragedy atmosphere, fantasy pin-up elegance, soft blue and silver palette, mystical aquatic beauty, detailed water droplets on skin, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, shy shrine maiden caught in rain, wet white hakama becoming translucent, blushing cheeks and downcast eyes, traditional Japanese temple courtyard, rain droplets on flawless skin, innocent seduction, soft overcast lighting, emotional vulnerability, accidental beauty, delicate fabric cling, artistic atmospheric shot, masterpiece, best quality, very aesthetic",
        // YURI / GIRLS LOVE SENSUAL
        "rating_suggestive, 2girls, intimate moment between two schoolgirls in empty classroom after hours, shared secret, blushing proximity, afternoon light through windows, innocent exploration, romantic tension, yuri aesthetic, emotional intimacy, soft focus, coming of age tenderness, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, elegant ladies sharing a private moment in Victorian boudoir, corsets and flowing hair, whispered confidences, romantic friendship aesthetic, historical yuri, soft pastel palette, intimate feminine space, period detail, emotional closeness, masterpiece, best quality, very aesthetic",
        "rating_suggestive, girls, athletic women's volleyball team locker room camaraderie, post-game showers and laughter, healthy female bonding, sports anime sensuality, team intimacy, dynamic poses, steam and tile, celebration of feminine strength, masterpiece, best quality, very aesthetic",
        "rating_suggestive, girls, mystical priestesses performing sacred union ritual, glowing spiritual connection, flowing ceremonial robes, ancient temple setting, spiritual erotica, divine feminine energy, transcendent beauty, golden ethereal lighting, sacred intimacy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, cozy winter cabin with two women sharing body warmth under furs, fireplace glow, intimate conversation, domestic bliss, romantic slice of life, soft warm lighting, emotional security, tender closeness, hygge aesthetic, masterpiece, best quality, very aesthetic",

       ]
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));



async function generateWithSDXL(prompt) {
    console.log(`   [SDXL] Submitting: ${prompt.substring(0, 50)}...`);
    const buffer = await executeSubstrateGeneration(ENDPOINT, {
        prompt,
        model: DEFAULT_MODEL_ID,
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

async function processAndUpload(imageBuffer, modelId, index, prompt) {
    const sharpImg = sharp(imageBuffer);
    const webpBuffer = await sharpImg.webp({ quality: 90 }).toBuffer();
    const thumbBuffer = await sharpImg.resize(512, 512, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
    const lqipBuffer = await sharpImg.resize(20, 20, { fit: "inside" }).webp({ quality: 20 }).toBuffer();
    const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

    const timestamp = Date.now();
    const baseKey = `showcase/${modelId}/${timestamp}_${index}`;
    const originalKey = `${baseKey}.webp`;
    const thumbKey = `${baseKey}_thumb.webp`;

    await Promise.all([
        s3Client.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: originalKey, Body: webpBuffer, ContentType: "image/webp" })),
        s3Client.send(new PutObjectCommand({ Bucket: B2_BUCKET, Key: thumbKey, Body: thumbBuffer, ContentType: "image/webp" }))
    ]);

    const imageUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${originalKey}`;
    const thumbnailUrl = `${B2_PUBLIC_URL}/file/${B2_BUCKET}/${thumbKey}`;

    const docData = {
        modelId,
        prompt,
        imageUrl,
        url: imageUrl,
        thumbnailUrl,
        lqip,
        createdAt: FieldValue.serverTimestamp(),
        userId: "system_anime_showcase_script",
        likesCount: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: Math.floor(Math.random() * 10)
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    const models = MODEL_OVERRIDE ? [MODEL_OVERRIDE] : Object.keys(PROMPTS_PER_MODEL);

    console.log("=== ELITE ANIME SHOWCASE GENERATOR ===");
    console.log(`Models: ${models.join(", ")}`);
    if (MODEL_OVERRIDE) {
        console.log(`[OVERRIDE] Running ALL prompts on model: ${MODEL_OVERRIDE}`);
    }
    const totalPrompts = MODEL_OVERRIDE ?
        Object.values(PROMPTS_PER_MODEL).reduce((sum, p) => sum + p.length, 0) :
        models.reduce((sum, m) => sum + PROMPTS_PER_MODEL[m].length, 0);
    console.log(`Total Prompts: ${totalPrompts}\n`);

    for (const modelId of models) {
        const prompts = MODEL_OVERRIDE ?
            Object.values(PROMPTS_PER_MODEL).flat() :
            PROMPTS_PER_MODEL[modelId];
        console.log(`\n========================================`);
        console.log(`MODEL: ${modelId.toUpperCase()} (${prompts.length} prompts)`);
        console.log(`========================================`);

        // Process in concurrent batches for scale testing
        for (let i = 0; i < prompts.length; i += CONCURRENCY) {
            const batch = prompts.slice(i, i + CONCURRENCY);
            console.log(`Processing batch ${Math.floor(i / CONCURRENCY) + 1} (${batch.length} items)...`);

            await Promise.all(batch.map(async (prompt, idx) => {
                const globalIdx = i + idx;
                try {
                    const imageBuffer = await generateWithSDXL(prompt);
                    const url = await processAndUpload(imageBuffer, modelId, globalIdx, prompt);
                    console.log(`   [${globalIdx + 1}] ✓ ${url}`);
                } catch (err) {
                    console.error(`   [${globalIdx + 1}] ✗ ${err.message}`);
                }
            }));

            // [REMOVED] loadBalancer stats

            await sleep(2000);
        }
    }

    console.log("\n=== SHOWCASE COMPLETE ===");
}

main().catch(console.error);
