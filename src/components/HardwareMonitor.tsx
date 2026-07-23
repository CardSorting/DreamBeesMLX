import React, { useEffect, useState } from 'react';
import { Cpu, Zap, ShieldCheck } from 'lucide-react';

export const HardwareMonitor: React.FC = () => {
  const [stats, setStats] = useState<{
    platform: string;
    arch: string;
    totalMemoryMb: number;
    metalAvailable: boolean;
  } | null>(null);

  useEffect(() => {
    if (window.electronAPI?.mlx) {
      window.electronAPI.mlx.getHardwareStats().then(setStats);
    }
  }, []);

  if (!stats) return null;

  return (
    <div
      style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#a855f722', padding: '10px', borderRadius: '10px' }}>
          <Cpu size={24} color="#c084fc" />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Apple Silicon Metal Acceleration</h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#a1a1aa' }}>
            {stats.arch.toUpperCase()} • Unified Memory: {(stats.totalMemoryMb / 1024).toFixed(1)} GB RAM
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: stats.metalAvailable ? '#22c55e' : '#eab308', fontSize: '13px', fontWeight: 600 }}>
        <ShieldCheck size={16} />
        {stats.metalAvailable ? 'Metal GPU Active' : 'CPU Mode Active'}
      </div>
    </div>
  );
};
