import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Copy, Check, Sparkles } from 'lucide-react';

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

  // Keyboard Escape listener cleanup for lightbox modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItem(null);
      }
    };
    if (selectedItem) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem]);

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ background: 'rgba(12, 12, 14, 0.6)', backdropFilter: 'blur(40px)', minHeight: '90vh', padding: '32px', color: '#fff', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <ImageIcon size={28} color="#c084fc" />
        </div>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Local Studio Gallery</h2>
          <p style={{ color: 'rgba(216, 180, 254, 0.8)', margin: '4px 0 0 0', fontSize: '14px' }}>Your creations stay 100% private on your Mac</p>
        </div>
      </div>

      {generations.length === 0 ? (
        <div style={{ background: 'rgba(24, 24, 27, 0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '60px', textAlign: 'center', color: '#a1a1aa' }}>
          <ImageIcon size={48} strokeWidth={1.5} color="#c084fc" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', color: '#fff', fontWeight: 700, margin: '0 0 6px 0' }}>No Saved Artwork Yet</h3>
          <p style={{ fontSize: '14px', margin: 0 }}>Generate pictures in the Studio Canvas to build your local collection</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {generations.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              style={{
                background: 'rgba(24, 24, 27, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div style={{ width: '100%', height: '220px', background: '#060608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: '13px', color: '#f4f4f5', margin: '0 0 12px 0', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.prompt || 'Untitled picture'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} color="#c084fc" /> {item.modelId || 'FLUX.2'}
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
            backdropFilter: 'blur(16px)',
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
              background: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              maxWidth: '800px',
              width: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ width: '100%', maxHeight: '500px', background: '#060608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.prompt}
                loading="eager"
                decoding="async"
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>{selectedItem.prompt}</h3>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
                <span>Style: {selectedItem.modelId || 'flux2-klein-4b'}</span>
                <span>Date: {new Date(selectedItem.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => copyPrompt(selectedItem.id, selectedItem.prompt)}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontWeight: 700,
                    fontSize: '13px',
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontWeight: 700,
                    fontSize: '13px',
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

