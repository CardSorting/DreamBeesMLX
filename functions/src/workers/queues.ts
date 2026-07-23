
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { processImageTask } from "./image.js";
import { processCleanupTasks } from "./cleanup.js";
import { logger } from "../lib/utils.js";
import { ForensicLogger } from "../lib/forensics.js";
import { IMAGE_TASK_TYPE } from "../generation/contract.js";

// --- SECURITY: Define allowed task types to prevent injection attacks ---
const SAFE_TASK_TYPES = [
    IMAGE_TASK_TYPE,
    "cleanup-resource"
];
// ----------------------------------------------------------------------

/**
 * Shared Processor Logic
 */
const processTask = async (req: { data: any }, workerName: string): Promise<any> => {
    const { taskType, ...data } = req.data;
    const startTime = Date.now();
    const requestId = data.requestId || "unknown";

    const forensic = new ForensicLogger({
        requestId,
        workerName,
        taskType,
        userId: data.userId,
        startTime
    });

    forensic.checkpoint("start");

    try {
        let result: any;

        // --- SECURITY: Validate task type to prevent injection attacks ---
        if (!SAFE_TASK_TYPES.includes(taskType)) {
            forensic.fail(new Error(`Unauthorized task type: ${taskType}`));
            throw new Error(`Unauthorized task type: ${taskType}`);
        }
        // ---------------------------------------------------------------

        switch (taskType) {
            case IMAGE_TASK_TYPE:
                result = await processImageTask(req);
                break;

            case "cleanup-resource":
                result = await processCleanupTasks(req);
                break;

            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }

        forensic.complete(result);
        return result;

    } catch (error: any) {
        forensic.fail(error);
        throw error;
    }
};

/**
 * Urgent Worker (High Priority)
 */
export const urgentWorker = onTaskDispatched(
    {
        retryConfig: {
            maxAttempts: 3,
            minBackoffSeconds: 5,
            maxDoublings: 2
        },
        rateLimits: {
            maxConcurrentDispatches: 20,
            maxDispatchesPerSecond: 50
        },
        memory: "1GiB",
        timeoutSeconds: 540,
    },
    (req) => processTask(req, "UrgentWorker")
);

/**
 * Background Worker (Low Priority)
 */
export const backgroundWorker = onTaskDispatched(
    {
        retryConfig: {
            maxAttempts: 5,
            minBackoffSeconds: 30,
            maxDoublings: 4
        },
        rateLimits: {
            maxConcurrentDispatches: 2,
            maxDispatchesPerSecond: 2
        },
        memory: "1GiB",
        timeoutSeconds: 900,
    },
    (req) => processTask(req, "BackgroundWorker")
);
