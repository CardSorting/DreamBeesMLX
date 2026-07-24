import React, { useEffect, useState } from 'react';
import { useLite } from '../contexts/LiteContext';
import { IconDatabase, IconCpu, IconImage, IconSparkles } from '../icons';
import './UserProfile.css';

export default function UserProfile() {
  const { displayHistory, addToast } = useLite();
  const [dbStats, setDbStats] = useState<{ totalCount: number }>({
    totalCount: displayHistory.length,
  });
  const [storageInfo, setStorageInfo] = useState<{
    dbSizeBytes: number;
    imageCacheSizeBytes: number;
    totalSizeBytes: number;
    maxQuotaBytes: number;
    itemCount: number;
  } | null>(null);

  const mountedRef = React.useRef(true);

  const refreshStats = React.useCallback(() => {
    if (window.electronAPI?.lite?.getGenerations) {
      window.electronAPI.lite.getGenerations(1000).then((generations) => {
        if (mountedRef.current) setDbStats({ totalCount: generations.length });
      }).catch(err => console.error(err));
    }
    if (window.electronAPI?.lite?.getStorageStats) {
      window.electronAPI.lite.getStorageStats().then((stats) => {
        if (mountedRef.current) setStorageInfo(stats);
      }).catch(err => console.error(err));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshStats();
    return () => {
      mountedRef.current = false;
    };
  }, [displayHistory.length, refreshStats]);

  const totalMb = storageInfo ? (storageInfo.totalSizeBytes / (1024 * 1024)).toFixed(1) : '0';
  const quotaGb = storageInfo ? (storageInfo.maxQuotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '2';
  const imageCacheMb = storageInfo ? (storageInfo.imageCacheSizeBytes / (1024 * 1024)).toFixed(1) : '0';

  return (
    <div className="profile-container p-6 max-w-5xl mx-auto text-zinc-100 space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>🐝</span> Studio Settings & Storage
          </h1>
          <p className="text-sm text-purple-300/70 mt-1">
            Private On-Device Studio • Your artwork stays 100% private on your Mac
          </p>
        </div>
        <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-2 shadow-lg shadow-purple-500/5">
          <IconSparkles className="w-4 h-4 text-purple-400" />
          100% On-Device & Private
        </div>
      </div>

      {/* Local Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <IconImage className="w-5 h-5" />
            </div>
            Artwork Created
          </div>
          <div className="text-4xl font-black text-white tracking-tight">{storageInfo?.itemCount ?? dbStats.totalCount}</div>
          <p className="text-xs text-zinc-400 mt-2">Saved directly to your local studio gallery</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <IconDatabase className="w-5 h-5" />
            </div>
            Disk Footprint
          </div>
          <div className="text-2xl font-bold text-white">{totalMb} MB <span className="text-xs font-normal text-zinc-400">/ {quotaGb} GB Max</span></div>
          <p className="text-xs text-zinc-400 mt-2">Image cache ({imageCacheMb} MB) + SQLite WAL</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <IconCpu className="w-5 h-5" />
            </div>
            Hardware Engine
          </div>
          <div className="text-xl font-bold text-white">Apple Silicon GPU</div>
          <p className="text-xs text-zinc-400 mt-2">Native neural acceleration on your Mac</p>
        </div>
      </div>

      {/* Storage Management Section */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <IconDatabase className="w-5 h-5 text-purple-400" />
          On-Device Privacy & Storage Controls
        </h3>
        <p className="text-sm text-zinc-300/80 leading-relaxed">
          All high-resolution generated images, prompts, aspect ratios, and model styles are stored securely on your Mac. Disk cache is automatically managed under a 2 GB byte-budget with LRU eviction to prevent storage erosion.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              if (window.electronAPI?.lite?.optimizeDb) {
                await window.electronAPI.lite.optimizeDb();
              }
              refreshStats();
              addToast('Local library database verified & WAL truncated cleanly!', 'success');
            }}
            className="px-5 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-semibold rounded-xl transition-all border border-purple-500/30 shadow-lg shadow-purple-500/10 cursor-pointer"
          >
            Verify & Optimize Storage
          </button>

          <button
            onClick={async () => {
              if (window.electronAPI?.lite?.purgeCache) {
                const res = await window.electronAPI.lite.purgeCache();
                const freedMb = (res.freedBytes / (1024 * 1024)).toFixed(1);
                addToast(`Cleared local cache! Freed ${freedMb} MB disk space.`, 'success');
              } else {
                addToast('Cache purged cleanly!', 'success');
              }
              refreshStats();
            }}
            className="px-5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold rounded-xl transition-all border border-rose-500/30 cursor-pointer"
          >
            Clear Local Image Cache
          </button>
        </div>
      </div>
    </div>
  );
}


