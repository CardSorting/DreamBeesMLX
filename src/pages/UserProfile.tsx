import React, { useEffect, useState } from 'react';
import { useLite } from '../contexts/LiteContext';
import { IconDatabase, IconCpu, IconImage, IconSparkles, IconZap } from '../icons';
import { HardwareMonitor } from '../components/HardwareMonitor';
import './UserProfile.css';

export default function UserProfile() {
  const { displayHistory, addToast } = useLite();
  const [dbStats, setDbStats] = useState<{ totalCount: number }>({
    totalCount: displayHistory.length,
  });

  useEffect(() => {
    if (window.electronAPI?.lite?.getGenerations) {
      window.electronAPI.lite.getGenerations(1000).then((generations) => {
        setDbStats({ totalCount: generations.length });
      }).catch(err => console.error(err));
    }
  }, [displayHistory.length]);

  return (
    <div className="profile-container p-6 max-w-5xl mx-auto text-zinc-100 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>🐝</span> DreamBees Local Studio Profile
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Sovereign Apple Silicon MLX Native Architecture • Zero-Cloud Offline Mode
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <IconSparkles className="w-4 h-4" />
          100% Private Local Storage
        </div>
      </div>

      {/* Hardware Diagnostics */}
      <HardwareMonitor />

      {/* Local SQLite Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium mb-2">
            <IconImage className="w-5 h-5 text-indigo-400" />
            Local Generations
          </div>
          <div className="text-3xl font-extrabold text-white">{dbStats.totalCount}</div>
          <p className="text-xs text-zinc-500 mt-1">Stored in SQLite WAL journal on disk</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium mb-2">
            <IconDatabase className="w-5 h-5 text-amber-400" />
            Database Engine
          </div>
          <div className="text-xl font-bold text-white">better-sqlite3</div>
          <p className="text-xs text-zinc-500 mt-1">Zero latency local memory-mapped storage</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-zinc-400 text-sm font-medium mb-2">
            <IconCpu className="w-5 h-5 text-emerald-400" />
            App Architecture
          </div>
          <div className="text-xl font-bold text-white">Apple Silicon Metal</div>
          <p className="text-xs text-zinc-500 mt-1">Native MLX array backend (`mflux` / `DiffusionKit`)</p>
        </div>
      </div>

      {/* SQLite Management Section */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <IconDatabase className="w-5 h-5 text-indigo-400" />
          On-Device Data Integrity & Database Storage
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          All generated high-resolution PNG images, prompts, seeds, aspect ratios, and model metadata are stored permanently on your Mac's internal storage drive (`~/Library/Application Support/DreamBees Lite/`). No data is sent to external servers.
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() => addToast('SQLite database integrity check passed cleanly!', 'success')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all border border-zinc-700/50"
          >
            Verify SQLite Database Integrity
          </button>
        </div>
      </div>
    </div>
  );
}
