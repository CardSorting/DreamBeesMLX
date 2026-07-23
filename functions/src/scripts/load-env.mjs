import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

const ENV_CANDIDATES = [
    path.resolve(scriptsDir, "../../.env"),
    path.resolve(scriptsDir, "../../../.env"),
    path.resolve(scriptsDir, "../.env")
];

const parseEnvLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
        process.env[key] = value;
    }
};

/** Load the first .env file found (functions/.env, repo root, then legacy src/.env). */
export async function loadEnv() {
    for (const envPath of ENV_CANDIDATES) {
        try {
            const envFile = await fs.readFile(envPath, "utf-8");
            envFile.split("\n").forEach(parseEnvLine);
            return envPath;
        } catch {
            // try next candidate
        }
    }
    return null;
}

export const requireB2Credentials = () => {
    const B2_KEY_ID = process.env.B2_KEY_ID || process.env.VITE_B2_KEY_ID;
    const B2_APP_KEY = process.env.B2_APP_KEY || process.env.VITE_B2_APP_KEY;

    if (!B2_KEY_ID || !B2_APP_KEY) {
        console.error("Missing B2 credentials.");
        console.error("Create functions/.env from functions/.env.example (or use repo-root .env with VITE_B2_* keys).");
        console.error(`Checked: ${ENV_CANDIDATES.join(", ")}`);
        process.exit(1);
    }

    return {
        B2_ENDPOINT: process.env.B2_ENDPOINT || process.env.VITE_B2_ENDPOINT,
        B2_REGION: process.env.B2_REGION || process.env.VITE_B2_REGION,
        B2_BUCKET: process.env.B2_BUCKET || process.env.VITE_B2_BUCKET,
        B2_KEY_ID,
        B2_APP_KEY,
        B2_PUBLIC_URL: process.env.B2_PUBLIC_URL || process.env.VITE_B2_PUBLIC_URL
    };
};
