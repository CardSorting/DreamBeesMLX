export interface MLXModelInfo {
  id: string;
  name: string;
  huggingFaceRepo: string;
  quantization: string;
  diskSizeBytes: number;
  minRamGb: number;
  description: string;
  recommended: boolean;
  status: 'remote' | 'downloading' | 'ready' | 'error';
  downloadProgressPct: number;
}

export interface ElectronAPI {
  lite: {
    health: () => Promise<{ ok: boolean; appVersion: string; dbAvailable: boolean; dbError: string | null; packaged: boolean }>;
    saveGeneration: (data: any) => Promise<any>;
    getGenerations: (limit: number) => Promise<any[]>;
    setSetting: (key: string, val: any) => Promise<void>;
    getSetting: (key: string) => Promise<any>;
    optimizeDb?: () => Promise<{ ok: boolean }>;
    getStorageStats?: () => Promise<{ dbSizeBytes: number; imageCacheSizeBytes: number; totalSizeBytes: number; maxQuotaBytes: number; itemCount: number }>;
    purgeCache?: () => Promise<{ freedBytes: number }>;
    googleLogin?: () => Promise<{ idToken: string; accessToken?: string }>;
    getPendingLink?: () => Promise<string | null>;
    onDeepLink?: (callback: (url: string) => void) => () => void;
  };
  mlx: {
    getHardwareStats: () => Promise<{ platform: string; arch: string; totalMemoryMb: number; metalAvailable: boolean }>;
    listModels: () => Promise<MLXModelInfo[]>;
    downloadModel: (modelId: string) => Promise<boolean>;
    generateImage: (params: {
      prompt: string;
      modelId: string;
      width: number;
      height: number;
      steps: number;
      guidanceScale: number;
      seed?: number;
    }) => Promise<any>;
    onProgress: (callback: (data: any) => void) => () => void;
    onComplete: (callback: (data: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
