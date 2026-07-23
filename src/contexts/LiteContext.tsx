/**
 * [LAYER: INFRASTRUCTURE]
 */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import {
    GenerationStage,
    LONG_RUNNING_MESSAGE,
    IN_LINE_MESSAGE,
    SLOW_START_MESSAGE,
    clearPendingGeneration,
    filterDisplayableHistory,
    loadPendingGeneration,
    type PendingGeneration,
    type GenerationHistoryEntry,
    loadLocalGenerations,
    localHistoryStorageKey,
    mergeGenerationHistory,
    matchesPendingRequest,
    messageForStage,
    monotonicProgress,
    parseCallableError,
    finalizeClaimedPendingJob,
    preloadImage,
    savePendingGeneration,
    scopeLocalHistoryForUser,
    smoothIdleProgress,
    toHistoryTimestamp,
} from '../lib/generationFlow';
import { normalizeAspectRatio } from '../lib/aspectRatios';
import toast from '../utils/lazyToast';
type User = { uid: string; displayName?: string; email?: string } | null;
import { AIModel, getOptimizedImageUrl, sanitizeInput, idleSaveToLocalStorage } from '../lite-utils';

const BUILTIN_MODELS: AIModel[] = [
    {
        id: 'nova-furry-xl',
        name: 'Nova Furry XL',
        description: 'Optimized for furry art and anthropomorphic characters. Auto-tags quality prompts.',
        image: '/models/nova-furry-xl.png',
        type: 'SDXL',
        order: 3,
        isActive: true
    },
    {
        id: 'scyrax-pastel',
        name: 'Scyrax Pastel',
        description: 'Soft, pastel color palettes and dreamy atmospheres.',
        image: '/models/scyrax-pastel.png',
        type: 'SDXL',
        order: 6,
        isActive: true
    },
    {
        id: 'wai-illustrious',
        name: 'Wai Illustrious',
        description: 'High-quality illustrations with enforced quality tags and custom High-Res Fix workflow.',
        image: '/models/wai-illustrious.png',
        type: 'SDXL',
        order: 12,
        isActive: true
    },
    {
        id: 'rin-anime-blend',
        name: 'Rin Anime Blend',
        description: 'A smooth blend of popular anime models for high-quality results.',
        image: '/models/rin-anime-blend.png',
        type: 'SDXL',
        order: 14,
        isActive: true
    },
    {
        id: 'rin-anime-popcute',
        name: 'Rin Anime Popcute',
        description: 'Bright, vibrant, and cute anime style with popping colors.',
        image: '/models/rin-anime-popcute.png',
        type: 'SDXL',
        order: 15,
        isActive: true
    },
    {
        id: 'z-image-turbo-rtx6000',
        name: 'Z-Image Turbo RTX 6000',
        description: 'Ultra-fast anime & general image generation powered by Z-Image-Turbo on RTX 6000.',
        image: '/models/z-image-turbo-rtx6000.png',
        type: 'Image',
        order: 16,
        isActive: true
    },
    {
        id: 'z-image-base-rtx6000',
        name: 'Z-Image Base RTX 6000',
        description: 'High-quality image generation powered by Z-Image Base on RTX 6000.',
        image: '/models/z-image-base-rtx6000.png',
        type: 'Image',
        order: 17,
        isActive: true
    },
    {
        id: 'anima',
        name: 'Anima',
        description: 'Anime illustration model powered by circlestone-labs/Anima Base v1.0.',
        image: '/models/anima.png',
        type: 'Image',
        order: 18,
        isActive: true
    },
    {
        id: 'hassaku',
        name: 'Hassaku',
        description: 'Hassaku illustration style with clean lines and classical anime rendering.',
        image: '/models/hassaku.png',
        type: 'Image',
        order: 19,
        isActive: true
    },
    {
        id: 'kiwimix',
        name: 'Kiwimix',
        description: 'Vibrant anime illustration blend with bright colors and cheerful aesthetics.',
        image: '/models/kiwimix.png',
        type: 'Image',
        order: 20,
        isActive: true
    },
    {
        id: 'crystal-cuteness',
        name: 'Crystal Cuteness',
        description: 'Adorable and sparkling aesthetics for high-quality cute art.',
        image: '/models/crystal-cuteness.png',
        type: 'SDXL',
        order: 21,
        isActive: true
    },
    {
        id: 'veretoon-v10',
        name: 'Veretoon V1.0',
        description: 'Vibrant toon-style illustrations with clean outlines.',
        image: '/models/veretoon-v10.png',
        type: 'SDXL',
        order: 22,
        isActive: true
    },
    {
        id: 'nova-3d-cg-xl',
        name: 'Nova 3D CG XL',
        description: 'Premium SDXL model optimized for high-quality 3D and CGI art with extreme detail.',
        image: '/models/nova-3d-cg-xl.png',
        type: 'Generator',
        order: 23,
        isActive: true
    },
    {
        id: 'flux-2-dev',
        name: 'Flux 2 Dev',
        description: 'Highly realistic and detailed images with state-of-the-art prompt adherence and multi-reference support.',
        image: '/models/flux-2-dev.png',
        type: 'Generator',
        order: 24,
        isActive: true
    },
    {
        id: 'flux-2-klein-9b',
        name: 'Flux 2 Klein 9B',
        description: 'Ultra-fast distilled image model unifies image generation and editing in a single model with state-of-the-art speed.',
        image: '/models/flux-2-klein-9b.png',
        type: 'Image',
        order: 25,
        isActive: true
    }
];

