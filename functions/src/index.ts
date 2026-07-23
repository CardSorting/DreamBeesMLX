import "./firebaseInit.js"; // Ensure Firebase Admin is initialized

import { api } from "./api.js";
import { adminGeneration } from "./adminGeneration.js";
import { dreamtrail } from "./dreamtrail.js";
import { web } from "./web.js";
import { urgentWorker, backgroundWorker } from "./workers/queues.js";
import { staleJobCleanup } from "./workers/recovery.js";
import { walletGuard } from "./triggers/walletGuard.js";
// Export the main services
export {
    api,
    adminGeneration,
    dreamtrail,
    web,
    urgentWorker,
    backgroundWorker,
    staleJobCleanup,
    walletGuard
};
