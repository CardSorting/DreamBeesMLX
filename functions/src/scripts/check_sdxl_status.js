import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { GENERATION_QUEUE_COLLECTION } from "#generation/contract";

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
} catch { }

initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || "dreambees-alchemist"
});
const db = getFirestore();

async function checkStatus() {
    const rid = 'test_wai_illustrious_1769490859562';
    const doc = await db.collection(GENERATION_QUEUE_COLLECTION).doc(rid).get();

    if (!doc.exists) {
        console.log(`Document ${rid} not found.`);
        return;
    }

    console.log(`SDXL Request ${doc.id}: Status = ${doc.data().status}`);
    if (doc.data().imageUrl) console.log(`Image URL: ${doc.data().imageUrl}`);
    if (doc.data().error) console.log(`Error: ${doc.data().error}`);
}

checkStatus().catch(console.error);
