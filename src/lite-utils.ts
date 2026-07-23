/**
 * [LAYER: INFRASTRUCTURE]
 */
import { lazy, ComponentType } from 'react';

export interface AIModel {
    id: string;
    name: string;
    description: string;
    image: string;
    type?: string;
    isActive?: boolean;
    order?: number;
}

/**
 * Optimizes image URLs for the DreamBees CDN
 */
export const getOptimizedImageUrl = (url: string | null | undefined): string | null | undefined => {
    if (!url || typeof url !== 'string') return url;
    
    // Redirect local model requests to optimized JPEG assets
    if (!url.startsWith('http') && url.includes('/models/') && url.endsWith('.png')) {
        url = url.replace('.png', '.jpg');
    }
    
    if (url.startsWith('https://cdn.dreambeesai.com')) return url;
    if (url.includes('backblazeb2.com')) {
        const b2Pattern = /https?:\/\/[^/]+\.backblazeb2\.com\//;
        return url.replace(b2Pattern, 'https://cdn.dreambeesai.com/file/printeregg/');
    }

    // Support file:// protocol in Electron (which requires relative paths)
    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
    if (isFileProtocol) {
        if (url.startsWith('/')) {
            return url.substring(1);
        }
        return url;
    }
    
    return !url.startsWith('http') && !url.startsWith('/') ? `/${url}` : url;
};

/**
 * Retries lazy component loading to handle network hiccups
 */
export const lazyRetry = (componentImport: () => Promise<{ default: ComponentType<any> }>) => {
    return lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            console.error('Lazy load failed, retrying...', error);
            try {
                return await componentImport();
            } catch (secondError) {
                throw secondError;
            }
        }
    });
};

/**
 * Update document title without react-helmet
 */
export const useTitle = (title: string) => {
    if (typeof document !== 'undefined') {
        document.title = `${title} | DreamBees LITE`;
    }
};

export const sanitizeInput = (text: string, maxLength: number = 1000): string => {
    if (!text || typeof text !== 'string') return '';
    return text.trim().slice(0, maxLength).replace(/[<>]/g, '');
};

/**
 * Safely writes to localStorage during browser idle time to prevent main-thread jank.
 */
export const idleSaveToLocalStorage = (key: string, value: string) => {
    const save = () => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[Lite] localStorage write failed for key ${key}:`, e);
        }
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => save(), { timeout: 2000 });
    } else {
        setTimeout(save, 1000);
    }
};

/**
 * PRODUCTION HARDENING: Structured Tier Definitions
 */
export interface UserTier {
    level: string;
    color: string;
    minGens: number;
    benefits: string[];
}

export const USER_TIERS: UserTier[] = [
    { level: "Novice Dreamer", color: "#a1a1aa", minGens: 0, benefits: ["Standard Speed", "Basic Archive"] },
    { level: "Creative Adept", color: "#8b5cf6", minGens: 10, benefits: ["Priority Queue", "Enhanced Resolution"] },
    { level: "Elite Artisan", color: "#a855f7", minGens: 30, benefits: ["Experimental Engines", "Full Archive Export"] },
    { level: "Master Visionary", color: "#fbbf24", minGens: 100, benefits: ["Manifestation Priority", "Custom Engine Access"] }
];

export const calculateTier = (genCount: number): UserTier => {
    return [...USER_TIERS].reverse().find(t => genCount >= t.minGens) || USER_TIERS[0];
};

/**
 * PRODUCTION HARDENING: Enhanced Model Insights
 */
export const getModelMetadata = (model: AIModel) => {
    const n = model.name.toLowerCase();
    const isReal = n.includes('real');
    const isAnime = n.includes('anime');

    return {
        isFlagship: n.includes('illustrious') || n.includes('turbo'),
        tag: isReal ? "Precision" : (isAnime ? "Aesthetic" : "Creative"),
        insight: isReal ? "Portrait & Product Detail" : (isAnime ? "Anime & Character Art" : "Digital Art Mastery"),
        shortDesc: model.description.length > 80 ? model.description.substring(0, 77) + "..." : model.description
    };
};

/**
 * Image optimization utilities
 */
export { generatePreviewUrl, generateHeroUrl, generateThumbnailUrl, optimizeImageUrl, isLocalFile } from './utils/imagePreview';
export { observeElement } from './utils/sharedObserver';

/**
 * Feedback and notification utilities
 */
export {
    showToast,
    copyToClipboard,
    downloadImage,
    showLoading,
    showSuccess,
    showError,
    formatDuration
} from './utils/feedback';
