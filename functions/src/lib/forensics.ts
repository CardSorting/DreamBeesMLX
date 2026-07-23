import { logger } from "./utils.js";

export interface ForensicContext {
    requestId: string;
    workerName: string;
    taskType?: string;
    userId?: string;
    startTime: number;
}

export class ForensicLogger {
    private context: ForensicContext;
    private checkpoints: Record<string, number> = {};

    constructor(context: ForensicContext) {
        this.context = context;
        this.checkpoints['start'] = context.startTime;
    }

    /**
     * Record a checkpoint in the task execution
     */
    checkpoint(name: string, metadata: Record<string, any> = {}) {
        const now = Date.now();
        const elapsedSinceStart = now - this.context.startTime;
        const lastCheckpoint = Object.values(this.checkpoints).pop() || this.context.startTime;
        const elapsedSinceLast = now - lastCheckpoint;
        
        this.checkpoints[name] = now;

        const metabolic = this.getMetabolicMetrics();

        logger.info(`[ZAP][${this.context.workerName}][${name}] ${this.context.requestId}`, {
            ...this.context,
            checkpoint: name,
            elapsedSinceStart,
            elapsedSinceLast,
            ...metadata,
            ...metabolic
        });
    }

    /**
     * Log a successful task completion with final metrics
     */
    complete(result: any = {}, metadata: Record<string, any> = {}) {
        const duration = Date.now() - this.context.startTime;
        const metabolic = this.getMetabolicMetrics();

        logger.info(`[ZAP][${this.context.workerName}][COMPLETE] ${this.context.requestId}`, {
            ...this.context,
            duration,
            ...metadata,
            ...metabolic,
            success: true
        });
    }

    /**
     * Log a task failure with error details and metrics
     */
    fail(error: any, metadata: Record<string, any> = {}) {
        const duration = Date.now() - this.context.startTime;
        const metabolic = this.getMetabolicMetrics();

        logger.error(`[ZAP][${this.context.workerName}][FAILED] ${this.context.requestId}`, error, {
            ...this.context,
            duration,
            ...metadata,
            ...metabolic,
            success: false
        });
    }

    /**
     * Get memory usage and other system metrics
     */
    private getMetabolicMetrics() {
        const memory = process.memoryUsage();
        return {
            mem_rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
            mem_heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
            mem_heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB'
        };
    }
}