const GENERATION_MODEL_TYPES = new Set(['sdxl', 'generator', 'image']);
const MODEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CLOUD_HISTORY_CACHE_TTL_MS = 2 * 60 * 1000;

type ActiveGeneration = {
    requestId: string;
    prompt: string;
    aspectRatio?: string;
};

const isClientGenerationModel = (model: AIModel) => {
    const type = typeof model.type === 'string' ? model.type.toLowerCase() : 'sdxl';
    return model.isActive !== false && GENERATION_MODEL_TYPES.has(type);
};

const getApiCallable = async () => {
    throw new Error('Cloud functions are deprecated; using local MLX engine');
};

const loadFirebaseRuntime = async () => {
    return null;
};

type FirebaseRuntime = Awaited<ReturnType<typeof loadFirebaseRuntime>>;

const loadGenerationSession = () => import('../lib/generationSession');
const loadGenerationRecovery = () => import('../lib/generationRecovery');

interface LiteContextType {
    currentUser: User | null;
    availableModels: AIModel[];
    modelsError: string | null;
    selectedModel: AIModel | null;
    setSelectedModel: (model: AIModel) => void;
    history: any[];
    localHistory: any[];
    displayHistory: any[];
    loading: boolean;
    generating: boolean;
    generationStage: GenerationStage;
    generationProgress: number;
    generationPreviewUrl: string | null;
    activeGeneration: ActiveGeneration | null;
    pendingGeneration: PendingGeneration | null;
    generateStartTime: number | undefined;
    generate: (prompt: string, params?: any) => Promise<boolean>;
    /** Clear a stuck pending session (job lost / user wants to start fresh) */
    dismissStuckPending: () => void;
    login: (email: string, pass: string) => Promise<void>;
    signup: (email: string, pass: string, birthday: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    isOffline: boolean;
    userTier: 'free' | 'pro' | 'architect';
    zaps: number | 'unlimited';
    addToast: (message: string, type?: 'success' | 'error' | 'loading', id?: string) => string;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    loadMoreHistory: () => void;
}

const LiteContext = createContext<LiteContextType | undefined>(undefined);

export const useLite = () => {
    const context = useContext(LiteContext);
    if (!context) throw new Error('useLite must be used within LiteProvider');
    return context;
};

export function LiteProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [availableModels, setAvailableModels] = useState<AIModel[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('lite_cached_models');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    return Array.isArray(parsed) && parsed.length > 0 ? parsed : BUILTIN_MODELS;
                } catch { return BUILTIN_MODELS; }
            }
        }
        return BUILTIN_MODELS;
    });
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [localHistory, setLocalHistory] = useState<any[]>([]);
    const [historyLimit, setHistoryLimit] = useState(50);
    const historyLimitRef = useRef(50);
    const localHistoryCacheRef = useRef<GenerationHistoryEntry[] | null>(null);

    const loadLocal = useCallback(async () => {
        try {
            if (localHistoryCacheRef.current) {
                setLocalHistory(localHistoryCacheRef.current.slice(0, historyLimitRef.current));
                return;
            }
            const gens = await loadLocalGenerations(500, currentUser?.uid);
            localHistoryCacheRef.current = gens;
            setLocalHistory(gens.slice(0, historyLimitRef.current));
        } catch (err) {
            console.warn('[Lite] Local history unavailable:', err);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        historyLimitRef.current = historyLimit;
    }, [historyLimit]);

    useEffect(() => {
        if (localHistoryCacheRef.current) {
            setLocalHistory(localHistoryCacheRef.current.slice(0, historyLimit));
        } else {
            loadLocal();
        }
    }, [historyLimit, loadLocal]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationPreviewUrl, setGenerationPreviewUrl] = useState<string | null>(null);
    const [activeGeneration, setActiveGeneration] = useState<ActiveGeneration | null>(null);
    const generationSessionRef = useRef<(() => void) | null>(null);
    const generatingRef = useRef(false);
    const prevUidRef = useRef<string | undefined>(undefined);
    const displayHistoryRef = useRef<any[]>([]);
    const completionClaimRef = useRef<string | null>(null);
    const resumeSessionIdRef = useRef<string | null>(null);
    const recoveringPendingRef = useRef(false);
    const lastVisibilityProbeAtRef = useRef(0);
    const VISIBILITY_PROBE_COOLDOWN_MS = 5000;
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [cooldownUntil, setCooldownUntil] = useState<number>(0);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);
    const [generateStartTime, setGenerateStartTime] = useState<number | undefined>(undefined);
    const [userTier, setUserTier] = useState<'free' | 'pro' | 'architect'>('free');
    const [zaps, setZaps] = useState<number | 'unlimited'>(10);
    const [pendingRevision, setPendingRevision] = useState(0);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sidebar_collapsed') === 'true';
        }
        return false;
    });
    const [firebase, setFirebase] = useState<FirebaseRuntime | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            void loadFirebaseRuntime().then((runtime) => {
                if (!cancelled) setFirebase(runtime);
            });
        };

        const requestIdle = window.requestIdleCallback;
        const cancelIdle = window.cancelIdleCallback;

        if (typeof requestIdle === 'function' && typeof cancelIdle === 'function') {
            const idleId = requestIdle(load, { timeout: 1800 });
            return () => {
                cancelled = true;
                cancelIdle(idleId);
            };
        }

        const timer = globalThis.setTimeout(load, 900);
        return () => {
            cancelled = true;
            globalThis.clearTimeout(timer);
        };
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    }, []);

    const bumpPendingRevision = useCallback(() => {
        setPendingRevision((v) => v + 1);
    }, []);

    const clearPending = useCallback(() => {
        clearPendingGeneration();
        bumpPendingRevision();
    }, [bumpPendingRevision]);

    const savePending = useCallback((pending: PendingGeneration) => {
        savePendingGeneration(pending);
        bumpPendingRevision();
    }, [bumpPendingRevision]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'loading' = 'success', existingId?: string) => {
        if (type === 'loading') return toast.loading(message, { id: existingId });
        if (type === 'error') return toast.error(message, { id: existingId });
        return toast.success(message, { id: existingId });
    }, []);

    useEffect(() => {
        if (!firebase) return;
        if (!navigator.onLine) {
            setIsOffline(true);
            firebase.disableNetwork(firebase.db);
        }
    }, [firebase]);

    useEffect(() => {
        if (!firebase) return;
        let userUnsub: (() => void) | null = null;

        const authUnsub = firebase.onAuthStateChanged(firebase.auth, (user) => {
            userUnsub?.();
            userUnsub = null;
            setCurrentUser(user);

            if (!user) {
                setLoading(false);
                setUserTier('free');
                setZaps(10);
                return;
            }

            // Instantly restore user profile from cache to bypass boot loader
            const cachedProfileKey = `lite_user_profile_${user.uid}`;
            const cached = localStorage.getItem(cachedProfileKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setUserTier(parsed.tier || 'free');
                    setZaps(parsed.zaps ?? (parsed.tier === 'pro' || parsed.tier === 'architect' ? 'unlimited' : 10));
                    setLoading(false);
                } catch (e) {
                    console.warn('[Lite] Parse cached user profile failed:', e);
                }
            }

            userUnsub = firebase.onSnapshot(firebase.doc(firebase.db, 'users', user.uid), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const tier = data.tier || 'free';
                    const calculatedZaps = data.zaps ?? (tier === 'pro' || tier === 'architect' ? 'unlimited' : 10);
                    
                    setUserTier(tier);
                    if (!generatingRef.current) {
                        setZaps(calculatedZaps);
                    }
                    
                    // Save to cache
                    idleSaveToLocalStorage(cachedProfileKey, JSON.stringify({ tier, zaps: calculatedZaps }));
                }
                setLoading(false);
            }, (err) => {
                console.warn('[Lite] User data fetch failed:', err);
                setLoading(false);
            });
        });

        return () => {
            authUnsub();
            userUnsub?.();
        };
    }, [firebase]);

    useEffect(() => {
        loadLocal();
    }, [currentUser?.uid, loadLocal]);

    useEffect(() => {
        if (!currentUser?.uid) return;
        const key = localHistoryStorageKey(currentUser.uid);
        const onStorage = (e: StorageEvent) => {
            if (e.key === key) {
                localHistoryCacheRef.current = null;
                loadLocal();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [currentUser?.uid, loadLocal]);

    const selectModel = useCallback((model: AIModel) => {
        localStorage.setItem('lite_selected_model', model.id);
        setSelectedModel(model);
    }, []);

    useEffect(() => {
        if (selectedModel || availableModels.length === 0) return;

        const savedId = localStorage.getItem('lite_selected_model');
        const savedModel = availableModels.find((model) => model.id === savedId);
        setSelectedModel(savedModel ?? availableModels[0]);
    }, [availableModels, selectedModel]);

    const resetGenerationUi = useCallback(() => {
        setGenerating(false);
        setGenerationStage('idle');
        setGenerationProgress(0);
        setGenerationPreviewUrl(null);
        setActiveGeneration(null);
        setGenerateStartTime(undefined);
    }, []);

    const dismissStuckPending = useCallback(() => {
        const pending = loadPendingGeneration(currentUser?.uid);
        if (pending?.requestId) toast.dismiss(pending.requestId);
        generationSessionRef.current?.();
        generationSessionRef.current = null;
        generatingRef.current = false;
        completionClaimRef.current = null;
        resumeSessionIdRef.current = null;
        clearPending();
        resetGenerationUi();
        toast.success('Cleared. You can start a new picture.');
    }, [clearPending, resetGenerationUi, currentUser?.uid]);

    useEffect(() => {
        const uid = currentUser?.uid;
        if (prevUidRef.current !== uid) {
            generationSessionRef.current?.();
            generatingRef.current = false;
            clearPending();
            resetGenerationUi();
            setLocalHistory([]);
            localHistoryCacheRef.current = null;
            completionClaimRef.current = null;
            resumeSessionIdRef.current = null;
        }
        prevUidRef.current = uid;
    }, [currentUser?.uid, resetGenerationUi, clearPending]);

    const displayHistory = useMemo(
        () => filterDisplayableHistory(
            mergeGenerationHistory(
                scopeLocalHistoryForUser(localHistory, currentUser?.uid),
                history
            )
        ),
        [localHistory, history, currentUser?.uid]
    );

    displayHistoryRef.current = displayHistory;

    const pendingGeneration = useMemo(
        () => loadPendingGeneration(currentUser?.uid) ?? null,
        [currentUser?.uid, pendingRevision]
    );

    const commitPendingToLocalState = useCallback(
        (entry: GenerationHistoryEntry, requestId: string, showSuccessToast = true) => {
            clearPending();
            if (resumeSessionIdRef.current === requestId) {
                resumeSessionIdRef.current = null;
            }
            if (localHistoryCacheRef.current) {
                localHistoryCacheRef.current = [
                    entry,
                    ...localHistoryCacheRef.current.filter((i) => i.id !== requestId)
                ].slice(0, 500);
            }
            setLocalHistory((prev) => [entry, ...prev.filter((i) => i.id !== requestId)]);
            if (showSuccessToast) {
                toast.success('Your picture is ready!', { id: requestId });
            }
        },
        [clearPending]
    );

    /**
     * Shared recovery: history match, Firestore probe, or failed-job cleanup.
     * Does not attach new listeners — safe alongside keepListener sessions (claim dedupes).
     */
    const recoverPendingIfReady = useCallback(
        async (uid: string): Promise<boolean> => {
            if (!firebase) return false;
            if (generatingRef.current) return false;
            if (recoveringPendingRef.current) return false;

            recoveringPendingRef.current = true;
            try {
                const { recoverPendingGeneration } = await loadGenerationRecovery();
                const result = await recoverPendingGeneration({
                    db: firebase.db,
                    uid,
                    claimRef: completionClaimRef,
                    history: displayHistoryRef.current,
                    matchesRequest: matchesPendingRequest,
                });

                if (result.status === 'complete') {
                    commitPendingToLocalState(result.entry, result.pending.requestId);
                    return true;
                }
                if (result.status === 'failed') {
                    clearPending();
                    if (resumeSessionIdRef.current === result.pending.requestId) {
                        resumeSessionIdRef.current = null;
                    }
                    toast.error(result.message, { id: result.pending.requestId });
                    return true;
                }
                // Another path already claimed completion (listener, generate, or parallel recover)
                if (result.status === 'busy') return true;
                return false;
            } finally {
                recoveringPendingRef.current = false;
            }
        },
        [commitPendingToLocalState, clearPending, firebase]
    );

    useEffect(() => {
        if (!firebase) return;
        const handleOnline = () => {
            setIsOffline(false);
            firebase.enableNetwork(firebase.db);
            toast.success("Network restored");
            loadLocal();
            const uid = firebase.auth.currentUser?.uid;
            if (uid) void recoverPendingIfReady(uid);
        };
        const handleOffline = () => { setIsOffline(true); firebase.disableNetwork(firebase.db); toast.error("Offline Mode Active"); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [loadLocal, recoverPendingIfReady, firebase]);

    useEffect(() => () => { generationSessionRef.current?.(); }, []);

    /** Re-attach to an in-flight job after navigation refresh */
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!firebase || !uid || generatingRef.current) return;

        const pending = loadPendingGeneration(uid);
        if (!pending) return;
        if (resumeSessionIdRef.current === pending.requestId) return;

        resumeSessionIdRef.current = pending.requestId;

        let cancelled = false;
        let settled = false;
        let detach: (() => void) | null = null;

        const teardownResumeSession = (keepPending = false) => {
            generatingRef.current = false;
            if (!keepPending) {
                clearPending();
                if (resumeSessionIdRef.current === pending.requestId) {
                    resumeSessionIdRef.current = null;
                }
            }
        };

        const succeedFromListener = async (imageUrl: string, firestoreImageId?: string) => {
            if (cancelled || settled) return;
            try {
                const entry = await finalizeClaimedPendingJob({
                    claimRef: completionClaimRef,
                    requestId: pending.requestId,
                    prompt: pending.prompt,
                    imageUrl,
                    userId: uid,
                    firestoreImageId,
                    params: pending.aspectRatio ? { aspectRatio: pending.aspectRatio } : undefined,
                });
                if (!entry) {
                    if (!cancelled) {
                        settled = true;
                        detach?.();
                        detach = null;
                        generationSessionRef.current = null;
                        teardownResumeSession();
                        resetGenerationUi();
                    }
                    return;
                }
                if (cancelled) return;
                settled = true;
                detach?.();
                detach = null;
                generationSessionRef.current = null;
                teardownResumeSession();
                resetGenerationUi();
                commitPendingToLocalState(entry, pending.requestId);
            } catch (err) {
                console.warn('[Lite] Could not save resumed picture locally:', err);
                if (!cancelled) {
                    toast.error(
                        'Picture finished, but could not save on this device. Check your account online.',
                        { id: pending.requestId }
                    );
                }
            }
        };

        (async () => {
            const recovered = await recoverPendingIfReady(uid);
            if (cancelled) return;
            if (recovered) {
                if (resumeSessionIdRef.current === pending.requestId) {
                    resumeSessionIdRef.current = null;
                }
                return;
            }

            // Drop a timed-out generate listener without clearing pending
            generationSessionRef.current?.();
            generationSessionRef.current = null;

            generatingRef.current = true;
            setGenerating(true);
            setGenerationStage('processing');
            setGenerationProgress(40);
            setActiveGeneration({
                requestId: pending.requestId,
                prompt: pending.prompt,
                aspectRatio: pending.aspectRatio,
            });
            setGenerateStartTime(pending.startedAt);
            toast.loading('Checking on your picture…', { id: pending.requestId });

            const { attachGenerationSession } = await loadGenerationSession();
            detach = attachGenerationSession(firebase.db, {
                requestId: pending.requestId,
                startedAt: pending.startedAt,
                initialProgressFloor: 40,
                expectedUserId: uid,
                onProgress: (patch) => {
                    setGenerationStage(patch.stage);
                    setGenerationProgress(patch.progress);
                    toast.loading(patch.message, { id: pending.requestId });
                    if (patch.previewUrl) setGenerationPreviewUrl(patch.previewUrl);
                },
                onSuccess: ({ imageUrl, firestoreImageId }) => {
                    succeedFromListener(imageUrl, firestoreImageId);
                },
                onFailed: (message) => {
                    if (settled) return;
                    settled = true;
                    detach?.();
                    detach = null;
                    generationSessionRef.current = null;
                    teardownResumeSession();
                    resetGenerationUi();
                    toast.error(message, { id: pending.requestId });
                },
                onHardTimeout: () => {
                    if (settled) return;
                    teardownResumeSession(true);
                    generationSessionRef.current = () => {
                        settled = true;
                        detach?.();
                        teardownResumeSession();
                    };
                    resetGenerationUi();
                    toast.error('This took too long. Check your profile — it may still finish.', { id: pending.requestId });
                },
                onConnectionError: () => {
                    if (settled) return;
                    toast.loading('Reconnecting…', { id: pending.requestId });
                },
            });

            generationSessionRef.current = () => {
                settled = true;
                detach?.();
                teardownResumeSession();
            };
        })();

        return () => {
            cancelled = true;
            detach?.();
            detach = null;
            // Clear stale handle without invoking (would clear pending via teardownResumeSession)
            generationSessionRef.current = null;
            generatingRef.current = false;
            if (resumeSessionIdRef.current === pending.requestId) {
                resumeSessionIdRef.current = null;
            }
        };
    }, [currentUser?.uid, resetGenerationUi, clearPending, commitPendingToLocalState, recoverPendingIfReady, firebase]);

    /** Finish when merged history gets an image for a pending job (avoids probe on every snapshot) */
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!firebase || !uid || generatingRef.current) return;

        const pending = loadPendingGeneration(uid);
        if (!pending) return;

        const hasMatch = displayHistory.some((item) =>
            matchesPendingRequest(item, pending.requestId) && item.imageUrl
        );
        if (!hasMatch) return;

        void recoverPendingIfReady(uid);
    }, [displayHistory, currentUser?.uid, recoverPendingIfReady, pendingRevision, firebase]);

    /** Re-probe when the user returns to the tab (throttled) */
    useEffect(() => {
        const uid = currentUser?.uid;
        if (!firebase || !uid) return;

        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastVisibilityProbeAtRef.current < VISIBILITY_PROBE_COOLDOWN_MS) return;
            lastVisibilityProbeAtRef.current = now;
            void recoverPendingIfReady(uid);
        };

        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [currentUser?.uid, recoverPendingIfReady, firebase]);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'lite_selected_model' && e.newValue && availableModels.length > 0) {
                const model = availableModels.find(m => m.id === e.newValue);
                if (model) setSelectedModel(model);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [availableModels]);

    useEffect(() => {
        if (!firebase) return;
        setModelsError(null);
        let cancelled = false;

        const pickDefaultModel = (models: AIModel[]) => {
            if (models.length === 0) return;
            const savedId = localStorage.getItem('lite_selected_model');
            const savedModel = models.find(m => m.id === savedId);

            setSelectedModel((current) => {
                const isValid = (m: AIModel | null) => m && models.some((x) => x.id === m.id);
                const activeCurrent = isValid(current) ? current : null;
                if (savedModel) {
                    return activeCurrent ?? savedModel;
                }
                return activeCurrent ?? models[0];
            });
        };

        const cachedAt = Number(localStorage.getItem('lite_cached_models_fetched_at') || '0');
        const hasStaleModel = availableModels.some(m => m.id === 'lens') || availableModels.some(m => m.id === 'ideogram-4-nf4');
        if (cachedAt && Date.now() - cachedAt < MODEL_CACHE_TTL_MS && availableModels.length > 0 && !hasStaleModel) {
            pickDefaultModel(availableModels);
            return () => {
                cancelled = true;
            };
        }

        // One-shot fetch instead of persistent listener — models change rarely
        const fetchModels = async () => {
            const orderedQuery = firebase.query(firebase.collection(firebase.db, 'models'), firebase.orderBy('order', 'asc'), firebase.limit(30));
            const fallbackQuery = firebase.query(firebase.collection(firebase.db, 'models'), firebase.limit(30));

            try {
                const snap = await firebase.getDocs(orderedQuery);
                if (cancelled) return;
                const models = snap.docs
                    .map((d: any) => ({ id: d.id, ...d.data() } as AIModel))
                    .filter(isClientGenerationModel);
                if (models.length > 0) {
                    setAvailableModels(models);
                    idleSaveToLocalStorage('lite_cached_models', JSON.stringify(models));
                    idleSaveToLocalStorage('lite_cached_models_fetched_at', String(Date.now()));
                    setModelsError(null);
                    pickDefaultModel(models);
                    return;
                }
            } catch (err) {
                console.warn('[Lite] Ordered models fetch failed, trying fallback:', err);
            }

            // Fallback: unordered query
            try {
                const snap = await firebase.getDocs(fallbackQuery);
                if (cancelled) return;
                const models = snap.docs
                    .map((d: any) => ({ id: d.id, ...d.data() } as AIModel))
                    .filter(isClientGenerationModel);
                setAvailableModels(models.length > 0 ? models : BUILTIN_MODELS);
                idleSaveToLocalStorage('lite_cached_models', JSON.stringify(models.length > 0 ? models : BUILTIN_MODELS));
                idleSaveToLocalStorage('lite_cached_models_fetched_at', String(Date.now()));
                setModelsError(models.length > 0 ? null : 'Failed to load styles.');
                pickDefaultModel(models.length > 0 ? models : BUILTIN_MODELS);
            } catch (err2) {
                if (cancelled) return;
                console.warn('[Lite] Fallback models fetch failed:', err2);
                setAvailableModels(BUILTIN_MODELS);
                setModelsError((err2 as any)?.message ? String((err2 as any).message) : 'Failed to load styles.');
                pickDefaultModel(BUILTIN_MODELS);
            }
        };

        void fetchModels();

        return () => {
            cancelled = true;
        };
    }, [firebase]);

    useEffect(() => {
        const uid = currentUser?.uid;
        if (!firebase) {
            if (!uid) setHistory([]);
            return;
        }
        if (!uid) { setHistory([]); return; }

        // Boost perceived speed: instantly restore history from cache
        const cacheKey = `lite_cached_cloud_history_${uid}`;
        const cacheFetchedAtKey = `${cacheKey}_fetched_at`;
        const cached = localStorage.getItem(cacheKey);
        let restoredFromFreshCache = false;
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setHistory(parsed);
                const cachedAt = Number(localStorage.getItem(cacheFetchedAtKey) || '0');
                restoredFromFreshCache =
                    Array.isArray(parsed) &&
                    parsed.length >= historyLimit &&
                    cachedAt > 0 &&
                    Date.now() - cachedAt < CLOUD_HISTORY_CACHE_TTL_MS;
            } catch (err) {
                console.warn('[Lite] Parse cached history failed:', err);
            }
        }
        if (restoredFromFreshCache) return;

        let cancelled = false;

        const mapDocs = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
            docs.map(d => ({ id: d.id, ...d.data() } as Record<string, unknown> & { id: string }));

        const orderedQuery = firebase.query(
            firebase.collection(firebase.db, 'images'),
            firebase.where('userId', '==', uid),
            firebase.orderBy('createdAt', 'desc'),
            firebase.limit(historyLimit)
        );

        const fallbackQuery = firebase.query(
            firebase.collection(firebase.db, 'images'),
            firebase.where('userId', '==', uid),
            firebase.limit(historyLimit)
        );

        const fetchHistory = async () => {
            try {
                const snap = await firebase.getDocs(orderedQuery);
                if (cancelled) return;
                const items = mapDocs(snap.docs);
                setHistory(items);
                idleSaveToLocalStorage(`lite_cached_cloud_history_${uid}`, JSON.stringify(items));
                idleSaveToLocalStorage(cacheFetchedAtKey, String(Date.now()));
                return;
            } catch (err) {
                console.warn('[Lite] History fetch failed (ordered):', err);
            }

            try {
                const snap = await firebase.getDocs(fallbackQuery);
                if (cancelled) return;
                const items = mapDocs(snap.docs).sort(
                    (a, b) => toHistoryTimestamp(b.createdAt) - toHistoryTimestamp(a.createdAt)
                );
                setHistory(items);
                idleSaveToLocalStorage(`lite_cached_cloud_history_${uid}`, JSON.stringify(items));
                idleSaveToLocalStorage(cacheFetchedAtKey, String(Date.now()));
            } catch (err2) {
                if (cancelled) return;
                console.warn('[Lite] History fetch failed (fallback):', err2);
            }
        };

        void fetchHistory();

        return () => {
            cancelled = true;
        };
    }, [currentUser?.uid, firebase, historyLimit]);

    const upsertUserProfile = async (
        uid: string,
        fields: Record<string, unknown>,
        initializeIfMissing?: Record<string, unknown>
    ) => {
        const runtime = firebase ?? await loadFirebaseRuntime();
        const userRef = runtime.doc(runtime.db, 'users', uid);
        // merge:true handles create-or-update in a single write — no read needed
        const mergedFields = initializeIfMissing
            ? { ...initializeIfMissing, ...fields }
            : fields;
        await runtime.setDoc(userRef, mergedFields, { merge: true });
    };

    // Listen for incoming deep link authentication handovers
    useEffect(() => {
        const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
        const hasNativeLogin = Boolean(window.electronAPI?.lite?.onDeepLink);
        if (!isElectron || !hasNativeLogin) return;

        const processDeepLinkUrl = async (url: string) => {
            console.log("[Lite Auth] Processing deep link:", url);
            try {
                // Parse deep link parameters (format: dreambees://auth?id_token=...)
                const cleanUrl = url.replace('dreambees://', 'http://localhost/');
                const parsedUrl = new URL(cleanUrl);
                const idToken = parsedUrl.searchParams.get('id_token');
                
                if (idToken) {
                    addToast("Web sync session detected. Syncing account...", "loading", "deeplink-auth");
                    const runtime = firebase ?? await loadFirebaseRuntime();
                    const credential = runtime.GoogleAuthProvider.credential(idToken);
                    const res = await runtime.signInWithCredential(runtime.auth, credential);
                    
                    if (res.user) {
                        await upsertUserProfile(
                            res.user.uid,
                            {
                                email: res.user.email,
                                lastLogin: runtime.serverTimestamp(),
                                platform: 'electron',
                            },
                            {
                                email: res.user.email,
                                createdAt: runtime.serverTimestamp(),
                                platform: 'electron',
                                tier: 'free',
                                zaps: 10,
                            }
                        );
                        addToast(`Successfully synced as ${res.user.displayName || res.user.email?.split('@')[0]}!`, "success", "deeplink-auth");
                    }
                }
            } catch (err: any) {
                console.error("[Lite Auth] Deep link login failed:", err);
                addToast(err.message || "Failed to sync credentials from web link.", "error", "deeplink-auth");
            }
        };

        // 1. Listen for dynamic events while app is open
        const unsub = window.electronAPI.lite.onDeepLink((url: string) => {
            void processDeepLinkUrl(url);
        });

        // 2. Query cold-start pending deep links
        window.electronAPI.lite.getPendingLink().then((url: string | null) => {
            if (url) {
                void processDeepLinkUrl(url);
            }
        });

        return () => {
            unsub();
        };
    }, [addToast, firebase]);

    const login = async (email: string, pass: string) => {
        const runtime = firebase ?? await loadFirebaseRuntime();
        await runtime.signInWithEmailAndPassword(runtime.auth, email, pass);
    };
    
    const signup = async (email: string, pass: string, birthday: string) => {
        const runtime = firebase ?? await loadFirebaseRuntime();
        const res = await runtime.createUserWithEmailAndPassword(runtime.auth, email, pass);
        if (res.user) {
            // Explicit initialization call to ensure backend consistency
            try {
                if (runtime?.createUserWithEmailAndPassword) {
                    await runtime.setDoc(runtime.doc(runtime.db, 'users', res.user.uid), {
                        email,
                        birthday,
                        tier: 'free',
                    });
                }
            } catch (err) {
                console.error('[Lite] Local user init:', err);
            }
        }
    };

    const logout = async () => {
        const runtime = firebase ?? await loadFirebaseRuntime();
        generationSessionRef.current?.();
        generatingRef.current = false;
        clearPending();
        resetGenerationUi();
        setHistory([]);
        setLocalHistory([]);
        completionClaimRef.current = null;
        resumeSessionIdRef.current = null;
        await runtime.signOut(runtime.auth);
        toast.success("Safe travels.");
    };

    const loginWithGoogle = async () => {
        try {
            console.log("[Lite Auth] Version 1.1.2. Electron API:", Boolean(window.electronAPI?.lite?.googleLogin));
            const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
            const hasNativeLogin = Boolean(window.electronAPI?.lite?.googleLogin);
            
            if (isElectron && hasNativeLogin) {
                addToast("Establishing secure link...", "loading", "google-auth");
                
                const authData = await window.electronAPI.lite.googleLogin();
                console.log("[Lite Auth] Received data from bridge:", authData ? "YES" : "NO");
                addToast("Identity confirmed. Finalizing...", "loading", "google-auth");
                
                const { idToken, accessToken } = authData;

                if (!idToken) throw new Error("The identity portal returned an incomplete response. Please try again.");

                console.log("[Lite Auth] Creating Firebase credential...");
                const runtime = firebase ?? await loadFirebaseRuntime();
                const credential = runtime.GoogleAuthProvider.credential(idToken, accessToken || undefined);
                const res = await runtime.signInWithCredential(runtime.auth, credential);

                if (res.user) {
                    await upsertUserProfile(
                        res.user.uid,
                        {
                            email: res.user.email,
                            lastLogin: runtime.serverTimestamp(),
                            platform: 'electron',
                        },
                        {
                            email: res.user.email,
                            createdAt: runtime.serverTimestamp(),
                            platform: 'electron',
                            tier: 'free',
                            zaps: 10,
                        }
                    );
                    addToast(`Welcome back, ${res.user.displayName?.split(' ')[0]}`, "success", "google-auth");
                }
            } else {
                const runtime = firebase ?? await loadFirebaseRuntime();
                const provider = new runtime.GoogleAuthProvider();
                const res = await runtime.signInWithPopup(runtime.auth, provider);
                if (res.user) {
                    await upsertUserProfile(
                        res.user.uid,
                        {
                            email: res.user.email,
                            lastLogin: runtime.serverTimestamp(),
                        },
                        {
                            email: res.user.email,
                            createdAt: runtime.serverTimestamp(),
                            tier: 'free',
                            zaps: 10,
                        }
                    );
                    toast.success(`Welcome back, ${res.user.displayName?.split(' ')[0]}`);
                }
            }
        } catch (err: any) {
            console.error('[Lite Auth Error]', err);
            toast.error(err.message || "The vision was interrupted.");
        }
    };

    const calculateEstimatedCost = (modelId: string, tier: string) => {
        if (modelId === 'anima') return 0;
        const isPremiumUser = tier === 'pro' || tier === 'architect';
        
        // 1. PREMIUM: wai-illustrious, nova-3d-cg-xl, z-image-turbo-rtx6000, z-image-base-rtx6000 (always costs 1.0 zaps for all tiers)
        if (['wai-illustrious', 'nova-3d-cg-xl', 'z-image-turbo-rtx6000', 'z-image-base-rtx6000'].includes(modelId)) {
            return 1.0;
        }
        
        // For FAST and STANDARD tiers: free/unlimited (0) for subscribers (isPremiumUser), standard cost for free users
        if (isPremiumUser) {
            return 0;
        }
        
        // 4. STANDARD: others (costs 0.25 zaps)
        return 0.25;
    };

    const generate = useCallback(async (prompt: string, params: any = {}): Promise<boolean> => {
        const cleanPrompt = sanitizeInput(prompt);
        if (!cleanPrompt) return Promise.resolve(false);
        if (generatingRef.current) return Promise.resolve(false);
        if (isOffline) { toast.error("The garden requires a connection to bloom."); return Promise.resolve(false); }

        const runtime = firebase ?? await loadFirebaseRuntime();
        const uid = runtime.auth.currentUser?.uid;
        if (!uid || !selectedModel) { toast.error("Identity unknown. Please sign in."); return Promise.resolve(false); }
        const { attachGenerationSession } = await loadGenerationSession();

        const existingPending = loadPendingGeneration(uid);
        if (existingPending) {
            toast.error(
                'You still have a picture in progress. Check your profile — it may finish soon.',
                { id: existingPending.requestId }
            );
            return Promise.resolve(false);
        }
        
        if (zaps !== 'unlimited' && zaps <= 0) {
            toast.error("You have exhausted your Zaps. Upgrade to continue creating.", { id: 'no-zaps' });
            return Promise.resolve(false);
        }

        if (Date.now() < cooldownUntil) {
            const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
            toast.error(`Service is cooling down. Please wait ${remaining}s...`, { id: 'cooldown' });
            return Promise.resolve(false);
        }

        return new Promise<boolean>(async (resolve) => {
        let promiseResolved = false;
        const safeResolve = (value: boolean) => {
            if (promiseResolved) return;
            promiseResolved = true;
            resolve(value);
        };

        generatingRef.current = true;
        const requestAspectRatio = normalizeAspectRatio(params?.aspectRatio);
        const requestParams = { ...params, aspectRatio: requestAspectRatio };
        const estimatedCost = calculateEstimatedCost(selectedModel.id, userTier);
        const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const startedAt = Date.now();

        generationSessionRef.current?.();
        completionClaimRef.current = null;

        setGenerating(true);
        setGenerationStage('submitting');
        setGenerationProgress(10);
        setGenerationPreviewUrl(null);
        setActiveGeneration({ requestId, prompt: cleanPrompt, aspectRatio: requestAspectRatio });
        setGenerateStartTime(startedAt);
        savePending({
            requestId,
            prompt: cleanPrompt,
            startedAt,
            userId: uid,
        });
        toast.loading(messageForStage('submitting'), { id: requestId });

        if (typeof zaps === 'number' && estimatedCost > 0) {
            setZaps(prev => typeof prev === 'number' ? Math.max(0, prev - estimatedCost) : prev);
        }

        if (window.electronAPI?.mlx) {
            try {
                await window.electronAPI.mlx.generateImage({
                    prompt: cleanPrompt,
                    modelId: selectedModel?.id || 'flux2-klein-4b',
                    width: 1024,
                    height: 1024,
                    steps: 4,
                    guidanceScale: 3.5,
                });
                generatingRef.current = false;
                resetGenerationUi();
                toast.success('Artwork created on local Apple GPU!', { id: requestId });
                return true;
            } catch (err) {
                generatingRef.current = false;
                resetGenerationUi();
                toast.error('Generation failed on local GPU', { id: requestId });
                return false;
            }
        }
        generatingRef.current = false;
        resetGenerationUi();
        return false;
        });
    }, [currentUser?.uid, selectedModel, isOffline, loadLocal, cooldownUntil, userTier, zaps, resetGenerationUi, clearPending, savePending, commitPendingToLocalState]);

    const loadMoreHistory = useCallback(() => {
        setHistoryLimit((prev) => Math.min(1000, prev + 50));
    }, []);

    return (
        <LiteContext.Provider value={{ 
            currentUser, availableModels, selectedModel, setSelectedModel: selectModel, 
            history, localHistory, displayHistory, loading, generating, generationStage, generationProgress,
            generationPreviewUrl, activeGeneration, pendingGeneration,
            generateStartTime, generate, dismissStuckPending,
            login, signup, logout, loginWithGoogle, isOffline, userTier, zaps,
            addToast,
            modelsError,
            sidebarCollapsed,
            toggleSidebar,
            loadMoreHistory
        }}>
            {children}
        </LiteContext.Provider>
    );
}
