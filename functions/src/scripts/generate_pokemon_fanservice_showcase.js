/**
 * Pokemon Female Characters Fanservice Showcase Generator
 * 
 * Generates elite showcase images featuring famous female Pokemon trainers,
 * gym leaders, champions, and anime characters in 
 * world-class ecchi, hentai & seductive art styles.
 * Fanservice focused on female characters only.
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
const DEFAULT_MODEL_ID = 'rin-anime-blend';

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
// POKEMON FEMALE FANSERVICE PROMPTS - 50 Characters
// World-Class Erotic Art - Ecchi, Hentai & Seductive
// ========================================
const PROMPTS_PER_MODEL = {

    // ========================================
    // WAI ILLUSTRIOUS EROTIC - POKEMON FEMALE EDITION
    // ========================================
    "wai-illustrious-erotic": [
        // === MAIN SERIES PROTAGONISTS ===
        "rating_explicit, 1girl, leaf pokemon trainer seductive, kanto champion bedroom steamy, hat backwards, blue suspender skirt hiked up, sheer thigh highs, lace lingerie visible, pokeball pasties, charizard and venusaur outside, pallet town sunset, confident smirk biting lip, sweat glistening, first generation beauty, seductive pose on bed, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, kris johto trainer provocative, silver hair pigtails messy, new bark town bedroom hot, totodile and chikorita plushies watching, pokemon center after hours, pink micro bikini top, suspenders falling off shoulders, johto region steamy, 16 bit nostalgia, goldenrod city lights through window, seductive wink, sweat drops, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, may hoenn trainer irresistible, bandana askew, fanny pack dangling, littleroot town bedroom humid, torchic and mudkip peeking, contest hall victory celebration, orange bandana bikini, bike shorts pulled down, secret base intimate, delta episode aftermath, hoenn region tropical heat, body glistening, seductive pose, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, dawn sinnoh trainer captivating, beret tilted, scarf loosely draped, twinleaf town bedroom cozy, piplup and turtwig toys scattered, contest ribbon decorations, pink babydoll lingerie, dress pooled at feet, mt cornet view, snowpoint city cold contrast, warm blanket inviting, seductive gaze, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, hilda unova trainer tempting, ponytail swinging, baseball cap backwards, nuvema town bedroom intimate, oshawott and snivy cushions plush, pokemon musical costume discarded, black lace bra, denim shorts unbuttoned, team plasma aftermath, legendary dragon energy, unova region modern seduction, sweaty skin, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, rosa unova 2 trainer alluring, visor pushed up, double bun messy, aspertia city bedroom steamy, tepig and dewott posters on wall, pokestar studios after party, pink lace panties, raglan shirt lifted, world tournament victory glow, unova sequels romance, 2d animated style, seductive stretch, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, serena kalos trainer enchanting, mega ring glinting, high fashion lingerie, vaniville town bedroom luxurious, fennekin and froakie sleeping nearby, trainer custom clothes strewn about, red silk robe open, thigh high stockings, pokemon-amie max affection, lysandre labs secret, kalos region beauty, french seduction, sweaty glow, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, selene alola trainer exotic, tropical heat glistening, floral bikini top, hauoli city bedroom sunset, rowlet and popplio plush watching, festival plaza night lights, short shorts tight, loose tank top see-through, ultra wormhole energy lingering, alola region island passion, z-move pose seductive, hawaiian aesthetic steamy, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, gloria galar trainer charming, beanie tilted, tartan skirt lifted, postwick bedroom cozy, scorbunny and sobble socks on floor, wyndon stadium champion celebration, dynamax energy crackling, galar region industrial chic, league card revealing, british elegance sensual, sweat on skin, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, akari hisui trainer mystical, galaxy team uniform unbuttoned, jubilife village tent intimate, cyndaquil and oshawott resting close, alpha pokemon encounter adrenaline high, traditional japanese undergarments exposed, ancient sinnoh region magic, noble pokemon blessing aura, feudal japan aesthetic sensual, seductive traditional pose, masterpiece, best quality, very aesthetic, nsfw",

        // === GYM LEADERS ===
        "rating_explicit, 1girl, misty cerulean gym leader wet dream, red suspenders falling, yellow crop top see-through, side ponytail dripping, starmie and psyduck enjoying view, cerulean city gym pool steamy, water type beauty glistening, gym badge case open, orange islands nostalgia, kasumi classic anime style, seductive poolside pose, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, erika celadon gym leader sensual, elegant kimono slipping off shoulders, vileplume and bellossom releasing spores, perfume shop after hours intimate, grass type mistress enchanting, japanese beauty exposed, black hair traditional seductive, celadon city greenhouse humid, incense smoke hazy, mysterious inviting smile, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, sabrina saffron gym leader hypnotic, psychic type mistress dominant, elegant dress hiked up, spoon prop suggestive, alakazam and mr mime mesmerized, gym leader conference room secret, mysterious aura glowing, red eyes piercing, black hair straight seductive, kanto region power exchange, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, whitney goldenrod gym leader playful, pink hair pigtails bouncing, normal type cutie tempting, miltank and clefairy cheering, goldenrod gym bedroom fun, pink lace lingerie, shorts tight, roller skates suggestive pose, johto region adorable sexy, winking with tongue out, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, clair blackthorn gym leader fierce, dragon type master commanding, blue hair ponytail wild, skin tight bodysuit unzipped, cape flowing dramatically, dragonair and kingdra coiling, blackthorn gym dragon's den steamy, johto region elegant dominance, mastery pose seductive, sweat on battle-worn skin, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, flannery lavaridge gym leader scorching, red hair wild messy, fire type hothead passionate, torkoal and slugma heating up, volcanic hot spring steam, towel barely covering, steam rising seductive, hoenn region temperature rising, passionate expression needy, glistening wet skin, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, winona fortree gym leader breezy, flying type bird keeper free, blue hair winged helmet askew, cloud dress flowing transparent, altaria and swablu feathers floating, fortree city treehouse swaying, sky pillar view breathtaking, hoenn region wild abandon, bird master pose inviting, upskirt wind, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, skyla mistralton gym pilot daring, blue hair tied up messy, pilot goggles on forehead, shorts unzipped jacket open, swanna and unfezant watching, mistralton airfield sunset, cockpit intimate confined space, unova region skies high, confident pilot pose legs spread, uniform tight revealing, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, caitlin unova elite four dreamy, long blonde hair flowing wild, psychic type noble exposed, metagross and reuniclus guarding, unova league castle bedroom lavish, elegant nightgown sheer, sleeping beauty aura sensual, midnight castle atmosphere romantic, bed inviting spread, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, korrina shalour city gym energetic, blonde hair ponytail swinging, fighting type master toned body, lucario and hawlucha training, roller skates kicking up, shorts tight athletic, tank top sweat soaked, tower of mastery echoing, mega evolution aura passionate, kalos region energy kinetic, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, mallow akala island trial captain luscious, green hair flower wilting, grass type cook tempting, tsareena and shaymin admiring, lush jungle background steamy, chef apron only lingerie, alola region islander exotic, cooking together intimacy sensual, tropical heat dripping sweat, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lana akala island trial captain dripping, blue hair short wet, water type diver immersed, primarina and lapras splashing, ocean diving intimacy deep, swimsuit see-through clinging, fishing gear cast aside, alola region tropical wet, beach sunset golden, wet hair seductive, captain mermaid allure, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, nessa hulbury gym leader stunning, dark skin beauty glistening, water type model posing, drednaw and goldeen circling, gym stadium showers steamy, long blue hair cascading, athletic wear soaked transparent, championship match victory glow, galar region coast wild, seductive shower pose, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, bea stow-on-side gym fierce, blonde hair short spiky, fighting type karateka powerful, sirfetchd and machamp impressed, training dojo after hours private, gi completely open naked, sweat glistening muscles, galar region hotblooded passion, muscular feminine beauty, confident combat stance nude, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, melony circhester gym leader mature seduction, white hair elegant flowing, ice type master cool confidence, lapras and frosmoth chilling, ice cavern bedroom frosty, winter coat open lingerie, age beauty experienced, galar region cold heat contrast, experienced seduction skilled, cougar allure inviting, masterpiece, best quality, very aesthetic, nsfw",

        // === ELITE FOUR AND CHAMPIONS ===
        "rating_explicit, 1girl, lorelei kanto elite four sophisticated, glasses steamy, ice type specialist cool heat, lapras and cloyster frozen pleasure, indigo plateau bedroom elite, business suit disheveled open, red hair glasses sexy librarian, sophisticated beauty dominant, champion room intimacy secret, desk spread inviting, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, phoebe hoenn elite four ethereal, ghost type shrine maiden mysterious, purple hair short wild, dusknoir and sableye watching spectral, mt pyre view spiritual, traditional dress falling off, mysterious spiritual beauty naked, hoenn region mystical sensual, shrine maiden purity corrupted, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, cynthia sinnoh champion goddess, blonde hair flowing golden, black and gold dress pool at feet, garchomp and spiritomb bowing, celestial town bedroom royal, champion aura commanding, mature elegance supreme, black coat cape only, sinnoh region ultimate mistress, throne spread dominant, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, cynthia beach vacation bombshell, blonde hair wet dripping, bikini barely there, garchomp surfboard phallic, sinnoh region tropical paradise, mature beauty sun-kissed, sunglasses cool, beach towel invitation, summer heat scorching, milf goddess pose, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, iris unova champion dragon queen, purple hair long wild, dragon type master powerful, haxorus and hydreigon dominant, unova league throne inherited, young beauty fierce, traditional dress revealing, white cape flowing, dragon dance pose erotic, champion bedroom intimate, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, diantha kalos champion celebrity, blonde hair elegant styled, gardevoir and goodra attending, kalos region actress famous, red carpet gown pooled, celebrity beauty exposed, lysandre labs secret encounter, flamboyant elegance naked, actress dressing room intimate, mirror reflection sexy, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, sonia galar professor assistant naughty, orange hair wavy messy, yamper and charizard loyal, wyndon bedroom research break, research assistant outfit disheveled, scarf and coat discarded, galar region fame scandalous, british elegance cheeky, laboratory after hours steamy, bent over desk inviting, masterpiece, best quality, very aesthetic, nsfw",

        // === TEAM VILLAINS ===
        "rating_explicit, 1girl, jessie team rocket criminal seductress, red hair long wild, arbok and wobbuffet accomplices, team rocket uniform skin tight, pokemon center heist celebration, classic anime villain sexy, jessie pose iconic, criminal seduction dangerous, latex shine, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, shelly team aqua pirate mistress, blue hair short wild, pirate captain style dominant, kyogre awakening sexual tension, team aqua uniform wet transparent, lilycove city hideout steamy, ocean beauty salt-kissed, water type extremist passionate, villainess dungeon mistress, treasure chest bed, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, courtney team magma fire temptress, red hood fallen back, fire type scientist burning, groudon awakening primal heat, team magma uniform ash-stained, mt chimney base volcanic steam, volcanic heat intense, mask off face exposed, mysterious beauty sweating, villain passion explosive, lava light glow, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, mars team galactic space goddess, red hair short sleek, space obsession transcendental, dialga and palkia cosmic, team galactic uniform futuristic, veilstone city building penthouse, devoted admin worship, sinnoh region cosmos erotic, villain worship pose submissive, zero gravity sensual, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, jupiter team galactic commandress dominant, purple hair short sharp, commandress style authoritarian, skuntank and toxicroak obedient, team galactic executive power, cold and calculating seduction, sinnoh region villainess femdom, uniform tight leather, executive desk spread, punishment fantasy, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, anthea team plasma love goddess, pink hair long flowing, goddess of love divine, zekrom and reshiram witnessing, n castle throne room sacred, team plasma uniform pure white, unova region liberation erotic, muse beauty inspiring, white cape angelic, divine intervention sexual, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, concordia team plasma harmony sensual, blonde hair long peaceful, goddess of harmony balancing, n castle peaceful afterglow, team plasma white dress flowing, unova region serenity intimate, divine beauty tranquil, calming aura sexual healing, white wings spread, angelic submission, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, malva team flare destruction beautiful, red hair wild untamed, fire type elite four burning, yveltal and talonflame circling, lysandre labs aftermath steamy, team flare uniform flames, kalos region extremist passion, passionate reporter exposed, destruction beauty apocalyptic, burning bed passion, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, plumeria team skull punk princess, pink hair long rebellious, poison type admin dangerous, golisopod and salazzle edgy, shady house po town graffiti, team skull uniform punk, alola region outcast sexy, bad girl aesthetic tempting, skull tattoo revealing, punk rock bedroom, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lusamine aether foundation milf goddess, blonde hair elegant perfect, motherly beauty sinful, lillie and gladion mother taboo, nihilego and pheromosa symbiosis, aether paradise bedroom luxury, ultra beast research intimate, alola region tragedy sensual, mature elegance predatory, cougar seduction intense, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lusamine ultra beast fusion corrupted, blonde hair glowing otherworldly, symbiont beauty alien, ultra space aura psychedelic, aether president transformed, mature seduction enhanced, legendary energy coursing through body, alola region cosmic orgasm, tentacle symbiosis erotic, otherworldly pleasure, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, oleana macro cosmos secretary fantasy, red hair professional naughty, secretary elegance provocative, copperajah and garbodor industrial, rose tower penthouse executive, business suit tight latex, galar region industry scandal, wealthy executive affair, chairman secretary power play, desk submission pose, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, marnie galar gym leader goth lolita, black hair short emo, dark type idol punk rock, morpeko and obstagoon mosh pit, spikemuth bedroom backstage, punk aesthetic sexy, team yell cheering crowd, galar region goth tempting, cute and dark corrupted, idol service pose, masterpiece, best quality, very aesthetic, nsfw",

        // === ANIME AND SPECIAL CHARACTERS ===
        "rating_explicit, 1girl, serena xy anime performer steamy, brown hair long flowing, blue ribbon gift unwrapped, braixen and pancham fans, kalos region performer center stage, showcase costume revealing, performer outfit cabaret, dance pose pole, amourshipping beauty triumphant, spotlight seduction, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, dawn anime contest coordinator cute, blue hair long styled, pink dress contest victory, piplup and buneary applauding, sinnoh region coordinator famous, twin tails bouncing, contest appeal pose erotic, pearlshipping beauty desired, stage spread celebration, ribbon decoration body, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, may anime contest hoenn sweetheart, brown hair bandana askew, torchic and beautifly cheering, hoenn region coordinator popular, orange and green outfit modified, contest ribbon pose inviting, advanceshipping beauty nostalgic, pokemon contest scandalous, judge's favorite spread, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, misty anime classic wet fantasy, orange hair side pony wet, togepi and psyduck enjoying show, cerulean gym swimsuit competition, orange islands bikini tropical, water pokemon training sensual, kasumi classic beauty iconic, pokeshipping nostalgia sexy, poolside pinup legendary, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lillie alola anime innocent corruption, blonde hair long pure, white dress flowing transparent, snowy and clefairy curious, aether foundation escape steamy, alola region gentle corrupted, lusamine daughter rebellion, nebby cosmog evolution watching, sun and moon beauty awakening, innocence lost seductive, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lillie z-powered form battle lust, blonde hair z-crystal glow arousing, sporty outfit victory sweat, battle ready stance erotic, alola region champion potential sexual, z-move pose ecstatic, pokemon school uniform disheveled, power surge orgasmic, transformation ecstasy, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, mallow anime sweet temptation, green hair flower blooming, tsareena and shaymin guarding, aina kitchen cook aphrodisiac, tropical dress see-through, alola region sweet dessert, trial captain beauty serving, cooking apron only naked, sweetshipping aesthetic delicious, food play erotic, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, lana anime ocean mermaid wet, blue hair short soaked, primarina and sandy splashing, ocean lover diving deep, swimsuit dissolved sea water, fishing rod cast phallic, alola region diver pearl, captain mermaid legend, blue shipping beauty treasure, underwater fantasy breathless, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, chloe pokemon journeys modern girl, black hair short stylish, eevee and yamper cute props, sakuragi institute research break, researcher outfit lab coat only, project mew secret mission, kanto region modern dating, goh friend benefits, new series beauty trending, laboratory table spread, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, zinnia lorekeeper dragon tamer wild, black hair short fierce, red cloak flowing open naked, rayquaza and mega rayquaza dominating, sky pillar summit exhibitionist, delta episode crisis erotic, hoenn region ancient fertility ritual, lorekeeper beauty primal, dragon whisperer submission, outdoor exposure thrilling, masterpiece, best quality, very aesthetic, nsfw",
        "rating_explicit, 1girl, zinnia casual asteroid town girl, black hair messy bedhead, ancient sinnoh descendant fertile, space center visit after hours, brendan rival tension sexual, hoenn region wild child, tomboy beauty secret feminine, space meteorite phallic, bedroom experiment naughty, masterpiece, best quality, very aesthetic, nsfw",
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
        userId: "system_pokemon_fanservice_script",
        likesCount: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: Math.floor(Math.random() * 10)
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    const models = MODEL_OVERRIDE ? [MODEL_OVERRIDE] : Object.keys(PROMPTS_PER_MODEL);

    console.log("=== POKEMON FEMALE CHARACTERS FANSERVICE SHOWCASE ===");
    console.log("Famous Pokemon Female Trainers - Ecchi, Hentai & Seductive");
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

            await sleep(2000);
        }
    }

    console.log("\n=== POKEMON FANSERVICE SHOWCASE COMPLETE ===");
    console.log("All female character showcases generated and uploaded!");
}

main().catch(console.error);
