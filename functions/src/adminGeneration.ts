import { onRequest } from "firebase-functions/v2/https";
import { handleAdminGeneration } from "./handlers/adminGeneration.js";

/**
 * Standalone admin image-generation API.
 * No Firebase user auth required — protected by ADMIN_GENERATION_KEY.
 * Bypasses Zap/credit deduction for internal admin tooling.
 */
export const adminGeneration = onRequest({
    memory: "512MiB",
    cors: true,
    timeoutSeconds: 120,
    secrets: ["ADMIN_GENERATION_KEY"]
}, handleAdminGeneration);
