import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  lite: {
    health: () => ipcRenderer.invoke('lite:health'),
    saveGeneration: (data: any) => ipcRenderer.invoke('lite:saveGeneration', data),
    getGenerations: (limit: number) => ipcRenderer.invoke('lite:getGenerations', limit),
    setSetting: (key: string, val: any) => ipcRenderer.invoke('lite:setSetting', key, val),
    getSetting: (key: string) => ipcRenderer.invoke('lite:getSetting', key),
    optimizeDb: () => ipcRenderer.invoke('lite:optimizeDb'),
    getStorageStats: () => ipcRenderer.invoke('lite:getStorageStats'),
    purgeCache: () => ipcRenderer.invoke('lite:purgeCache'),
    googleLogin: () => ipcRenderer.invoke('auth:google-login'),
    getPendingLink: () => ipcRenderer.invoke('auth:get-pending-link'),
    onDeepLink: (callback: (url: string) => void) => {
      const subscription = (_event: any, url: string) => callback(url);
      ipcRenderer.on('auth:deep-link', subscription);
      return () => {
        ipcRenderer.removeListener('auth:deep-link', subscription);
      };
    }
  },
  mlx: {
    getHardwareStats: () => ipcRenderer.invoke('mlx:getHardwareStats'),
    listModels: () => ipcRenderer.invoke('mlx:listModels'),
    downloadModel: (modelId: string) => ipcRenderer.invoke('mlx:downloadModel', modelId),
    generateImage: (params: any) => ipcRenderer.invoke('mlx:generateImage', params),
    onProgress: (callback: (data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('mlx:progress', subscription);
      return () => {
        ipcRenderer.removeListener('mlx:progress', subscription);
      };
    },
    onComplete: (callback: (data: any) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('mlx:complete', subscription);
      return () => {
        ipcRenderer.removeListener('mlx:complete', subscription);
      };
    }
  }
});
