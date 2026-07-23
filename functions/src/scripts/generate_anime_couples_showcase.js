/**
 * Anime Couples & Fanfic Shipping Showcase Generator
 * 
 * Generates elite showcase images featuring famous anime couples,
 * popular ship pairings, and romantic fanfic scenarios in 
 * world-class ecchi, hentai & seductive art styles.
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
// FAMOUS ANIME COUPLES & SHIPPING PROMPTS
// World-Class Erotic Art - Ecchi, Hentai & Seductive
// ========================================
const PROMPTS_PER_MODEL = {

    // ========================================
    // WAI ILLUSTRIOUS EROTIC - COUPLES EDITION
    // ========================================
    "wai-illustrious-erotic": [
        // === ATTACK ON TITAN SHIPS ===
        "rating_suggestive, 1boy, 1girl, eren yeager and mikasa ackerman passionate embrace in destroyed cathedral, torn military uniforms, he lifts her against crumbling stone wall, her black hair flowing around them, intense eye contact full of unspoken desire, sunset light through broken stained glass, blood and passion, desperate wartime romance, detailed odm gear, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, levi ackerman and petra ral intimate moment in scout barracks, he pins her wrists above her head against wooden wall, her blonde hair spread on pillow, cravat loosened, bandages and healing touches, forbidden superior-subordinate tension, candlelit intimacy, attack on titan aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, eren yeager and historia reiss secret rendezvous in crystal cave, royal dress partially undone, intimate confession scene, soft bioluminescent lighting, complex political romance, gentle embrace, emotional vulnerability, fate-bound lovers, masterpiece, best quality, very aesthetic",

        // === DEMON SLAYER SHIPS ===
        "rating_suggestive, 1boy, 1girl, tanjiro kamado and kanao tsuyuri wedding night consummation, traditional Japanese bridal attire, hanafuda earrings visible, butterfly hairpin loosened, gentle inexperienced passion, soft lantern lighting, tatami room setting, tender first time, protective embrace, kimetsu no yaiba aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, zenitsu agatsuma and nezuko kamado moonlit garden romance, pink eyes glowing with affection, she wears bamboo muzzle, he trembles with desire, cherry blossoms falling around them, forbidden human-demon love, gentle touches, fear and longing, soft night atmosphere, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, giyu tomioka and shinobu kocho rain-soaked confession under bridge, water dripping from haori, wet butterfly hair ornament, stoic meets playful seduction, demon slayer uniforms clinging to skin, stormy romantic atmosphere, opposites attract tension, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, inosuke hashibira and aoi kanzaki kitchen encounter, boar mask off revealing beautiful face, apron strings untied, competitive flirting, food fight turning intimate, tsundere dynamic, muscular physique, domestic chaos romance, comedic ecchi, masterpiece, best quality, very aesthetic",

        // === MY HERO ACADEMIA SHIPS ===
        "rating_suggestive, 1boy, 1girl, izuku midoriya and ochaco uraraka zero gravity bedroom scene, she floats above him in lingerie, green hair tousled, freckled blushing faces, quirk accident causing intimate positions, u.a. high dorm setting, childhood friends to lovers, innocent exploration, superhero uniforms discarded, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, katsuki bakugo and camie utsushimi explosive passion, victory celebration intimacy, ash blonde spiky hair, glamorous curves, confident seduction meets aggressive desire, torn hero costumes, competitive sexual tension, plus ultra energy, confident mature woman teaching, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, shouto todoroki and momo yaoyorozu study session turning intimate, creation quirk making silk sheets, half-hot half-cold temperature play, rich elegant bedroom, intelligent reserved passion, u.a. elite class romance, formal wear partially undone, intellectual equals, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, ochaco uraraka and tsuyu asui midnight hot springs class trip, frog quirk unique anatomy appreciation, zero gravity water droplets floating, u.a. girls bonding moment, innocent curiosity, amphibian features, bubbly playful atmosphere, friendship with benefits, masterpiece, best quality, very aesthetic",

        // === NARUTO SHIPS ===
        "rating_suggestive, 1boy, 1girl, naruto uzumaki and hinata hyuga honeymoon night, byakugan glowing with love, whisker marks, gentle passion, konoha hotel suite, years of pining fulfilled, soft embraces, seal markings on skin, established couple intimacy, mature shippuden versions, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, sasuke uchiha and sakura haruno angry reunion passion, sharingan activated with desire, pink hair spread on forest floor, bite marks, complicated toxic love, missing-nin danger, medical ninja healing touches, dark edgy romance, redemption through intimacy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kakashi hatake and anko mitarashi maskless secret encounter, scar revealed, snake summons coiling suggestively, jounin private quarters, experienced mature passion, hidden leaf village night, teacher romance, mysterious allure, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, minato namikaze and kushina uzumaki flashback passion, red hair like flames, fourth hokage cloak on floor, sealing formula glowing around bed, young love before tragedy, konoha apartment sunset, destined soulmates, pre-parenthood intimacy, masterpiece, best quality, very aesthetic",

        // === ONE PIECE SHIPS ===
        "rating_suggestive, 1boy, 1girl, monkey d luffy and boa hancock amazon lily palace chamber, snake princess submitting to pirate king, love sickness cure, milky dial lighting, empress crown discarded, size difference, yandere devotion, amazon warriors peeking, forbidden royalty romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, roronoa zoro and tashigi mistaken identity passion, swords crossed then bodies, green hair and glasses off, marine base secret, aggressive competitive sex, three sword style innuendo, smoke filling room, enemy lovers, mistaken for kuina, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, sanji vinsmoke and nami post-bath towel encounter, eyebrow heart activated, orange hair wet curves, kitchen table intimacy, gentleman pervert fulfillment, chef apron only, going merry cabin, wanted poster on wall, blonde prince and cat burglar, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, trafalgar law and nico robin quiet academic passion, devil fruit research notes scattered, tattoos and archaeology, submarine cabin, mature intellectual connection, darkness devil fruit shadows caressing, surgical precision meets historical knowledge, masterpiece, best quality, very aesthetic",

        // === DRAGON BALL SHIPS ===
        "rating_suggestive, 1boy, 1girl, goku and chi-chi martial arts training turning intimate, sparring match submission hold, turtle gi torn, black hair in wild disarray, super saiyan glow reflected in eyes, kame house bedroom, powerful warrior couple, passionate reunion after tournament, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, vegeta and bulma capsule corp laboratory passion, prince of saiyans dominated by genius scientist, blue hair and gravity training, arrogance melting to desire, scouter beeping ignored, royal pride and earthling innovation, opposites explosive chemistry, futuristic bedroom, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, gohan and videl great saiyaman secret identity reveal, superhero costume partially removed, crime fighting adrenaline intimacy, satan city rooftop, black spiky hair and short bob, high school romance, hidden powers and normal life, mask removal during passion, masterpiece, best quality, very aesthetic",

        // === SWORD ART ONLINE SHIPS ===
        "rating_suggestive, 1boy, 1girl, kirito and asuna floating castle honeymoon suite, nervegear sensory immersion, black swordsman and flash, virtual world passion bleeding into reality, cabin on 22nd floor, yui's presence blessing, digital particles and real emotions, mmorpg wedding night, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kirito and sinon ggo sniper nest intimacy, blue hair and cat ears, virtual gun versus sword submission, cave hideout, adrenaline post-battle sex, pale skin in virtual sunlight, death game survivors comfort, alfheim online aesthetics, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, asuna and leafa fairy dance sisterly bonding, alfheim wings intertwined, fairy cage rescue aftermath, virtual elf bodies glowing, magical particle effects, sibling rivalry turned appreciation, virtual world freedom, yuri undertones, aincrad survivors, masterpiece, best quality, very aesthetic",

        // === FULLMETAL ALCHEMIST SHIPS ===
        "rating_suggestive, 1boy, 1girl, edward elric and winry rockbell automail maintenance turning intimate, wrench set aside, blonde braided hair and golden ponytail, risembool countryside, childhood friends finally together, mechanical precision and tender care, short king and tall queen, automail ports sensitive, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, roy mustang and riza hawkeye military office late night, gloves off ignition sparks, blonde hair in military bun, miniskirt uniform, flame alchemy warming the room, subordinate superior forbidden, ishvalan war survivors comfort, documentation scattered, mustang's ambitions, masterpiece, best quality, very aesthetic",

        // === STEINS GATE SHIPS ===
        "rating_suggestive, 1boy, 1girl, okabe rintaro and makise kurisu lab coat lovers, future gadget laboratory after hours, red hair and lab mem badge, mad scientist persona dropped, time travel stress relief, @channeler and tsundere genius, phone microwave nearby, akihabara night through window, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, okabe rintaro and mayuri shiina childhood promise fulfilled, cosplay outfit partially undone, gentle hikikomori guardian love, sewing machine forgotten, tender protection, time loop desperation making passion urgent, mayushii's innocent devotion, beta world line happiness, masterpiece, best quality, very aesthetic",

        // === RE ZERO SHIPS ===
        "rating_suggestive, 1boy, 1girl, subaru natsuki and emilia roswaal mansion bedroom, silver hair and half-elf ears, return by death trauma comfort, puck's absence allowing intimacy, royal selection candidate and knight, lap pillow leading to more, jealously inducing love, magical particles floating, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, subaru natsuki and rem oni horn revealed, blue hair and demonic possession, devoted maid absolute submission, curse mark glowing, twin sister jealousy, intense yandere level devotion, crusch mansion cellar, chains and loyalty, protective possessive love, masterpiece, best quality, very aesthetic",

        // === CODE GEASS SHIPS ===
        "rating_suggestive, 1boy, 1girl, lelouch lamperouge and c.c eternal witch contract consummation, green hair and geass symbol, pizza boxes scattered, ashford academy hidden room, immortality and mortality intertwined, zero mask nearby, code and geass contract, centuries of loneliness healed, green glowing intimate, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lelouch lamperouge and shirley fenette tragic romance, orange hair and student council room, memory loss and rediscovery, gentle pure love, poolside confession aftermath, britannian academy setting, childhood friend winning, nightmare fuel gentleness, golden afternoon light, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, suzaku kururugi and euphemia li britannia forbidden royalty romance, pink hair and white knight uniform, controversial massacre princess redemption, ashford garden gazebo, knight and princess chivalric love, sakuradite glow, elevation difference, tragic destined lovers, masterpiece, best quality, very aesthetic",

        // === DEATH NOTE SHIPS ===
        "rating_suggestive, 1boy, 1girl, light yagami and misa amane kira worship bedroom scene, blonde gothic lolita and brown hair genius, shinigami eyes contract, yandere devotion and calculated manipulation, hotel penthouse suite, death note open on nightstand, rem watching protectively, god of new world romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, light yagami and takada kira spokesperson secret meetings, news anchor professional attire, strategic alliance sex, yotsuba corporation building, career ambition and power, silky black hair and death note possession, media manipulation foreplay, silver spoon dominance, masterpiece, best quality, very aesthetic",

        // === TOKYO GHOUL SHIPS ===
        "rating_suggestive, 1boy, 1girl, kaneki ken and touka kirishima anteiku coffee shop after hours, kagune and quinque set aside, black hair and eyepatch, ghoul and half-ghoul acceptance, tokyo night rain, re cafe basement, mask removal intimacy, bitter coffee taste kisses, monster acceptance love, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kaneki ken and rize kamishiro what-if romance, purple hair and binge eating, bookstore meeting leading to bedroom, different timeline, glasses and literary discussion, ghoul hunger metaphor, sophisticated predator seduction, beauty and beast dynamic, alternative fate, masterpiece, best quality, very aesthetic",

        // === EVANGELION SHIPS ===
        "rating_suggestive, 1boy, 1girl, shinji ikari and asuka langely soryu nerv locker room tension, plugsuits partially removed, red hair and blue eyes, competitive tsundere passion, entry plug scent, angel battle adrenaline, german and japanese fusion, apartment cohabitation frustration release, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, shinji ikari and rei ayanami clone compassion intimacy, blue hair and red eyes, white plugsuit peeled away, lcl scented skin, dummy plug revelation aftermath, angelic and human connection, yui's image complicated desire, hospital and moon imagery, ethereal pale passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kaji ryoji and misato katsuragi adult reunion passion, cross necklace and nerv captain, penguin penpen watching, beer cans scattered, mature experienced love, second impact survivors, watermelon shared, tokyo-3 apartment, whiskey and regrets, masterpiece, best quality, very aesthetic",

        // === HORIMIYA SHIPS ===
        "rating_suggestive, 1boy, 1girl, izumi miyamura and kyouko hori secret side encounter, tattoos and piercings revealed, housewife fantasies fulfilled, afternoon delight while parents away, gentle pierced boy and aggressive popular girl, domestic bliss, contrast personas, hidden self acceptance, cozy bedroom, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, toru ishikawa and yuki yoshikawa student council room intimacy, blonde cheerful exterior dropped, insecure truth revealed, supporting character passion, friendship group complications, school festival aftermath, gym storage room, youthful experimentation, emotional connection, masterpiece, best quality, very aesthetic",

        // === BUNGO STRAY DOGS SHIPS ===
        "rating_suggestive, 1boy, 1girl, osamu dazai and chuuya nakahara tensei agency rivalry passion, port mafia and armed detective, hat discarded on floor, bandaged arms and choker, suicidal maniac meets gravity queen, ability canceling intimacy, yokohama skyline night, ex-partners complicated history, violence and desire, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, atsushi nakajima and kyouka izumi tiger and demon snow, orphan comforting orphan, ability control training, yokohama safe house, white tiger and black kimono, gentle first love, assassination past healing, master disciple forbidden, japanese aesthetics, masterpiece, best quality, very aesthetic",

        // === JUJUTSU KAISEN SHIPS ===
        "rating_suggestive, 1boy, 1girl, yuji itadori and nobara kugisaki mission success celebration, cursed energy spent, straw doll technique set aside, pink hair and brown bob, confident assertive woman leads, tokyo jujutsu high dorm, battle couple dynamics, nail hammer forgotten, physical affection post danger, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, megumi fushiguro and miwa kasumi reserved passion, shadow techniques and new shadow style, glasses removal, ten shadows and simple domain, quiet library encounter, tokyo and kyoto school alliance, shikigami watching, stoic exterior melting, tactical partnership intimacy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, satoru gojo and utahime iori infinity barrier bedroom, blindfold removed revealing blue eyes, shrine maiden outfit, teacher romance, limitless technique passion, jujutsu high principal's office, teasing arrogant sorcerer and serious traditionalist, six eyes intensity, traditional meets modern, masterpiece, best quality, very aesthetic",

        // === CHAINSAW MAN SHIPS ===
        "rating_suggestive, 1boy, 1girl, denji and power messy apartment cohabitation, blood demon and chainsaw devil, cat and dog dynamic, public safety devil hunter dorm, chaotic destructive passion, hayakawa family apartment, no boundaries roommates, horns and pull cord, genuine affection beneath violence, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, denji and makima control devil domination, red hair and ringed eyes, contract fulfillment reward, idol worship corrupted, master and pet reversed, tokyo devil hunter headquarters, power imbalance, grooming and Stockholm syndrome, cigarette smoke, manipulative seduction, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, aki hayakawa and himeno ghost devil contract aftermath, alcohol and cigarette breath, eye patch and future devil prophecy, mourning and living passion, tokyo bar bathroom, cursed sword set aside, partners to lovers, professional boundaries crossed, grief comfort sex, masterpiece, best quality, very aesthetic",

        // === SPY X FAMILY SHIPS ===
        "rating_suggestive, 1boy, 1girl, loid forger and yor briar spy versus assassin secret identities, stiletto heels and spy gadgets, fake marriage turning real, berlint apartment anya sleeping nearby, thorn princess and twilight, professional skills in bedroom, secret keeping foreplay, double life tension, domestic thriller, masterpiece, best quality, very aesthetic",

        // === KAGUYA-SAMA SHIPS ===
        "rating_suggestive, 1boy, 1girl, miyuki shirogane and kaguya shinomiya finally together bedroom, student council room after hours, ice queen melted, love is war victory, shuchi'in academy elite, intellectual equals passion, pride and confession fulfilled, how cute the morning after, psychological battle won, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, yu ishigami and togo no. 1 gaming session intimacy, dark room console glow, recluse girl and reformed delinquent, online friend to real lover, supportive senpai noticed, acceptance and healing, virtual reality headset, introvert romance, genuine connection, masterpiece, best quality, very aesthetic",

        // === VIOLET EVERGARDEN SHIPS ===
        "rating_suggestive, 1boy, 1girl, violet evergarden and gilbert bougainvillea major reunion passion, auto memories doll and military major, i love you understanding, mechanical hands exploring human warmth, leiden seaside cottage, letters and waiting, emotional growth culmination, adult violet, scarred past healing, masterpiece, best quality, very aesthetic",

        // === YOUR NAME SHIPS ===
        "rating_suggestive, 1boy, 1girl, tachibana taki and miyamizu mitsuha body swap aftermath reunion, red shrine cord symbolism, comet miracle survival, itomori lake morning, braided hair and city boy, time separated lovers united, kiminonawa destiny, rural shrine and tokyo skyline, forgotten dreams remembered, masterpiece, best quality, very aesthetic",

        // === WEATHERING WITH YOU SHIPS ===
        "rating_suggestive, 1boy, 1girl, morishima hodaka and amano hina sunshine girl bedroom, rain stopping miracle, shibuya rooftop hideout, runaway and weather maiden, 100% prayer answered, sun shower through window, age gap tension, sacrifice and rescue, shinjuan archipelago, sunshine after rain, masterpiece, best quality, very aesthetic",

        // === CLANNAD SHIPS ===
        "rating_suggestive, 1boy, 1girl, okazaki tomoya and furukawa nagisa family love consummation, dango daikazoku nursery, bakery after hours, orange hair and school uniform, illness and devotion, emotional visual novel passion, hikarizaka high memories, gentle supportive love, parent approval, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, okazaki tomoya and sakagami tomoyo student council president passion, silver hair and school stairs, delinquent and honor student, time jump adult versions, city council and family man, rekindled old flame, parallel world longing, what could have been fulfilled, masterpiece, best quality, very aesthetic",

        // === TORADORA SHIPS ===
        "rating_suggestive, 1boy, 1girl, takasu ryuuji and aisaka taiga tiger and dragon wedding night, petite violent tsundere and gentle househusband, christmas eve confession fulfilled, ohashi high school graduation, towering amazon mother genes, palm top tiger tamed, scary face and flat chest, scrapbooking memories, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kitamura yuusaku and kashii nanako student council romance, glasses and glasses, vice president and classmate, christmas star understanding, parallel couple to main, blue hair and brown, quiet library passion, ohashi high uniform, summer festival yukata, masterpiece, best quality, very aesthetic",

        // === GOLDEN TIME SHIPS ===
        "rating_suggestive, 1boy, 1girl, tada banri and kaga kouko amnesia recovery passion, law school lovers, yanagisawa festival misunderstanding resolved, blonde curls and mirror trauma, mitsuo rejection to acceptance, tokyo university setting, fireworks festival yukata, ghost banri watching, new memories making, masterpiece, best quality, very aesthetic",

        // === PLASTIC MEMORIES SHIPS ===
        "rating_suggestive, 1boy, 1girl, mizugaki tsukasa and isla giftia limited time passion, terminal service one office, android lifespan countdown, white hair and red eyes, synthetic soul real love, tea and terminal moments, saiba corporation, 81920 hours remaining, bittersweet intimacy, acceptance of loss, masterpiece, best quality, very aesthetic",

        // === ANGEL BEATS SHIPS ===
        "rating_suggestive, 1boy, 1girl, otonashi yuzuru and tachibana kanade afterlife battlefront graduation, angel player program, silver hair and hand sonic, guild dungeon intimacy, passing on fulfilled love, yuri nakamura blessing, afterlife school purgatory, heart donor connection, my soul your beats, masterpiece, best quality, very aesthetic",

        // === LITTLE BUSTERS SHIPS ===
        "rating_suggestive, 1boy, 1girl, naoe riki and natsume rin cat and reliable protagonist, artificial world revelation, pink hair and baseball, kud after route, key visual novel aesthetic, school dormitory sunset, childhood friends to lovers, masato and kengo approving, saigusa haruka chaotic, masterpiece, best quality, very aesthetic",

        // === AIR SHIPS ===
        "rating_suggestive, 1boy, 1girl, kunisaki yukito and kamio misuzu summer curse breaking, thousandth summer legend, blonde hair and puppet, seaside town intimacy, winged beings reincarnation, goal and dreams fulfilled, key visual novel, temples and ocean, mother daughter curse, winged passion, masterpiece, best quality, very aesthetic",

        // === KANON SHIPS ===
        "rating_suggestive, 1boy, 1girl, aizawa yuuichi and tsukimiya ayu seven years waiting, brown cape and red hairband, taiyaki sharing, snow girl miracle, hibernation awakening, city returning to town, lost memories restored, ayu ayu catchphrase, key visual novel winter, christmas tree miracle, masterpiece, best quality, very aesthetic",

        // === DATE A LIVE SHIPS ===
        "rating_suggestive, 1boy, 1girl, itsuka shidou and tohka yatogami sealed spirit passion, purple hair and astral dress, ratatoskr fraxinus airship, spacequake shelter intimacy, sealing kiss leading further, tenka alternate personality, inverse spirit seduction, origami tobiichi watching, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, itsuka shidou and tokisaki kurumi clock spirit yandere time stop, heterochromia and gothic lolita, zafkiel bullet bedroom, date training escalated, spirit number three seduction, killing and loving, raizen high school roof, time manipulation passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, itsuka shidou and yoshino ice spirit shyness, puppet yoshinon watching, inverse form confidence, four divinity intimacy, raizen high cultural festival, yamamai kaguya and yuzuru threesome potential, spirit harem complexity, puppet show after dark, masterpiece, best quality, very aesthetic",

        // === HIGH SCHOOL DXD SHIPS ===
        "rating_suggestive, 1boy, 1girl, hyoudou issei and rias gremory red haired demon king passion, power of destruction bedroom, occult research club room, fallen angel conspiracy aftermath, pawn and king peerage, kuoh academy magic circle, crimson hair and boosted gear, harem king proclamation, devil contract intimacy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hyoudou issei and akeno himejima fallen angel masochist passion, sadodere queen and pervert protagonist, lightning and holy lightning, shrine maiden outfit undone, president rival affection, voltage intense pleasure, grief for barakiel healed, submission and dominance, kuoh academy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hyoudou issei and asia argento innocent nun corruption, twilight healing and sacred gear, former christian to devil, pure to fallen, church basement secret, xenovia and irina jealous, shidou temple, exorcist turned devil, gentle corruption, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, rias gremory and akeno himejima yuri demon noble passion, childhood friends with benefits, sharing issei fantasy, red and black hair intertwined, gremory and himejima clan alliance, occult research club bath, steam and magic, peerage camaraderie, noble lady secret, masterpiece, best quality, very aesthetic",

        // === TO LOVE RU SHIPS ===
        "rating_suggestive, 1boy, 1girl, yuuki rito and lala satalin deviluke alien princess marriage, tail sensitivity exploration, sainan high school,peke spaceship bedroom, galaxy unification political marriage, genius inventor naked apron, tail as erogenous zone, haruna sairenji watching, harem complications, devilukean physiology, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, yuuki rito and kotegawa yui public morals committee secret, uptight class rep and accident prone boy, sainan high disciplinary room, falling into compromising positions, golden darkness assassination interrupted, yami watching, tsundere denial, proper facade dropped, accidental pervert fulfillment, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, yuuki rito and konjiki no yami golden darkness assassin redemption, transformation weapon and target, sainan high rooftop, emotionless to emotional, nemesis dark matter influence, kurosaki mea sister complex, takoyaki date escalated, living weapon humanity, masterpiece, best quality, very aesthetic",

        // === PRISON SCHOOL SHIPS ===
        "rating_suggestive, 1boy, 1girl, fujino kiyoshi and shiraki meiko vp underground prison passion, disciplinary committee uniform, massive curves and glasses, dogeza and submission, underground correctional facility, meiko vice president dominance, hydraulic press threats, masochistic pleasure, school prison complex, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, fujino kiyoshi and kurihara mari president secret romance, above ground flower bed, d3 arc cavalry charge rescue, vice president glasses, hachimitsu academy, underground student council, wet t shirt contest, rebellion and discipline, andre and gakuto envy, masterpiece, best quality, very aesthetic",

        // === FOOD WARS SHIPS ===
        "rating_suggestive, 1boy, 1girl, yukihira soma and erina nakiri god tongue bedroom, culinary orgasm translated, totsuki elite ten first seat, polar star dormitory kitchen, red hair and yellow, nakiri family estate, shokugeki no soma passion, foodgasms leading to real, elite academy scandal, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, yukihira soma and megumi tadokoro shy girl confidence, polar star dorm room, donburi expertise, soft spoken passion, azami nakiri defeat celebration, hometown fishing village, gentle supportive love, cooking together intimacy, friendship to romance, masterpiece, best quality, very aesthetic",

        // === DARLING IN THE FRANXX SHIPS ===
        "rating_suggestive, 1boy, 1girl, hiro and zero two code 016 and 002 reunion, red horns and blue oni, franxx pistil and stamen, plantation 13 mistletoe, stampede form acceptance, childhood promise fulfilled, jian bird metaphor, paradise lost reference, beast and prince wedding night, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, gorou and ichigo unrequited to requited, glasses and blue hair, backup partner success, plantation 13 dorm, darling zero two interference, childhood friend wins, code 056 and code 015, gentle caring passion, long wait rewarded, post apocalyptic hope, masterpiece, best quality, very aesthetic",

        // === ERASED SHIPS ===
        "rating_suggestive, 1boy, 1girl, fujinuma satoru and hinazuki kayo second chance romance, revival power reward, hokkaido 1988 winter, child abuse survival, pizza party celebration, yashiro gaku confrontation aftermath, adult reunion, lost time recovered, sparrow house refuge, butterfly effect love, masterpiece, best quality, very aesthetic",

        // === EROMANGA SENSEI SHIPS ===
        "rating_suggestive, 1boy, 1girl, izumi masamune and izumi sagiri step sibling romance, eromanga illustrator and light novelist, locked room first floor, yamada elf and senju muramasa jealous, tsundere imouto passion, step relation justification, anime industry meta, webcam face reveal, protective brother complex, masterpiece, best quality, very aesthetic",

        // === OREIMO SHIPS ===
        "rating_suggestive, 1boy, 1girl, kousaka kyousuke and kousaka kirino true sibling ending, eroge playing together, closet secret base, akihabara imouto complex, ruri gokou and ayase aragaki rejected, controversial true route, little sister game come true, domestic family romance, forbidden love acceptance, masterpiece, best quality, very aesthetic",

        // === DOMESTIC GIRLFRIEND SHIPS ===
        "rating_suggestive, 1boy, 1girl, fuji natsuo and tachibana hina teacher student stepsibling, love x dilemma passion, family restaurant rooftop, school trip kyoto, shuugakuryokou hotel, nakadai rui sister jealousy, mangaka and english teacher, age gap scandal, household secret, step mother blessing, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, fuji natsuo and tachibana rui writer and chef passion, lit club and culinary school, family step sibling drama, hina oneesan complex, love triangle resolution, tokyo apartment living, boogie nights reference, gekkan young magazine, realistic drama intimacy, coming of age love, masterpiece, best quality, very aesthetic",

        // === SCUMS WISH SHIPS ===
        "rating_suggestive, 1boy, 1girl, yasuraoka hanabi and kanai narumi teacher worship replacement, scum and wish fulfillment, mugi awaya contract, surrogate relationship, kanai akane sensei betrayal, school rooftop secret, flower imagery, broken people passion, using each other healing, replacement love acceptance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1girl, 2girls, yasuraoka hanabi and ebato sanae yuri unrequited passion, minagawa akane seduction, childhood friend confession, morita village shrine, hanabi and ecchan physical comfort, lesbian experimentation, emotional dependency, sisterly love crossed, using for forgetting, masterpiece, best quality, very aesthetic",

        // === CITRUS SHIPS ===
        "rating_suggestive, 2girls, aihara yuzu and aihara mei step sister yuri passion, blonde gyaru and black hair student council, chairman room scandal, saburouta yuri manga, arranges marriage conflict, academy girls school, citrus fruit symbolism, stepsibling taboo, student council room, yuzu ribbon and mei glasses, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, aihara yuzu and mizusawa matsuri childhood friend seduction, lolita complex photographer, yuzu in danger, mei rescue, manipulative young girl, tokyo and countryside, photography studio, dark room development, possessive friendship, step sister jealousy, masterpiece, best quality, very aesthetic",

        // === BLOOM INTO YOU SHIPS ===
        "rating_suggestive, 2girls, koito yuu and nanami touko student council room yuri, i cant fall in love syndrome, seiji and mio past, theater club play intimacy, romantic but not love, yagate kimi ni naru, gradual acceptance, tohmi hikaru school, senpai kouhai dynamic, eventual mutual love, masterpiece, best quality, very aesthetic",

        // === KASE-SAN SHIPS ===
        "rating_suggestive, 2girls, yamada yui and kase tomoka morning glories and flowers yuri, tomboy track star and shy gardener, horticulture and athletics, high school graduation, shoujo manga aesthetic, dormitory room, locker room uniform, morning glory climbing, flower language, outdoor sex risk, masterpiece, best quality, very aesthetic",

        // === ADACHI AND SHIMAMURA SHIPS ===
        "rating_suggestive, 2girls, adachi sakura and shimamura hougetsu gym loft paradise, skipping class intimacy, ping pong table tennis, alien and astronaut metaphor, hitoma iruma light novel, sasaki and nagafuji side couple, tan skin gyaru, lazy afternoon, gym storage room, intimate friendship line, masterpiece, best quality, very aesthetic",

        // === WHISPERED WORDS SHIPS ===
        "rating_suggestive, 2girls, kazama ushio and sumika murasame karate and love yuri, sasameki koto, tall strong and short cute, karate dojo passion, unrequited to requited, best friends to lovers, miyako and tomoe side couple, akemiya crossdressing, school trip kyoto, azumaya kisses, masterpiece, best quality, very aesthetic",

        // === STRAWBERRY PANIC SHIPS ===
        "rating_suggestive, 2girls, aoi nagisa and hanazono shizuma etoile room passion, three schools hill, spica and lerim, silver hair and red, summer uniform, greenhouse strawberry, religious catholic school, forbidden elegant yuri, mari and tsubomi side couple, tragic past lover, reincarnation romance, masterpiece, best quality, very aesthetic",

        // === MARIA WATCHES OVER US SHIPS ===
        "rating_suggestive, 2girls, fukuzawa yumi and ogasawara sachiko rosa chinensis en bouton, lillian girls academy, soeur system sister, tea ceremony room, catholic all girls school, onee-sama worship, marimite, yamayurikai student council, french rose class, elegant classical yuri, white and red uniform, masterpiece, best quality, very aesthetic",

        // === AKUMA NO RIDDLE SHIPS ===
        "rating_suggestive, 2girls, azuma tokaku and ichinose haru black class assassination yuri, my queen protection devotion, target and bodyguard, myojo private academy, 12 assassins tournament, daruma doll falling, hanabusa sumireko and banba mahiru side pair, kenmochi shiena and takechi otoya, lesbian battle royale, masterpiece, best quality, very aesthetic",

        // === VALKYRIE DRIVE MERMAID SHIPS ===
        "rating_suggestive, 2girls, shikishima mamori and mirei shikishima liberation armed passion, extar and liberator, mermaid island prison, arousal weapon transformation, tokonome infected, charlotte scharsen and kasumi shinonome, naked apron cooking, excessive fan service, yuri action ecchi, shigure mirei wolf, masterpiece, best quality, very aesthetic",

        // === INU X BOKU SS SHIPS ===
        "rating_suggestive, 1boy, 1girl, miketsukami soushi and shirakiin ririchiyo secret service passion, ayakashi mansion room 4, inugami and oni blood, kagerou and karuta side couple, yukinokouji nobara and sorinozuka, natsume zange and watanuki, youkai descendant romance, master servant loyalty, secret service protection, ayakashi kan, masterpiece, best quality, very aesthetic",

        // === KAMISAMA KISS SHIPS ===
        "rating_suggestive, 1boy, 1girl, tomoe and momozono nanami familiar contract passion, fox yokai and land god, mikage shrine bedroom, tomoe past curse, kamisama hajimemashita, kurama and mizuki rival, hair ribbon familiar mark, yokai wedding ceremony, 500 years waiting, nanami kamisama, tomoe fox ears, masterpiece, best quality, very aesthetic",

        // === FRUITS BASKET SHIPS ===
        "rating_suggestive, 1boy, 1girl, sohma kyo and honda tohru cat and rice ball onigiri, zodiac curse breaking, true form acceptance, shigure house bedroom, orange hair and orange, onigiri analogy,十二因縁 chinese zodiac, akito sohma defeat, graduation future, promise kiss fulfillment, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, sohma yuki and kuragi machi student council president passion, rat zodiac prince, rice ball metaphor, kimidori university, perfection and flaws, machi destroys perfection, yuki sohma growth, true self acceptance, machi sonoda, student council room, family curse freedom, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, sohma shigure and sohma akito god and dog twisted passion, twisted creator and most loyal, incestuous zodiac bond, main house secret, shigure manipulation, akito obsession, sohma family darkness, adult complex relationship, manga ending canon, dog year devotion, masterpiece, best quality, very aesthetic",

        // === SPECIAL A SHIPS ===
        "rating_suggestive, 1boy, 1girl, takishima kei and hanazono hikari rival number one passion, special a class greenhouse, undefeated pride, hakusenkan academy, megumi and jun twins, yamamoto akira and toudou ryuu, karino tadashi and yamamoto akira, competitive academic elites, strawberry competition, greenhouse intimate, masterpiece, best quality, very aesthetic",

        // === KAICHOU WA MAID SAMA SHIPS ===
        "rating_suggestive, 1boy, 1girl, usui takumi and ayuzawa misaki maid latte secret, student council president double life, seaside school trip, takumi alien prince revelation, misaki tsundere denial, usui stalker level devotion, maid costume and school uniform, usui mansion bedroom, henry and patricia parents, butler and maid, masterpiece, best quality, very aesthetic",

        // === SKIP BEAT SHIPS ===
        "rating_suggestive, 1boy, 1girl, tsuruga ren and mogami kyoko showbiz passion, love me section, sho fuwa revenge, dark kuon identity, box r set, Setsuka Heel and Cain Heel, method acting intimacy, actress and actor, kyoko mogami karma, beagle and tsuruga, love me uniform, show business romance, masterpiece, best quality, very aesthetic",

        // === NANA SHIPS ===
        "rating_suggestive, 1boy, 1girl, osaki nana and takumi trapnest bassist toxic passion, black hair and blonde, vivienne westwood, nana komatsu love triangle, shinichi okazaki and reira serizawa, ren honjo and nana osaki, tokyo apartment 707, punk rock and glamour, adult complex relationships, ai yazawa art style, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 2girls, osaki nana and komatsu nana room 707 friendship, hachi and nana,草莓玻璃杯, blast and trapnest, shared apartment intimacy, strawberry pattern, yuri subtext, female bonding, adult women tokyo, vivienne westwood fashion, music industry drama, artistic shoujo, masterpiece, best quality, very aesthetic",

        // === PARADISE KISS SHIPS ===
        "rating_suggestive, 1boy, 1girl, koizumi george and hayasaka yukari atelier passion, para kiss studio, fashion design and model, alice and isabella, arashi and miwako, yokohama college, runway show after party, george america departure, graduation decision, model and designer, ai yazawa mature, masterpiece, best quality, very aesthetic",

        // === BASARA SHIPS ===
        "rating_suggestive, 1boy, 1girl, shuri and sasara tatara desert kingdom passion, red haired female protagonist, gender bender disguise, shura and kakouton, post apocalyptic fantasy, water priestess, wind clan and red king, yumi tamura epic, sarasa and ageha, destiny and prophecy, four symbol legend, masterpiece, best quality, very aesthetic",

        // === FROM UP ON POPPY HILL SHIPS ===
        "rating_suggestive, 1boy, 1girl, kazama shun and matsuzaki umi ghibli harbor passion, coquelicot manor, latin quarter preservation, yokohama 1963, olympics preparation, flag signal romance, sea and harbor, kamakura setting, goro miyazaki, kokuriko manor, teen innocent love, studio ghibli aesthetic, masterpiece, best quality, very aesthetic",

        // === THE WIND RISES SHIPS ===
        "rating_suggestive, 1boy, 1girl, horikoshi jiro and satomi naoko ghibli engineer passion, zero fighter design, tuberculosis romance, sleep under hill, kantoku to tsubasa, hayao miyazaki, japanese aviation history, 1923 earthquake, naoko painting, beautiful dreams, historical mature love, masterpiece, best quality, very aesthetic",

        // === WHEN MARNIE WAS THERE SHIPS ===
        "rating_suggestive, 2girls, anna sasaki and marnie mansion passion, hiromasa yonebayashi, ghibli psychological, kissama marsh house, memory and time travel, grandmother revelation, blonde and brunette, oiwa and sayaka, marsh house bedroom, emotional yuri subtext, seaside town, grain silo, masterpiece, best quality, very aesthetic",

        // === OCEAN WAVES SHIPS ===
        "rating_suggestive, 1boy, 1girl, tachibana taku and muto rikako ghibli tv movie passion, umi ga kikoeru, tomo misaki and yutaka matsuno, kochi prefecture, tokyo reunion, high school reunion, tv special 1993, tomomi mochizuki, realistic romance, nostalgic summer, masterpiece, best quality, very aesthetic",

        // === ONLY YESTERDAY SHIPS ===
        "rating_suggestive, 1boy, 1girl, okajima taeko and toshio ghibli adult romance, omohide poro poro, yamagata countryside, safflower farming, childhood memories, 27 year old unmarried, 1966 flashbacks, takahata isao, real adult issues, menstruation and puberty, country versus city, masterpiece, best quality, very aesthetic",

        // === GARDEN OF WORDS SHIPS ===
        "rating_suggestive, 1boy, 1girl, takao akizuki and yukari yukino makoto shinkai rain passion, 15 and 27 age gap, shinjuku gyoen garden, shoe design and literature teacher, rainy season shelter, japanese garden teahouse, kotonoha no niwa, tanabata and rain, lonely hearts connection, student teacher taboo, masterpiece, best quality, very aesthetic",

        // === 5 CENTIMETERS PER SECOND SHIPS ===
        "rating_suggestive, 1boy, 1girl, toono takaki and shinohara akari byousoku passion, cherry blossom train station, elementary school promise, tanegashima space center, kanae sumita unrequited, third act adult reunion, chains of love, distance and time, shinkai makoto tragedy, real life bittersweet, masterpiece, best quality, very aesthetic",

        // === VOICES OF A DISTANT STAR SHIPS ===
        "rating_suggestive, 1boy, 1girl, nagamine mikako and terao noboru hoshi no koe passion, mecha pilot and earth waiting, light lag text messages, lysithea spacecraft, 8 light years separation, 2046 space war, makoto shinkai early, cell phone romance, time dilation love, agartha mission, masterpiece, best quality, very aesthetic",

        // === JOURNEY TO AGARTHA SHIPS ===
        "rating_suggestive, 1boy, 1girl, morisaki ryunosuke and rin agartha underworld passion, children who chase lost voices, asuna and shun, amaurot underworld, gate of life and death, morisaki wife resurrection, finis terra, makoto shinkai fantasy, deceased mother obsession, crystal coffin, shinkai fantasy epic, masterpiece, best quality, very aesthetic",

        // === SUZUME SHIPS ===
        "rating_suggestive, 1boy, 1girl, iwato suzume and munakata souta shinkai door passion, daijin and sadaijin, three legged chair, kumamoto and tokyo, closing doors, 2011 earthquake metaphor, weathering with you connection, your name easter egg, suzume no tojimari, fantasy road trip, supernatural romance, masterpiece, best quality, very aesthetic",

        // === THE PLACE PROMISED IN OUR EARLY DAYS SHIPS ===
        "rating_suggestive, 1boy, 1girl, fujisawa hiroki and sawatari sayuri kumo no mukou passion, alternate history hokkaido, tower union parallel world, settsu and tomizawa, sheherazade violin, coma and waking, shinkai makoto early feature, cold sleep, childhood promise, parallel dimension, soviet union occupation, masterpiece, best quality, very aesthetic",

        // === BELLE SHIPS ===
        "rating_suggestive, 1boy, 1girl, u dragon and suzuran kei beast and beauty passion, ryu to sobakasu no hime, mamoru hosoda, metaverse u, karaoke and singing, beauty and the beast, angel and dragon, internet celebrity, hokkaido countryside, beauty and beast castle, virtual concert, real identity reveal, masterpiece, best quality, very aesthetic",

        // === WOLF CHILDREN SHIPS ===
        "rating_suggestive, 1boy, 1girl, hana and ookami wolf man love, ookami kodomo no ame to yuki, hosoda mamoru, college campus romance, wolf transformation, country life parenting, ame and yuki, rain and snow, single mother struggle, wolf man death, tanabe countryside, interspecies romance, bittersweet memories, masterpiece, best quality, very aesthetic",

        // === THE GIRL WHO LEAPT THROUGH TIME SHIPS ===
        "rating_suggestive, 1boy, 1girl, konno makoto and mamiya chiaki toki wo kakeru shoujo passion, time leap walnut, kamitakamiya high, aunt witch, hosoda mamori, 2006 anime, 1983 live action, 1997 drama, time remaining, baseball and painting, science fiction romance, time traveler girlfriend, masterpiece, best quality, very aesthetic",

        // === SUMMER WARS SHIPS ===
        "rating_suggestive, 1boy, 1girl, koiso kenji and shinohara natsuki oz crisis passion, jinnouchi family estate, uozaki nagano, love machine virus, hanafuda card game, satellite collision, virtual world avatar, mathematical encryption, great grandmother sakae, pretend fiance, chaotic family reunion, oz network, masterpiece, best quality, very aesthetic",

        // === MIRAI SHIPS ===
        "rating_suggestive, 1boy, 1girl, oota kun and mirai shoujo sister from future passion, mirai no mirai, hosoda mamoru, isekai shoujo, 4 year old tantrum, family tree time travel, yokohama station, shiori mother, yuuto father, train station magical, baby sister jealousy, coming of age fantasy, family love growth, masterpiece, best quality, very aesthetic",

        // === BOY AND THE BEAST SHIPS ===
        "rating_suggestive, 1boy, 1girl, kumatetsu and ichirohiko father son passion, bakemono no ko, beast kingdom shibuten, hosoda mamoru, human boy and bear beast, nine sword succession, iozen and hyakushubo, tatara and tekakin, whale dark void, father figure mentorship, shibuya and beast, human and monster, masterpiece, best quality, very aesthetic",

        // === POM POKO SHIPS ===
        "rating_suggestive, 1boy, 1girl, shokichi and okiyo tanuki passion, heisei tanuki gassen pompoko, takahata isao, toga transformation, shikoku folklore, development conflict, tamasaburo and bunta, pom poko scrotum, takarazuka mountain, new tokyo development, tanuki extinction, environmental message, magical testicles, masterpiece, best quality, very aesthetic",

        // === HOWLS MOVING CASTLE SHIPS ===
        "rating_suggestive, 1boy, 1girl, howl and sophie castle bedroom passion, hauru no ugoku shiro, witch of waste curse, calcifer fire demon, 18 and 90 age magic, miyazaki hayao, diana wynne jones, calcifer contract, scarecrow turnip head, beautiful wizard, raven black hair, market and war, castle door magic, masterpiece, best quality, very aesthetic",

        // === PORCO ROSSO SHIPS ===
        "rating_suggestive, 1boy, 1girl, porco rosso and gina piccolo passion, kurenai no buta, marco pagot curse, adriatic sea seaplane, hotel adriano, gina three husbands, donald curtis rival, mediterranean cafe, fascist italy 1930s, pig curse, air pirates, miyazaki aviation, hotel owner romance, masterpiece, best quality, very aesthetic",

        // === KIKIS DELIVERY SERVICE SHIPS ===
        "rating_suggestive, 1boy, 1girl, tombo and kiki delivery service passion, majo no takkyuubin, koriko bakery, jiji black cat, red radio bicycle, flying boy, dirigible crash rescue, witch coming of age, 13 year old independence, miyazaki hayao, bakery bedroom, guchokipanya bakery, ouden electric oven, masterpiece, best quality, very aesthetic",

        // === CASTLE IN THE SKY SHIPS ===
        "rating_suggestive, 1boy, 1girl, pazu and sheeta laputa passion, tenku no shiro, floating island, crystal necklace levitation, dola pirate mom, muska secret agent, robot gardeners, volucite aetherium crystal, tree of life, laputan robot, mu empire, valley of gondoa, miyazaki first ghibli, steampunk fantasy, masterpiece, best quality, very aesthetic",

        // === NAUSICA SHIPS ===
        "rating_suggestive, 1boy, 1girl, nausicaa and asbel valley of wind passion, kaze no tani, toxic jungle spores, ohmu giant insects, tolmekian war, pejite last prince, god warrior, seven days of fire, ghibli first film, pre-ghibli, miyazaki manga, blue dress and mask, jet glider, forest of decay, masterpiece, best quality, very aesthetic",

        // === PAPRIKA SHIPS ===
        "rating_suggestive, 1boy, 1girl, konakawa toshimi and paprika dream passion, satoshi kon film, dc mini device, dream therapy, parade dream invasion, detective movie dream, chair and girl, butterfly transformation, osawa chiba institute, kuga kosaku and torataro shima, hirasawa susumu soundtrack, dream within dream, inception inspiration, masterpiece, best quality, very aesthetic",

        // === PERFECT BLUE SHIPS ===
        "rating_suggestive, 1boy, 1girl, kirigoe mima and tadao me-mania stalker passion, satoshi kon thriller, cham pop idol, rape scene trauma, double mima illusion, murano ryo detective, mima room invasion, internet diary, psychological horror, identity breakdown, satoshi kon debut, female exploitation industry, blurred reality, masterpiece, best quality, very aesthetic",

        // === MILLENNIUM ACTRESS SHIPS ===
        "rating_suggestive, 1boy, 1girl, fujiwara chiyoko and key painter eternal pursuit passion, satoshi kon, gintama and kyoji, thousand year pursuit, documentary interview, various film genres, earthquake tokyo, moon rocket, snow country, castle and demon, key to heart, eternal love pursuit, cinema meta narrative, masterpiece, best quality, very aesthetic",

        // === TOKYO GODFATHERS SHIPS ===
        "rating_suggestive, 2girls, miyuki and gin drag queen and runaway passion, satoshi kon christmas, hana transgender mother, baby kiyoko miracle, tokyo homeless, evangelist church, gin daughter reunion, spanish killer, yakuza daughter, suicide leap redemption, found family, holiday miracle, satoshi kon rare, masterpiece, best quality, very aesthetic",

        // === ROUJIN Z SHIPS ===
        "rating_suggestive, 1boy, 1girl, takazawa kijuro and satou harukomachi nurse passion, otomo katsuhiro, st lukes hospital, tokyo bay, bio medical machine, pentagon remote control, atomic power, old man fantasy, izanagi and izanami, tsunami dream, social care satire, akira creator, 1991 comedy, masterpiece, best quality, very aesthetic",

        // === AKIRA SHIPS ===
        "rating_suggestive, 1boy, 1girl, kaneda shoutarou and kei revolutionary passion, otomo katsuhiro, neo tokyo 2019, shima tetsuo, espow powee, capsule motorcycle, government conspiracy, 1988 film, psychic children, tokyo olympics 2020, atomic explosion, cyberpunk classic, political activism, red motorcycle, masterpiece, best quality, very aesthetic",

        // === MEMORIES SHIPS ===
        "rating_suggestive, 1boy, 1girl, michael and eve magnetic rose passion, otomo katsuhiro anthology, kon satoshi segment, koroviev space station, opera singer hologram, cosette castle, salvatore trap, magnetic rose, odoru daisousasen comedy, stink bomb, cannon fodder, 1995 anthology, space horror, masterpiece, best quality, very aesthetic",

        // === STEAMBOY SHIPS ===
        "rating_suggestive, 1boy, 1girl, james ray steam and scarlett ohara steamball passion, otomo katsuhiro, manchester 1866, steam ball invention, edward steam father, alfred steam grandfather, steam castle expo, great exhibition, industrial revolution, retro steampunk, victorian england, water and steam, scarlett o hara homage, masterpiece, best quality, very aesthetic",

        // === METROPOLIS SHIPS ===
        "rating_suggestive, 1boy, 1girl, kenichi and tima robot passion, tezuka osamu, rintaro director, ziggurat revolution, rock human supremacy, duke red dictator, 2001 film, osamu tezuka, fritz lang inspiration, noto kona, japanese german coproduction, sunstone power, robot liberation, utopian dystopia, masterpiece, best quality, very aesthetic",

        // === BLOOD THE LAST VAMPIRE SHIPS ===
        "rating_suggestive, 1girl, 2girls, saya and linda omason base passion, 1966 vietnam war, yokota air base, david and louis, chiropteran vampire, last vampire 2000, blood plus and c, katana schoolgirl, okiura hiroyuki, production ig, american soldiers, halloween dance, horror action, red eyes black hair, masterpiece, best quality, very aesthetic",

        // === JIN ROH SHIPS ===
        "rating_suggestive, 1boy, 1girl, fuse kazuki and kei amemiya little red riding hood passion, kerberos panzer cops, mamoru oshii, red spectacles, stray dogs, panzer cop armor, german shepherd, tokyo martial law, red riding hood metaphor, fuse ammunition, kei terrorist, happy end suicide, wolf brigade, alternate history, masterpiece, best quality, very aesthetic",

        // === GHOST IN THE SHELL SHIPS ===
        "rating_suggestive, 1boy, 1girl, kusanagi motoko and batou section 9 passion, mamoru oshii, puppet master fusion, diving scene, thermoptic camouflage, major cybernetic body, tachikoma thought, 1995 film, 2029 new port city, stand alone complex, laughing man, public security, cyberpunk classic, artificial intelligence, masterpiece, best quality, very aesthetic",

        // === PATLABOR SHIPS ===
        "rating_suggestive, 1boy, 1girl, izumi noa and shinohara asuma police labor passion, patlabor mobile police, mamoru oshii, av98 ingram, division 2 tokyo, alphee and tamaki, gotou kiichi and shinobu, mechanic and pilot, mecha police comedy, 1989 ova, sv2 base, labor crime, ingram reaction, realistic mecha, masterpiece, best quality, very aesthetic",

        // === THE SKY CRAWLERS SHIPS ===
        "rating_suggestive, 1boy, 1girl, yuichi kannami and suito kusanagi eternal war passion, mamoru oshii, kildren pilots, rostock and laison, suito revolver, teacher student relationship, never ending war, permanence of youth, ishii jiro, blue and white katalina, fighter plane dogfight, meaningless war, oshii aviation, masterpiece, best quality, very aesthetic",

        // === VEXILLE SHIPS ===
        "rating_suggestive, 1boy, 1girl, takahashi vexille and leon s word squad passion, sori fumihiko, 2077 japan isolation, dag export restriction, sWORD unit, maria and tango, android biomimetic, tenjo city tower, tokugawa 2128, peter jane, gothic made future, cel shaded 3d, isolated nation, masterpiece, best quality, very aesthetic",

        // === REDLINE SHIPS ===
        "rating_suggestive, 1boy, 1girl, jp and sonoshee mclaren yellowline passion, koike takeshi, 2012 film, seven year production, hand drawn animation, roboworld race, transamerican, machinehead tetsujin, trava and shinkai, frater and lynchman, bosbos and boiboi, seminole betting, yakuza debt, death race romance, masterpiece, best quality, very aesthetic",

        // === MIND GAME SHIPS ===
        "rating_suggestive, 1boy, 1girl, nishi and myan yakuza chase passion, yuasa masaaki, studio 4c, kichi and jiisan, god elephant escape, whale interior, afterlife running, osaka nightlife, black and white to color, yakuza boss, myan sister, jiisan and kichi old couple, non linear narrative, experimental animation, masterpiece, best quality, very aesthetic",

        // === PING PONG THE ANIMATION SHIPS ===
        "rating_suggestive, 1boy, 1girl, tsukimoto makoto and kazama yutaka childhood friend passion, yuasa masaaki, smile and peko, obaba tamura, kong wenge china, sakuma manabu, tsukimoto koizumi, table tennis dragon, hero and robot, matsumoto taiyou art, noitamina broadcast, sports psychology, ping pong table, masterpiece, best quality, very aesthetic",

        // === DEVILMAN CRYBABY SHIPS ===
        "rating_suggestive, 1boy, 1girl, fudou akira and makimura miki apocalypse passion, yuasa masaaki, netflix 2018, satanic ryo asuka, demon possession, track team, love triangle, televised massacre, sabbath party, devilman army, human extinction, angelic satan, go nagai, miki death scene, ryo revelation, apocalyptic tragedy, masterpiece, best quality, very aesthetic",

        // === KEEP YOUR HANDS OFF EIZOUKEN SHIPS ===
        "rating_suggestive, 2girls, asakusa midori and mizusaki tsubame animation passion, yuasa masaaki, eizouken production, kanamori sayaka producer, shibahama high, anime club, mecha and fantasy, imagination sequences, asakusa sketches, tsubame acting, kanamori business, student animation, meta anime, shibahama town, masterpiece, best quality, very aesthetic",

        // === HEIKE MONOGATARI SHIPS ===
        "rating_suggestive, 1boy, 1girl, taira no kiyomori and tokita wife clan passion, yuasa masaaki, 2021 series, biwa blind musician, heike narrative, genpei war, taira clan rise and fall, 1185 dan no ura, child emperor antoku, yoshitsune and benkei, biwa hoshi, puppet animation, historical epic, nasu no yoichi, masterpiece, best quality, very aesthetic",

        // === RIDE YOUR WAVE SHIPS ===
        "rating_suggestive, 1boy, 1girl, wasabi and minato water spirit passion, yuasa masaaki, 2019 film, surfing and firefighter, kenchou minato, hinako miyamoto, yokohama fire department, water memory, wave riding ghost, tragic death, moving on grief, ichimokuren legend, supernatural romance, hiroshi kawamata, masterpiece, best quality, very aesthetic",

        // === JAPAN SINKS 2020 SHIPS ===
        "rating_suggestive, 1boy, 1girl, onodera kaito and mutou ayumu disaster passion, yuasa masaaki, netflix series, 2020 tokyo olympics, mutou go, kozue nanami, dan dan dan ending, earthquake survival, japan tectonic plates, nomura kazuhiro, disaster movie, family survival, go die scene, running dera, masterpiece, best quality, very aesthetic",

        // === KIMI NO NA WA PARODY SHIPS ===
        "rating_suggestive, 1boy, 1girl, genderbent taki and mitsuha body swap passion, role reversal comedy, mitsuha in taki body discovering, taki in mitsuha body exploring, itomori shrine maiden, tokyo boy confusion, kuchikamizake ritual, comet fragment, body discovery intimacy, different perspectives, red cord symbolism, masterpiece, best quality, very aesthetic",

        // === MISCELLANEOUS FAMOUS HENTAI PARODIES ===
        "rating_suggestive, 1boy, 1girl, bible black occult ritual passion, imari and kitami reika, witchcraft academy, walpurgis night, dark ceremony, black magic sex, saeki kirika and takashiro hiroko, nightwing games, occult club room, hentai classic parody, red and black aesthetic, magical spell casting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, discipline record of crusade academy passion, leona and takuro, saint archeology academy, hayami shizuku and saori otokawa, helicopter and mansion, ichisaki yuuki, classic hentai parody, ova series, multiple partners, academy domination, harem establishment, wealthy elite, boarding school, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, stringendo angel-tachi no private lesson passion, yamagishi and kotomi, mizuho and other girls, pink pine apple, ouendan and library, train and classroom, anthology series, tomohisa and mizuho, various scenarios, school setting hentai, popular girl and normal boy, romantic development, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, resort boin island vacation passion, daino and mika, kanae and shiho, nao and other girls, ms. irrelevant, tropical island setting, pink pineapple, harem resort, cousin and childhood friend, beach and hotel, summer vacation, swimsuit and bikini, hentai ova, tropical paradise, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kanojo x kanojo x kanojo three sisters passion, haruaki and orifushi sisters, akina and natsumi and mafuyu, strawberry jam and shrine, hokkaido dairy farm, snow and hot springs, pink pineapple, sister harem, triple relationship, winter setting, rural countryside, ice cream shop, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, eroge h mo game mo kaihatsu zanmai adult game passion, mochizuki tomoya and company, flower and kiss company, tsundere and yandere heroines, visual novel development, bug testing intimacy, game within game, ecchi comedy, purple software collaboration, ero game scenario, development team romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, fault milestone visual novel passion, rito and selphine, foreign language barrier, magic kingdom royalty, maniwa roto and the others, alice in dreadnaught, fault series, talantefar magic, linguistic research, cg beautiful art, rai and selphine, viscante and vance, episodic series, masterpiece, best quality, very aesthetic",
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
        userId: "system_couples_showcase_script",
        likesCount: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: Math.floor(Math.random() * 10)
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    const models = MODEL_OVERRIDE ? [MODEL_OVERRIDE] : Object.keys(PROMPTS_PER_MODEL);

    console.log("=== ANIME COUPLES & FANFIC SHIPPING SHOWCASE ===");
    console.log("Famous Anime Ships - Ecchi, Hentai & Romantic Fanfic");
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

    console.log("\n=== ANIME COUPLES SHOWCASE COMPLETE ===");
    console.log("All famous ships generated and uploaded!");
}

main().catch(console.error);
