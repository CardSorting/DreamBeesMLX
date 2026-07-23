import React, { useEffect, useState } from 'react';
import { MLXModelInfo } from '../electron-api';
import { Cpu, HardDrive, Download, CheckCircle, Zap } from 'lucide-react';

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
    fetchModels();
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
    <div style={{ padding: '24px', background: '#09090b', color: '#fff', borderRadius: '16px', minHeight: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Cpu size={28} color="#a855f7" />
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Cutting-Edge MLX Model Catalog</h2>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0 0' }}>2026 Open-Weights Diffusion & DiT Models natively accelerated on Apple Silicon</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {models.map((model) => (
          <div
            key={model.id}
            style={{
              background: '#18181b',
              border: model.recommended ? '1px solid #a855f7' : '1px solid #27272a',
              borderRadius: '12px',
              padding: '20px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {model.recommended && (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#a855f722',
                    color: '#c084fc',
                    border: '1px solid #a855f755',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}
                >
                  RECOMMENDED
                </span>
              )}
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>{model.name}</h3>
              <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {model.description}
              </p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#71717a', marginBottom: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HardDrive size={14} /> {(model.diskSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={14} /> Min {model.minRamGb}GB RAM
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDownload(model.id)}
              disabled={model.status === 'ready' || downloadingId === model.id}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: model.status === 'ready' ? '#27272a' : '#a855f7',
                color: model.status === 'ready' ? '#a1a1aa' : '#ffffff',
                fontWeight: 600,
                cursor: model.status === 'ready' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {model.status === 'ready' ? (
                <>
                  <CheckCircle size={16} color="#22c55e" /> Installed & Ready
                </>
              ) : downloadingId === model.id ? (
                'Downloading weights...'
              ) : (
                <>
                  <Download size={16} /> Download MLX Model
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
