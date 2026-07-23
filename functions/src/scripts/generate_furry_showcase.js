/**
 * Specialized Furry Erotic Showcase Generator
 * 
 * Generates elite showcase images for furry models focusing on 
 * world-class anthropomorphic erotic art with ultra-detailed prompts.
 * ECCHI, HENTAI & SEDUCTIVE themes in furry/anthro style.
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { executeSubstrateGeneration } from "#substrate/client";

const ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
const DEFAULT_MODEL_ID = 'nova-furry-xl'; // Using erotic model for furry art

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

const MODEL_OVERRIDE = process.env.MODEL_OVERRIDE || DEFAULT_MODEL_ID;
const CONCURRENCY = 4;

// ========================================
// ELITE FURRY EROTIC PROMPTS - Ultra High Quality
// WORLD-CLASS ANTHROPOMORPHIC ECCHI, HENTAI & SEDUCTIVE ART
// ========================================
const PROMPTS_PER_MODEL = {

    // ========================================
    // CANINE FURRY EROTIC - WOLVES, FOXES, DOGS
    // ========================================
    "wai-illustrious-erotic": [
        // FOX GIRL / KITSUNE FURRY EROTIC
        "rating_suggestive, 1girl, anthro fox girl with luxurious fluffy tail, seductive pose on silk sheets, vulpine features with elegant snout and expressive amber eyes, soft orange and white fur pattern, wearing revealing black lace lingerie, bedroom with candlelight, fluffy ears perked with desire, feminine curves with feline grace, furry art masterpiece, detailed fur texture, artistic erotica, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, kitsune furry maiden bathing in moonlit hot spring, nine flowing tails creating ethereal patterns, wet fur glistening with water droplets, traditional Japanese onsen setting, steam rising around her form, translucent silk kimono partially open, mystical seduction, yokai furry erotica, bioluminescent markings on fur, romantic atmosphere, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, playful fox girl cosplayer at convention hotel room, fluffy tail swishing with excitement, thigh-high stockings and crop top, blushing cheeks and fang smile, modern bedroom setting, intimate cosplay photography, casual seduction, fluffy paw hands, bedroom eyes, youthful furry beauty, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, elegant vixen noblewolf in Victorian boudoir, rich crimson fur with white markings, corset accentuating hourglass figure, opera glasses nearby, aristocratic furry aesthetic, mature sensuality, velvet furnishings, gaslight ambiance, sophisticated erotica, detailed fur rendering, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, desert fox girl belly dancer in silk tent, golden fur catching lantern light, coin belt and sheer veils, hypnotic hip movements, Middle Eastern inspired furry erotica, exotic seduction, warm desert colors, mysterious allure, detailed choreography pose, masterpiece, best quality, very aesthetic",
        
        // WOLF GIRL / LUPINE EROTIC
        "rating_suggestive, 1girl, dominant alpha wolf girl in leather harness, muscular yet feminine physique, grey and white fur with battle scars, piercing ice-blue eyes, industrial loft setting, BDSM aesthetic, powerful stance, wild untamed beauty, fierce seduction, detailed muscular definition under fur, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, shy omega wolf girl in cozy cabin, fluffy grey fur covering ample curves, oversized sweater slipping off shoulder, fireplace glow on fur, winter forest visible through window, innocent seduction, soft domestic furry aesthetic, blushing muzzle, warm inviting atmosphere, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, werewolf transformation mid-stage, fur sprouting on human skin, claws emerging, full moon through window, painful pleasure expression, hybrid beauty, horror-romance aesthetic, dramatic lighting, gothic furry erotica, detailed transformation anatomy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, arctic wolf ice queen on frozen throne, pristine white fur with silver tips, revealing ice crystal gown, northern lights behind her, cold regal beauty, fantasy furry royalty, crystalline palace setting, ethereal erotic majesty, detailed fur sheen, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, tribal wolf huntress after successful hunt, loincloth and leather straps, sweat on fur under jungle canopy, primitive seduction, Amazonian aesthetic, war paint markings, muscular athletic build, raw natural beauty, celebration of feminine power, masterpiece, best quality, very aesthetic",

        // CANINE / DOG GIRL EROTIC
        "rating_suggestive, 1girl, golden retriever girl next door, warm honey-colored fur, crop top and denim shorts, sunlit bedroom, playful friendly smile with tongue out, approachable beauty, girl-next-door furry fantasy, casual intimacy, bright cheerful atmosphere, detailed soft fur texture, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, husky girl in winter lodge, thick plush fur, thermal underwear peeking from open flannel shirt, snow falling outside log cabin, cozy intimate setting, warm breath visible in cold air, Alaskan wilderness aesthetic, hearty northern beauty, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, doberman security guard in underground club, sleek black and tan coat, latex uniform straining against curves, neon cyberpunk lighting, dangerous seduction, urban furry noir, assertive dominant posture, mysterious dangerous beauty, detailed glossy fur, masterpiece, best quality, very aesthetic",

        // ========================================
        // FELINE FURRY EROTIC - CATS, LIONS, TIGERS
        // ========================================
        "rating_suggestive, 1girl, seductive black cat girl on velvet chaise lounge, midnight fur absorbing light, emerald eyes glowing, sheer bodysuit, art deco penthouse, sophisticated feline grace, noir erotica, cigarette holder nearby, femme fatale aesthetic, detailed fur sheen, masterpiece, best quality, very aesthetic",
        "rating_suggesting, 1girl, white tiger priestess in ancient temple, stripes like sacred markings, ceremonial silks barely containing form, incense smoke, golden jewelry, spiritual furry erotica, mystical seduction, Asian temple architecture, divine feminine feline, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, playful calico cat girl tangled in yarn on bed, patches of orange black and white fur, innocent mischief in eyes, cozy bedroom mess, cute erotica, domestic intimacy, fluffy belly exposed, adorable seduction, slice of life furry aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, lioness warrior queen in savanna throne room, golden fur with sun-kissed highlights, minimal royal regalia, powerful regal posture, African fantasy setting, majestic erotic power, detailed muscular feline physique, warm golden lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, cheetah girl athlete in locker room, spotted fur with aerodynamic build, sports bra and shorts, victory glow, sleek fast beauty, post-race intimacy, competitive seduction, detailed spotted coat pattern, athletic furry aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, Persian cat aristocrat at masquerade ball, long flowing cream fur, elaborate gown with plunging neckline, Venetian mask, baroque palace setting, elegant refined seduction, high society furry erotica, powdered wig aesthetic on furry head, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, lynx snow girl in alpine hot tub, tufted ears and short tail, steam rising from spotted fur, mountain lodge background, winter luxury aesthetic, relaxed sensuality, après-ski intimacy, detailed spotted fur texture, masterpiece, best quality, very aesthetic",

        // ========================================
        // EXOTIC FURRY EROTIC - DRAGONS, BUNNIES, DEER, ETC
        // ========================================
        "rating_suggestive, 1girl, dragon girl in treasure hoard cave, scales shimmering like jewels on strategic areas, wings folded seductively, piles of gold coins, reptilian beauty with feminine curves, fantasy hoard seduction, dramatic cave lighting, detailed scale texture transitioning to soft skin, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, bunny girl in burlesque club, fluffy cotton tail, fishnet stockings and corset, stage spotlight, long ears with bows, playful teasing pose, classic pin-up aesthetic, burlesque furry performance, retro glamour, detailed soft fur, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, deer girl nymph in enchanted forest, soft brown fur with white spots, antlers adorned with flowers, minimal forest garb, dappled sunlight through trees, nature spirit erotica, ethereal woodland beauty, gentle innocent seduction, detailed fur and flora, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, raccoon girl thief caught in bedroom heist, bandit mask fur pattern, burglar outfit with utility belt, caught mid-action surprised expression, urban penthouse at night, mischievous seduction, thief romance aesthetic, detailed ringed tail, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, sheep girl shepherdess in alpine meadow, thick woolly fleece, traditional dirndl dress, wildflower crown, mountain sunset, pastoral erotica, innocent rural beauty, soft fluffy aesthetic, gentle nurturing seduction, detailed wool texture, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, bat girl in gothic cathedral rafters, leathery wings wrapped like cloak, pale fur, moonlight through stained glass, hanging upside down pose, vampire aesthetic, dark romantic seduction, detailed wing membrane texture, gothic furry noir, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, shark girl on tropical beach, smooth grey-blue skin, swimsuit with shark tooth accessories, surfboard nearby, ocean spray, aquatic anthro beauty, tropical paradise erotica, detailed smooth skin texture, beach babe aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, snake naga lamia in desert oasis, scales like living jewelry, coiled pose showing length, palm trees and water, hypnotic eyes, exotic serpent seduction, Arabian nights aesthetic, detailed scale patterns, mystical reptilian beauty, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, mouse girl maid in Victorian mansion, soft grey fur, frilly apron and uniform, dusting in master bedroom, petite shy figure, service submission aesthetic, detailed small cute features, domestic furry intimacy, cozy mansion setting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, horse girl centaur at stable, equine lower body with humanoid torso, brushing her coat after riding, sunset stable lighting, mythological erotica, powerful equestrian beauty, detailed coat shine on both forms, classical artistic nude inspiration, masterpiece, best quality, very aesthetic",

        // ========================================
        // FURRY YURI / LESBIAN EROTIC
        // ========================================
        "rating_suggestive, 2girls, wolf and sheep yuri couple in cozy blanket fort, predator and prey romance, contrasting fur textures, soft lighting, interspecies lesbian intimacy, cute domestic setting, gentle protective embrace, emotional connection, furry slice of life romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, fox and bunny girlfriend duo at love hotel, interspecies lesbian couple, contrasting ears and tails intertwined, modern Tokyo setting, romantic yuri erotica, playful intimate poses, detailed dual fur rendering, contemporary furry romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, lioness warrior and zebra priestess forbidden romance, African savanna backdrop, muscular feline and graceful equine forms, tribal fantasy setting, dramatic sunset lighting, interspecies yuri passion, detailed contrasting fur patterns, epic romantic scale, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, dragon and phoenix elemental lovers in celestial realm, scales and feathers intertwining, cosmic background, mythical yuri erotica, supernatural passion, divine feminine union, detailed scale and feather textures, ethereal lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, girls, cat girl harem in Ottoman-inspired pleasure palace, multiple feline beauties lounging on cushions, harem aesthetic with furry twist, soft fabrics and fur, sensual group intimacy, Middle Eastern palace architecture, detailed multiple fur types, masterpiece, best quality, very aesthetic",

        // ========================================
        // FURRY FUTA / HENTAI EXTREME
        // ========================================
        "rating_explicit, 1futa, fox futanari in intimate self-exploration, feminine curves with additional anatomy, fluffy tail wrapped around thigh, private bedroom setting, solo furry hentai, detailed genitalia on anthro form, masturbation pose, erotic self-pleasure, masterpiece, best quality, very aesthetic",
        "rating_explicit, 1futa, horse futa stablehand after workout, muscular equine build, sweat glistening on coat, post-exercise arousal, barn setting, athletic furry hentai, detailed anatomy, masculine feminine blend, powerful sexual energy, masterpiece, best quality, very aesthetic",
        "rating_explicit, 2girls, 1futa, wolf futa with rabbit girlfriend, size difference dynamic, dominant predator with submissive prey, bedroom intimacy, interspecies futa yuri, detailed penetration scene, power dynamic erotica, contrasting fur types in embrace, masterpiece, best quality, very aesthetic",
        "rating_explicit, 1futa, dragon futa on treasure pile, reptilian futanari anatomy, wings spread in pleasure display, hoard setting, fantasy futa hentai, detailed scale-covered genitalia, solo display pose, majestic erotic power, masterpiece, best quality, very aesthetic",

        // ========================================
        // FURRY BDSM / KINK EROTIC
        // ========================================
        "rating_suggestive, 1girl, submissive collared kitty in pet play scenario, leather collar with bell, kneeling pose, dominant's bedroom, BDSM furry aesthetic, obedient eyes looking up, pet play erotica, detailed collar and accessories, submissive beauty, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, bound dragoness in shibari rope harness, scales contrasting with jute ropes, suspension pose, Japanese dungeon aesthetic, rope bunny dragon, intricate knot work, BDSM artistry on anthro form, detailed scale and rope texture, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, latex-clad rubber pup in gas mask, shiny black latex over fur, industrial fetish setting, pup play aesthetic, anonymous fetish beauty, detailed latex shine on fur, underground club lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, pony girl in full harness and bridle, bit in mouth, hooves and tail plug, stable setting, pet play transformation, equestrian BDSM aesthetic, detailed harness on anthro form, submission training scene, masterpiece, best quality, very aesthetic",

        // ========================================
        // CYBERPUNK / SCI-FI FURRY EROTIC
        // ========================================
        "rating_suggestive, 1girl, cybernetic fox girl with glowing circuit tattoos, neon fur highlights, holographic lingerie, cyberpunk apartment with city view through window, tech-noir erotica, futuristic furry aesthetic, detailed cyber implants, neon lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, genetically engineered cat girl in lab containment, pristine white lab coat open, scientific facility background, bio-engineered beauty, sci-fi furry erotica, clinical yet sensual atmosphere, detailed genetic perfection, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, space wolf mercenary in starship quarters, tactical gear partially removed, view of nebula through viewport, sci-fi military erotica, interstellar furry bounty hunter, detailed futuristic armor pieces, atmospheric space lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, holographic AI bunny girl materializing in bedroom, digital glitch effects on translucent form, cyberpunk romance, virtual lover aesthetic, glitch art beauty, neon pink and cyan, holographic flicker, masterpiece, best quality, very aesthetic",

        // ========================================
        // FANTASY / MYTHOLOGICAL FURRY EROTIC
        // ========================================
        "rating_suggestive, 1girl, kitsune demigoddess at Shinto shrine, multiple ethereal tails flowing, shrine maiden outfit barely containing divine form, sacred torii gates, spiritual erotic transcendence, mythological Japanese furry, detailed luminous tails, divine feminine power, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, Anubis priestess in Egyptian tomb, jackal head with feminine body, gold jewelry and linen wrappings, hieroglyphic walls, ancient Egyptian furry erotica, afterlife seduction, detailed jackal features, torchlight atmosphere, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, minotaur princess in labyrinth throne room, bovine features with voluptuous curves, ancient Greek aesthetic, marble columns, mythological beast woman, labyrinth master seduction, detailed fur and horn texture, classical art inspiration, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, mermaid selkie shedding sealskin on rocky shore, transformation moment, sealskin half-removed revealing humanoid form, moonlit Atlantic coast, Celtic folklore erotica, magical transformation seduction, detailed seal fur texture, atmospheric coastal lighting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, phoenix harpy in volcanic nest, feathers like living flames, egg protection pose, mythological motherhood erotica, volcanic glow lighting, fiery plumage, detailed feather textures, legendary creature intimacy, masterpiece, best quality, very aesthetic",

        // ========================================
        // MODERN / CONTEMPORARY FURRY EROTIC
        // ========================================
        "rating_suggestive, 1girl, Instagram influencer cat girl in luxury apartment, selfie pose in mirror, designer lingerie, modern social media aesthetic, contemporary furry lifestyle, smartphone in paw, urban apartment setting, influencer seduction, detailed modern fashion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, OnlyFans creator wolf girl filming content, ring light and camera setup, bedroom studio, modern creator economy erotica, entrepreneurial furry beauty, professional lighting, content creation intimacy, contemporary digital age seduction, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, fitness bunny at gym, yoga pants and sports bra, post-workout glow, modern fitness center, athletic furry wellness, healthy lifestyle erotica, detailed athletic build, contemporary gym culture, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, coffee shop barista deer girl with flirtatious smile, apron over casual outfit, latte art in hand, hipster cafe setting, service with a smile erotica, modern urban furry romance, cozy coffee shop intimacy, detailed casual fashion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, nurse shark girl at underwater hospital, medical scrubs, submarine medical facility, aquatic anthro healthcare, professional medical erotica, caring nurturing seduction, detailed marine medical setting, bioluminescent lighting, masterpiece, best quality, very aesthetic"
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
        userId: "system_furry_showcase_script",
        likesCount: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: Math.floor(Math.random() * 10),
        category: "furry_erotic",
        tags: ["furry", "anthro", "erotic", "nsfw"]
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    const models = MODEL_OVERRIDE ? [MODEL_OVERRIDE] : Object.keys(PROMPTS_PER_MODEL);

    console.log("=== ELITE FURRY EROTIC SHOWCASE GENERATOR ===");
    console.log("🐾 WORLD-CLASS ANTHROPOMORPHIC ECCHI, HENTAI & SEDUCTIVE ART 🐾");
    console.log(`Models: ${models.join(", ")}`);
    if (MODEL_OVERRIDE) {
        console.log(`[OVERRIDE] Running ALL prompts on model: ${MODEL_OVERRIDE}`);
    }
    const totalPrompts = MODEL_OVERRIDE ?
        Object.values(PROMPTS_PER_MODEL).reduce((sum, p) => sum + p.length, 0) :
        models.reduce((sum, m) => sum + PROMPTS_PER_MODEL[m].length, 0);
    console.log(`Total Furry Prompts: ${totalPrompts}\n`);

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

            await sleep(2000);
        }
    }

    console.log("\n=== FURRY SHOWCASE COMPLETE ===");
    console.log("🐺 All anthro erotic images generated and uploaded 🦊");
}

main().catch(console.error);
