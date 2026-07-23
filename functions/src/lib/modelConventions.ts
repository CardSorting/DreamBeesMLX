/**
 * Model Conventions & Abstraction Layer
 * 
 * Centralizes all model-related identifiers, endpoints, and parameters.
 */

// ==============================================================================
// 1. Model ID Definitions (Domain Layer)
// ==============================================================================

export const MODEL_IDS = {
    NOVA_FURRY: 'nova-furry-xl',
    SCYRAX_PASTEL: 'scyrax-pastel',
    WAI_ILLUSTRIOUS: 'wai-illustrious',
    RIN_ANIME_BLEND: 'rin-anime-blend',
    RIN_ANIME_POPCUTE: 'rin-anime-popcute',
    CRYSTAL_CUTENESS: 'crystal-cuteness',
    VERETOON_V10: 'veretoon-v10',
    NOVA_3D: 'nova-3d-cg-xl',
    ZIT_TURBO: 'z-image-turbo-rtx6000',
    ZIT_BASE: 'z-image-base-rtx6000',
    ANIMA: 'anima',
    HASSAKU: 'hassaku',
    KIWIMIX: 'kiwimix',
    FLUX_2_DEV: 'flux-2-dev',
    FLUX_2_KLEIN: 'flux-2-klein-9b'
} as const;

export const ANIMA_FAMILY_MODELS = [
    MODEL_IDS.ANIMA,
    MODEL_IDS.HASSAKU,
    MODEL_IDS.KIWIMIX
] as const;

export function isAnimaFamilyModel(modelId: string): boolean {
    return (ANIMA_FAMILY_MODELS as readonly string[]).includes(modelId);
}

export type ModelID = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

// ==============================================================================
// 2. Backend Endpoint Mapping (Infrastructure Layer)
// ==============================================================================

export const MODEL_ENDPOINTS = {
    [MODEL_IDS.ZIT_TURBO]: 'https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run',
    [MODEL_IDS.ZIT_BASE]: 'https://mariecoderinc--zit-rtx6000-stable-base-fastapi-app.modal.run',
    [MODEL_IDS.ANIMA]: 'https://mariecoderinc--anima-inference-animainference-web.modal.run'
} as const;

export function isValidModelId(id: string): id is ModelID {
    return Object.values(MODEL_IDS).includes(id as ModelID);
}

// ==============================================================================
// 3. Generation Parameters (Domain-Specific)
// ==============================================================================

export const MODEL_GENERATION_PARAMS = {
    [MODEL_IDS.WAI_ILLUSTRIOUS]: {
        hiresFix: true
    },
    [MODEL_IDS.NOVA_3D]: {
        hiresFix: true,
        qualityTags: ", 3d render, cgi, masterwork, ultra detailed, cinematic lighting"
    },

    [MODEL_IDS.ZIT_TURBO]: {
        defaultSteps: 8,
        maxSteps: 9,
        defaultCfg: 0.0,
        hiresFix: false
    },
    [MODEL_IDS.ZIT_BASE]: {
        defaultSteps: 28,
        maxSteps: 28,
        defaultCfg: 5.0,
        hiresFix: false
    },
    [MODEL_IDS.ANIMA]: {
        defaultSteps: 30,
        defaultScheduler: 'FlowMatchEuler',
        defaultCfg: 4.5,
        hiresFix: false
    },
    [MODEL_IDS.HASSAKU]: {
        defaultSteps: 30,
        defaultScheduler: 'FlowMatchEuler',
        defaultCfg: 4.5,
        hiresFix: false
    },
    [MODEL_IDS.KIWIMIX]: {
        defaultSteps: 30,
        defaultScheduler: 'FlowMatchEuler',
        defaultCfg: 4.5,
        hiresFix: false
    },
    [MODEL_IDS.FLUX_2_DEV]: {
        defaultSteps: 25
    },
    [MODEL_IDS.FLUX_2_KLEIN]: {
        defaultSteps: 25
    }
} as const;

// ==============================================================================
// 4. Model Categories & Costs (Domain Layer)
// ==============================================================================

export const MODEL_CATEGORIES = {
    ULTRA: [] as readonly string[],
    PREMIUM: ['wai-illustrious', 'nova-3d-cg-xl', 'flux-2-dev', 'z-image-turbo-rtx6000', 'z-image-base-rtx6000'],
    FAST: ['flux-2-klein-9b'],
    STANDARD: [
        'nova-furry-xl',
        'scyrax-pastel',
        'rin-anime-blend',
        'rin-anime-popcute',
        'crystal-cuteness',
        'veretoon-v10',
        'anima',
        'hassaku',
        'kiwimix'
    ]
} as const;

export const MODEL_COSTS = {
    ULTRA: 2.0,
    PREMIUM: 1.0,
    FAST: 0.5,
    STANDARD: 0.25
} as const;

export function getModelCost(modelId: string): number {
    if (modelId === 'anima') return MODEL_COSTS.STANDARD;
    if (MODEL_CATEGORIES.ULTRA.some(id => id === modelId)) return MODEL_COSTS.ULTRA;
    if (MODEL_CATEGORIES.PREMIUM.some(id => id === modelId)) return MODEL_COSTS.PREMIUM;
    if (MODEL_CATEGORIES.FAST.some(id => id === modelId)) return MODEL_COSTS.FAST;
    return MODEL_COSTS.STANDARD;
}

// ==============================================================================
// 6. Utility Functions
// ==============================================================================

export function getModelEndpoint(modelId: string): string {
    const SDXL_ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
    if (isAnimaFamilyModel(modelId)) {
        return MODEL_ENDPOINTS[MODEL_IDS.ANIMA];
    }
    if (modelId === MODEL_IDS.FLUX_2_DEV || modelId === MODEL_IDS.FLUX_2_KLEIN) {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'your_cloudflare_account_id';
        return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/${modelId}`;
    }
    return MODEL_ENDPOINTS[modelId as keyof typeof MODEL_ENDPOINTS] || SDXL_ENDPOINT;
}
