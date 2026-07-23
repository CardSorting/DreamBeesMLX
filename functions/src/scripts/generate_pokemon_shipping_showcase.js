/**
 * Pokemon Shipping & Trainer Couples Showcase Generator
 * 
 * Generates elite showcase images featuring famous Pokemon trainers,
 * gym leaders, champions, and romantic pairings in 
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
// POKEMON SHIPPING PROMPTS - 50 Famous Couples
// World-Class Erotic Art - Ecchi, Hentai & Seductive
// ========================================
const PROMPTS_PER_MODEL = {

    // ========================================
    // WAI ILLUSTRIOUS EROTIC - POKEMON SHIPPING EDITION
    // ========================================
    "wai-illustrious-erotic": [
        // === MAIN SERIES PROTAGONISTS ===
        "rating_suggestive, 1boy, 1girl, red and leaf pokemon trainer passion, kanto champion bedroom, hat backwards, blue suspender skirt, pokeball scattered, charizard and venusaur sleeping outside tent, pallet town nostalgia, legendary trainer couple, confident red and elegant leaf, first generation romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ethan and kris johto trainer passion, silver hair and pigtails, new bark town bedroom, totodile and chikorita plushies, pokemon center after hours, legendary trainer reunion, johto region aesthetic, 16 bit style nostalgia, goldenrod city lights through window, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, brendan and may hoenn trainer passion, bandana and fanny pack, littleroot town bedroom, torchic and mudkip sleeping, contest hall after victory, secret base intimacy, delta episode aftermath, primal reversion energy, hoenn region tropical heat, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lucas and dawn sinnoh trainer passion, beret and scarf, twinleaf town bedroom, piplup and turtwig toys, contest ribbon scattered, mt cornet view, snowpoint city cold outside, warm blanket intimacy, generation 4 pixel nostalgia, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hilbert and hilda unova trainer passion, ponytail and baseball cap, nuvema town bedroom, oshawott and snivy cushions, pokemon musical costumes, n castle alternative timeline, team plasma aftermath, legendary dragon slumbering, unova region modern, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, nate and rosa unova 2 trainer passion, visor and double bun, aspertia city bedroom, tepig and dewott posters, pokestar studios after filming, world tournament victory celebration, hugh rival jealously, unova sequels romance, 2d animated style, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, calem and serena kalos trainer passion, mega ring and fashion, vaniville town bedroom, fennekin and froakie sleeping, trainer custom clothes scattered, pokemon-amie affection, lysandre labs aftermath, kalos region beauty, french elegance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, elio and selene alola trainer passion, tropical shirt and floral dress, hauoli city bedroom, rowlet and popplio plush, festival plaza at night, ultra wormhole aftermath, alola region island heat, z-move pose energy, hawaiian aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, victor and gloria galar trainer passion, beanie and tartan skirt, postwick bedroom, scorbunny and sobble socks, wyndon stadium after champion match, dynamax energy lingering, galar region industrial, league card on nightstand, british aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, rei and akari hisui trainer passion, galaxy team uniform, jubilife village tent, cyndaquil and oshawott resting, alpha pokemon encounter adrenaline, ancient sinnoh region, noble pokemon blessing, time travel romance, feudal japan aesthetic, masterpiece, best quality, very aesthetic",

        // === RIVALS AND PROTAGONISTS ===
        "rating_suggestive, 1boy, 1girl, blue and leaf rival passion, pallet town bedroom, arrogant smirk and confident smile, champion defeat celebration, eevee and pidgeot sleeping, professor oak lab nearby, kanto rivalry turned romance, first generation classic, mastery, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, silver and kris rival passion, revenge softened by love, team rocket executive son, johto region cold bedroom, totodile and chikorita, rival battle aftermath, redemption arc intimacy, silver hair and pigtails, generation 2 aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, barry and dawn rival passion, twinleaf town bedroom, hyperactive energy turned passionate, chimchar and piplup, speed star nickname, lake guardians blessing, sinnoh region adventure, pearl and diamond, rival couple, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, cheren and bianca unova childhood friends passion, nuvema town bedroom, glasses and blonde hair, snivy and oshawott, professor juniper lab, childhood promise fulfilled, unova trio closeness, black and white, analytical and artistic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hugh and rosa rival passion, aspertia city bedroom, intense training turning intimate, tepig symbol on shirt, unova 2 region heat, sister kidnapped trauma comfort, rival battle tension, pokemon world tournament, competitive passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, shauna and calem kalos friend passion, vaniville town bedroom, chespin and fennekin, kalos starter trio, generation 6 friendship, pokemon-amie high affection, fashion and style, kalos region sunset, friends to lovers, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hau and selene alola friend passion, hauoli city beach bedroom, litten and popplio, tropical heat intimacy, island challenge completion, malasada shop after hours, alola cousin friendship, hawaiian shirt and floral dress, sunshine romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, hop and gloria rival passion, postwick bedroom, wooloo and yamper plushies, leon champion brother pressure, galar region countryside, dynamax band glowing, zamazenta and zacian blessing, british countryside aesthetic, rival battle aftermath, masterpiece, best quality, very aesthetic",

        // === GYM LEADERS ===
        "rating_suggestive, 1boy, 1girl, brock and misty gym leader passion, pewter city and cerulean city union, rock and water type, onix and starmie sleeping, gym badge case scattered, orange islands nostalgia, takeshi and kasumi, japanese festival date, classic anime style, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lt surge and sabrina gym leader passion, vermilion city and saffron city, electric and psychic type, raichu and alakazam, military uniform and elegant dress, gym leader conference, kanto region power couple, shocking mind connection, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, surge and erika gym leader passion, vermilion city and celadon city, electric and grass type, raichu and vileplume, military man and gentle woman, perfume shop after hours, opposites attract, kanto gym leader romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, falkner and bugsy johto gym leader passion, violet city and azalea town, flying and bug type, pidgeot and scyther, elegant kimono and explorer outfit, johto region traditional, bug catching contest victory, gentle gym leaders, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, morty and jasmine johto gym leader passion, ecruteak city and olivine city, ghost and steel type, gengar and steelix, mystical and industrial, lighthouse and burned tower, johto region spiritual, metal and spirit connection, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, chuck and clair johto gym leader passion, cianwood city and blackthorn city, fighting and dragon type, poliwrath and kingdra, muscular master and elegant master, dragon's den intimacy, martial arts training aftermath, johto region master couple, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, roxanne and brawly hoenn gym leader passion, rustboro city and dewford town, rock and fighting type, nosepass and makuhita, bookworm and surfer, museum after hours, hoenn region diverse personalities, intelligence and strength, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, wattson and flannery hoenn gym leader passion, mauville city and lavaridge town, electric and fire type, magneton and torkoal, old inventor and young hothead, new mauville generator room, volcanic hot spring, hoenn region temperature play, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, norman and caroline parent passion, petalburg city bedroom, normal type gym leader and loving wife, slaking and delcatty, professor birch family friends, hoenn region parental love, mature couple romance, birchs visiting, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, crasher wake and maylene sinnoh gym leader passion, pastoria city and veilstone city, water and fighting type, floatzel and lucario, wrestler mask and pink hair, veilstone game corner after hours, sinnoh region tough couple, wrestling and martial arts, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, volkner and fantina sinnoh gym leader passion, sunyshore city and hearthome city, electric and ghost type, electivire and mismagius, bored genius and flamboyant contest star, gym and contest hall, sinnoh region artistic, light and shadow play, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, cilan and skyla unova gym leader passion, striaton city and mistralton city, grass and flying type, pansage and swanna, tea connoisseur and pilot, gym cafe and airfield, unova region gourmet, flight and flavor, connoisseur evaluation, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, grimsley and caitlin elite four passion, unova league castle, dark and psychic type, bisharp and metagross, gambler and noble, elite four private quarters, unova region elegance, midnight castle atmosphere, dark and light, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, virizion and cobalion sword of justice passion, rumination field, grass and steel type, legendary pokemon human forms, justice and protection, kyurem story aftermath, unova region legendary, noble warrior romance, quartet closeness, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, clemont and bonnie kalos gym leader sibling chaperone passion, lumiose city bedroom, electric type and little sister, dedenne sleeping nearby, gym renovation after hours, kalos region technology, helioisk and diggersby, sibling protection, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, korrina and gurkinn mega evolution masters passion, shalour city tower of mastery, fighting type lineage, lucario and hawlucha, mega evolution aura, grandfather granddaughter training, kalos region ancient secrets, aura guardian bloodline, mega stone glow, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ramos and wulfric kalos gym leader passion, coumarine city and snowbelle city, grass and ice type, googoat and avalugg, elderly gardener and bearded viking, age gap experience, kalos region extremes, summer and winter, greenhouse and ice cave, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kiawe and mallow alola trial captain passion, akala island, fire and grass type, marowak and tsareena, hula dancer and cook, lush jungle and wela volcano, alola region islanders, traditional hawaiian, hot and spicy, cooking together, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, molayne and sophocles aether foundation passion, heahea city, steel and electric type, dugtrio and togedemaru, cousin and computer geek, hokulani observatory, alola region science, star gazing romance, space center intimacy, technology and stars, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, milo and nessa galar gym leader passion, turffield and hulbury, grass and water type, eldegoss and drednaw, gentle giant and model athlete, gym stadium showers, galar region fields and coast, countryside and ocean, pokemon league scandal, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, kabu and bea galar gym leader passion, motostoke and stow-on-side, fire and fighting type, centiskorch and sirfetchd, elderly mentor and young karateka, training dojo after hours, galar region mentorship, master disciple tension, hotblooded passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, opal and bede galar gym leader successor passion, ballonlea, fairy type, alcremie and hattrem, elderly witch and arrogant protege, gym mission test, galar region succession, tea party turning intimate, fairy wind and psychic, age gap mentorship, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, gordie and melony galar gym leader mother son passion, circhester, rock and ice type, coalossal and lapras, hot sand and cold ice, son and mother tension, family drama, galar region scandal, curry restaurant after hours, master trainer family, masterpiece, best quality, very aesthetic",

        // === ELITE FOUR AND CHAMPIONS ===
        "rating_suggestive, 1boy, 1girl, lance and lorelei kanto elite four passion, indigo plateau, dragon and ice type, dragonite and lapras, dragon master and elegant lady, elite four private chambers, kanto region power, champion room intimacy, cape and glasses, classic generation, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, steven stone and phoebe hoenn elite four passion, ever grande city, steel and ghost type, metagross and dusknoir, president and shrine maiden, devon corporation bedroom, hoenn region wealth, champion and elite four, ancient ruins and modern, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, wallace and winona hoenn gym leader passion, sootopolis city and fortree city, water and flying type, milotic and altaria, contest master and bird keeper, sky pillar and cave of origin, hoenn region beauty, elegant and wild, dragon ascend passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, cynthia and cyrus sinnoh champion and villain passion, spear pillar ruins, champion and team galactic boss, garchomp and dialga, time and space distortion, ancient power seduction, sinnoh region cosmic, legendary pokemon witnessing, villain redemption, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, cynthia and dawn champion trainer passion, celestial town bedroom, champion and rookie, garchomp and piplup, mentor and student, sinnoh region ultimate, contest and battle, experienced guidance, black and gold dress, elegant passion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, alder and iris unova champion succession passion, unova league, dragon type master and young successor, volcarona and haxorus, elder and child, generation gap mentorship, unova region future, training room intimacy, dragon dance, legacy transfer, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, diantha and lysandre kalos champion and villain passion, team flare secret base, fairy and fire type, gardevoir and yveltal, beautiful actress and obsessed leader, lysandre labs basement, kalos region tragedy, eternal beauty obsession, flamboyant elegance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, diantha and professor sycamore kalos childhood friends passion, luminose city laboratory, champion and professor, gardevoir and charizard, kalos region science, mega evolution research, childhood reunion, professor and student forbidden, elegance and intelligence, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, leon and sonia galar champion and professor passion, wyndon bedroom, charizard and yamper, undefeated champion and research assistant, rose tower aftermath, galar region fame, hop cousin jealously, pokemon battles and research, british elegance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, leon and raihan galar champion and gym leader passion, hammerlocke stadium, dragon type rivals, charizard and duraludon, friendly rivalry turning intimate, wyndon and hammerlocke, galar region competitive, cape and hoodie, pokemon world cup, dragon masters, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, mustard and honey galar dojo master passion, master dojo bedroom, fighting type mastery, kubfu and urshifu, isle of armor isolation, legendary pokemon blessing, galar region dlc, mustard jacket and apron, master and wife, dojo romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, peony and rose galar chairman and explorer passion, crown tundra station, steel type brothers, copperajah and aggron, macro cosmos and exploration, galar region family, chairman bedroom, brotherly tension, wealthy and adventurous, crown tundra cold, masterpiece, best quality, very aesthetic",

        // === TEAM VILLAINS ===
        "rating_suggestive, 1boy, 1girl, giovanni and ariana team rocket passion, viridian city gym basement, boss and executive, Persian and arbok, criminal organization love, kanto region villainy, team rocket hideout, secret romance, criminal couple, master ball nearby, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, archie and shelly team aqua passion, lilycove city hideout, water type extremists, kyogre awakening aftermath, pirate captain and admin, hoenn region ocean, team aqua uniform, submarine bedroom, sea floor cavern, water and darkness, passionate villains, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, maxie and courtney team magma passion, mt chimney base, fire type extremists, groudon awakening, scientist and admin, hoenn region volcanic, team magma uniform, magma hideout heat, dry and intense, villain passion, legendary energy, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, cyrus and mars team galactic passion, veilstone city building, space and time obsession, dialga and palkia, emotionless leader and devoted admin, sinnoh region cosmos, team galactic uniform, spear pillar plan aftermath, cold and calculating, villain worship, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ghetsis and anthea and concordia team plasma passion, n castle throne room, false king and muses, zekrom and reshiram, adoptive father complex, unova region liberation, team plasma uniform, muses comfort, twisted family, liberation and control, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lysandre and malva team flare passion, lysandre labs, destruction and beauty, yveltal and talonflame, leader and elite four, kalos region extremism, team flare uniform, ultimate weapon chamber, eternal life obsession, beautiful destruction, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, guzma and plumeria team skull passion, shady house po town, poison and bug type, golisopod and salazzle, boss and admin, alola region outcasts, team skull uniform, abandoned city, punk and goth, rejected by island challenge, outcast romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lusamine and mohn aether foundation passion, aether paradise bedroom, ultra beast research, lillie and gladion parents, alola region family tragedy, ultra space aftermath, beauty and science, mother and father, nihilego and pheromosa, family reunion, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, rose and oleana macro cosmos passion, rose tower penthouse, steel and poison type, copperajah and garbodor, chairman and secretary, galar region industry, macro cosmos uniform, championship match aftermath, business and pleasure, wealthy executive, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, piers and marnie galar gym leader siblings passion, spikemuth bedroom, dark type, obstagoon and morpeko, goth rockstar and cute idol, team yell cheering, galar region punk, spikemuth club after hours, sibling rivalry, midnight form, masterpiece, best quality, very aesthetic",

        // === PROFESSORS AND ASSISTANTS ===
        "rating_suggestive, 1boy, 1girl, professor oak and agatha kanto professor and elite four passion, pallet town laboratory, pokemon researcher and ghost specialist, starter pokemon sleeping, kanto region elders, oak laboratory basement, old friends reunion, master and rival, pikachu and gengar, nostalgic romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor elm and professor ivy johto professor passion, new bark town lab, johto and orange islands, chikorita and gyarados research, water pokemon breeding, long distance romance, johto region science, professor network, pokemon eggs, marine and land, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor birch and professor cozmo hoenn scientist passion, littleroot town lab, pokemon habitat and meteor research, treecko and lunatone, hoenn region academia, space center collaboration, husband and wife science, field research, may and brendan parents, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor rowan and cynthia sinnoh professor champion passion, sandgem town lab, pokemon evolution and ancient history, turtwig and garchomp, sinnoh region knowledge, professor and student inappropriate, ancient pokemon research, library intimacy, encyclopedia scattered, academic romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor juniper and bianca unova professor and assistant passion, nuvema town lab, snivy and oshawott research, professor and new researcher, unova region starter distribution, laboratory after hours, professor glasses and blonde, scientific passion, research collaboration, snivy and tepig, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor sycamore and serena kalos professor trainer passion, luminose city lab, chespin and fennekin, kalos region mega evolution, trainer support and professor, friendly guidance, cafe intimacy, eiffel tower view, french romance, stylish and elegant, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor kukui and professor burnet alola professors passion, pokemon research lab on beach, rowlet and popplio, alola region married couple, ultra space research, pokemon league founder, tropical bedroom, surf and science, sun and moon professors, island life, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor magnolia and sonia galar professor and assistant passion, wurrpleton bedroom, scorbunny and yamper, dynamax research, galar region history, zamazenta and zacian legend, grandmother and granddaughter, family science, pokemon league history, british countryside, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor laventon and irida hisui professor and clan leader passion, jubilife village, cyndaquil and glaceon, hisui region ancient sinnoh, galaxy team and pearl clan, noble pokemon research, time traveler and native, cultural exchange, ancient hisui intimacy, fire and ice, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, professor sada and turo scarlet violet professor passion, naranja academy laboratory, koraidon and miraidon, past and future pokemon, scarlet and violet paradox, zero lab secret, paldea region ancient future, professor parents, legends arceus connection, time machine intimacy, masterpiece, best quality, very aesthetic",

        // === SPECIAL CHARACTERS ===
        "rating_suggestive, 1boy, 1girl, red and misty anniversary passion, pallet town and cerulean city, pikachu and starmie, anniversary celebration, years of traveling together, gym leader and champion, kanto region golden couple, mature adult versions, long term relationship, staryu and gyarados, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash ketchum and serena wedding night passion, pallet town bedroom, pikachu and braixen sleeping, amourshipping fulfilled, kalos region reunion, childhood friends to marriage, xy and z anime, blue ribbon remembered, long distance love rewarded, ash grown up, mature satoshi, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and misty wedding night passion, pallet town, pikachu and togepi, pokeshipping fulfilled, orange islands nostalgia, kasumi and satoshi, childhood friends to lovers, water flowers and thunderbolts, cerulean gym visit, anime original, first girl wins, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and dawn honeymoon passion, twinleaf town, pikachu and piplup, pearlshipping fulfilled, sinnoh region adventure, hikari and satoshi, contest and gym, childhood friends to marriage, high touch generation, twinleaf memories, bicycle crash love, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and iris reunion passion, unova region, pikachu and axew, negaishipping fulfilled, dragon master and world champion, shannon and satoshi, opelucid city visit, black and white anime, dragon busting destiny, aged up adult versions, master trainer couple, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and lillie alola wedding passion, alola region, pikachu and snowy, alolashipping fulfilled, ether foundation visit, lusamine approval, magearna and tapu koko blessing, sun and moon anime, blonde and black hair, tropical wedding night, elite four family, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and mallow passion, alola region, pikachu and tsareena, sweetshipping fulfilled, restaurant intimacy, aina kitchen after hours, trial complete celebration, sm001-sm146 journey, tropical heat, cooking together, sweet and spicy, hawaiian romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and lana passion, alola region, pikachu and primarina, blueshipping fulfilled, ocean diving intimacy, trial captain and champion, water pokemon lovers, fishing together, deep sea exploration, popplio evolution, alolan sunset, beach romance, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, ash and chloe passion, kanto region, pikachu and eevee, journeys shipping fulfilled, project mew completion, sakuragi institute visit, goh friendship, professor daughter, black hair and brown, new series romance, research and battling, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, goh and chloe sibling childhood friend passion, vermilion city, scorbunny and yamper, journeys series, sakuragi family, childhood friend romance, professor daughter and researcher, mew project completion, kanto region modern, eevee and inteleon, new generation, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, trace and elaine lets go passion, pallet town, pikachu and eevee, rival and friend, game protagonist intimacy, kanto region modern remake, professor oak grandson, rival bedroom, pokeball plus, walking pokemon, generation 7.5, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, scottie and bette pokemon masters passion, pasio island, sync pairs united, pokemon masters ex, deNA mobile game, sync stone intimacy, battle villa victory, champion stadium completion, pokefair scout success, eggmon hatching, pokemon center bedroom, mobile game aesthetic, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, lucas and cynthia pokemon masters passion, sinnoh festival, dialga and palkia, sync pairs anniversary, deNA celebration, champion and trainer, garchomp and turtwig, master fair scout, limited pair romance, sinnoh region celebration, legendary sync move, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, n and hilbert team plasma redemption passion, unova region, zekrom and reshiram, truth and ideals, pokemon black white, natural harmony and human progress, ferris wheel date fulfilled, n castle bedroom, legendary dragon blessing, plasma king and hero, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, wally and may rival passion, hoenn region, gallade and blaziken, victory road encounter, sickly boy and energetic girl, mega evolution completed, ever grande city view, sky pillar sunset, space center visit, legendary pokemon encounter, reverse battle victory, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, zinnia and brendan delta episode passion, sky pillar summit, rayquaza awakening, lorekeeper and trainer, hoenn region crisis, meteor falling, ancient dragon awakening, space center cooperation, lore secret, dragon ascent, mega rayquaza, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, looker and emma detective passion, lumiose city, detective bureau office, kalos region case closed, pokemon theft ring solved, espurr and croagunk, mysterious organization aftermath, detective and assistant, noir romance, trench coat and pink hair, city lights, masterpiece, best quality, very aesthetic",
        "rating_suggestive, 1boy, 1girl, grusha and mela team star passion, paldea region, ice and fire type, cetitan and armarouge, gym leader and team star boss, art and battle aftermath, montenevera and artazon, scarlet violet generation, graffiti and snow, rebellious youth romance, masterpiece, best quality, very aesthetic",
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
        userId: "system_pokemon_shipping_script",
        likesCount: Math.floor(Math.random() * 50) + 10,
        bookmarksCount: Math.floor(Math.random() * 10)
    };

    await db.collection("model_showcase_images").add(docData);
    return imageUrl;
}

async function main() {
    const models = MODEL_OVERRIDE ? [MODEL_OVERRIDE] : Object.keys(PROMPTS_PER_MODEL);

    console.log("=== POKEMON SHIPPING & TRAINER COUPLES SHOWCASE ===");
    console.log("Famous Pokemon Ships - Ecchi, Hentai & Romantic Fanfic");
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

    console.log("\n=== POKEMON SHIPPING SHOWCASE COMPLETE ===");
    console.log("All trainer couples generated and uploaded!");
}

main().catch(console.error);
