/**
 * Builds Modal substrate request bodies from worker task parameters.
 * Centralizes per-model inference conventions (steps, cfg, hires_fix, etc.).
 */

import { isAnimaFamilyModel } from "../lib/modelConventions.js";

export type SubstrateRequestParams = {
    modelId: string;
    prompt: string;
    negative_prompt?: string;
    steps?: number;
    cfg?: number;
    scheduler?: string;
    aspectRatio: string;
    width: number;
    height: number;
};

export const buildSubstrateRequestBody = (params: SubstrateRequestParams): Record<string, unknown> => {
    const {
        modelId,
        prompt,
        negative_prompt = "",
        steps = 30,
        cfg = 7,
        scheduler = "DPM++ 2M Karras",
        aspectRatio,
        width,
        height
    } = params;

    let finalSteps = steps || 30;
    let finalCfg = cfg || 7;
    let finalScheduler = scheduler || "DPM++ 2M Karras";
    let hires_fix = false;
    let finalPrompt = prompt;

    if (modelId === "wai-illustrious") {
        hires_fix = true;
    } else if (modelId === "z-image-turbo-rtx6000") {
        finalSteps = Math.min(Math.max(steps || 8, 1), 9);
        finalCfg = cfg || 0.0;
        hires_fix = false;
    } else if (modelId === "z-image-base-rtx6000") {
        finalSteps = Math.min(Math.max(steps || 28, 1), 28);
        finalCfg = cfg || 5.0;
        hires_fix = false;
    } else if (modelId === "nova-3d-cg-xl") {
        hires_fix = true;
        const qualityTags = ", 3d render, cgi, masterwork, ultra detailed, cinematic lighting";
        if (!finalPrompt.toLowerCase().includes("3d render")) {
            finalPrompt = `${finalPrompt}${qualityTags}`;
        }
    } else if (isAnimaFamilyModel(modelId)) {
        finalSteps = steps || 30;
        finalCfg = cfg || 4.5;
        finalScheduler = scheduler || "FlowMatchEuler";
        hires_fix = false;
    }

    if (modelId === "z-image-turbo-rtx6000" || modelId === "z-image-base-rtx6000") {
        return {
            prompt: finalPrompt,
            negative_prompt,
            steps: finalSteps,
            aspect_ratio: aspectRatio,
            width,
            height
        };
    }

    return {
        prompt: finalPrompt,
        model: modelId || "wai-illustrious",
        negative_prompt,
        steps: finalSteps,
        cfg: finalCfg,
        width,
        height,
        scheduler: finalScheduler,
        hires_fix
    };
};
