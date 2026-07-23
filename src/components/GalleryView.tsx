import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Copy, Check, ExternalLink, Calendar, Cpu } from 'lucide-react';

export const GalleryView: React.FC = () => {
  const [generations, setGenerations] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGenerations = async () => {
    if (window.electronAPI?.lite) {
      try {
        const records = await window.electronAPI.lite.getGenerations(50);
        setGenerations(records || []);
      } catch (err) {
        console.error('Failed to fetch generations:', err);
      }
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, []);

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ background: '#09090b', minHeight: '90vh', padding: '28px', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <ImageIcon size={28} color="#a855f7" />
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Local Offline Artwork Gallery</h2>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0 0' }}>Stored 100% locally on your Mac's hard drive</p>
        </div>
      </div>

      {generations.length === 0 ? (
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '60px', textAlign: 'center', color: '#71717a' }}>
          <ImageIcon size={48} strokeWidth={1.5} color="#3f3f46" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', color: '#a1a1aa', margin: '0 0 6px 0' }}>No Local Generations Yet</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>Render images in the Studio Canvas to see them stored safely on your machine</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {generations.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div style={{ width: '100%', height: '220px', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '14px' }}>
                <p style={{ fontSize: '13px', color: '#f4f4f5', margin: '0 0 10px 0', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.prompt || 'Untitled local generation'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#71717a' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={12} /> {item.modelId || 'FLUX.2'}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ width: '100%', maxHeight: '500px', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.prompt}
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>{selectedItem.prompt}</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#a1a1aa', marginBottom: '20px' }}>
                <span>Model: {selectedItem.modelId || 'flux2-klein-4b'}</span>
                <span>Date: {new Date(selectedItem.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => copyPrompt(selectedItem.id, selectedItem.prompt)}
                  style={{
                    background: '#a855f7',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copiedId === selectedItem.id ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
                  {copiedId === selectedItem.id ? 'Copied Prompt!' : 'Copy Prompt'}
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
