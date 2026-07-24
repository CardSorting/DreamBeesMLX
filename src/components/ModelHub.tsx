import React, { useEffect, useState } from 'react';
import { MLXModelInfo } from '../electron-api';
import { Sparkles, HardDrive, Download, CheckCircle, Zap } from 'lucide-react';

export const ModelHub: React.FC = () => {
  const [models, setModels] = useState<MLXModelInfo[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchModels = async () => {
    if (window.electronAPI?.mlx) {
      const list = await window.electronAPI.mlx.listModels();
      setModels(list);
    }
  };

  useEffect(() => {
    let active = true;
    if (window.electronAPI?.mlx) {
      window.electronAPI.mlx.listModels().then((list) => {
        if (active) setModels(list);
      });
    }
    return () => {
      active = false;
    };
  }, []);

  const handleDownload = async (id: string) => {
    if (!window.electronAPI?.mlx) return;
    setDownloadingId(id);
    try {
      await window.electronAPI.mlx.downloadModel(id);
      await fetchModels();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div style={{ padding: '32px', background: 'rgba(12, 12, 14, 0.6)', backdropFilter: 'blur(40px)', color: '#fff', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', minHeight: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <Sparkles size={28} color="#c084fc" />
        </div>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Creative Model Library</h2>
          <p style={{ color: 'rgba(216, 180, 254, 0.8)', margin: '4px 0 0 0', fontSize: '14px' }}>High-performance AI art styles running 100% privately on your Mac</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {models.map((model) => (
          <div
            key={model.id}
            style={{
              background: 'rgba(24, 24, 27, 0.6)',
              backdropFilter: 'blur(20px)',
              border: model.recommended ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: model.recommended ? '0 10px 30px rgba(168, 85, 247, 0.15)' : 'none',
            }}
          >
            <div>
              {model.recommended && (
                <span
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#e9d5ff',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    letterSpacing: '0.05em',
                  }}
                >
                  FEATURED
                </span>
              )}
              <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 8px 0' }}>{model.name}</h3>
              <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                {model.description}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HardDrive size={14} /> {(model.diskSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Storage
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} /> {model.minRamGb}GB RAM
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDownload(model.id)}
              disabled={model.status === 'ready' || downloadingId === model.id}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '14px',
                border: 'none',
                background: model.status === 'ready' ? 'rgba(39, 39, 42, 0.8)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: model.status === 'ready' ? '#a1a1aa' : '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: model.status === 'ready' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {model.status === 'ready' ? (
                <>
                  <CheckCircle size={16} color="#22c55e" /> Installed & Ready
                </>
              ) : downloadingId === model.id ? (
                'Downloading style model…'
              ) : (
                <>
                  <Download size={16} /> Download Style Model
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
