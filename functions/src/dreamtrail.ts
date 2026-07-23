import { onRequest } from "firebase-functions/v2/https";
import { handleDreamTrail } from "./handlers/dreamtrail.js";

export const dreamtrail = onRequest({
    memory: "256MiB",
    cors: true,
    timeoutSeconds: 10,
    secrets: ["OPENROUTER_API_KEY"],
}, handleDreamTrail);
