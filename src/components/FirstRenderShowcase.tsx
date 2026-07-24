import React from 'react';
import { Sparkles, Palette, Zap, Image as ImageIcon } from 'lucide-react';

export interface StarterTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  modelId: string;
  badge: string;
  gradient: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'cyberpunk_bee',
    title: 'Cyberpunk Golden Bee',
    category: 'Sci-Fi / Neon',
    prompt: 'Cyberpunk neon bee hovering over futuristic Tokyo night, volumetric neon light, 8k RAW photo, masterpiece',
    modelId: 'flux2-klein-4b',
    badge: '🚀 Popular • Sub-Second',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3))',
  },
  {
    id: 'watercolor_sunset',
    title: 'Watercolor Mountain Sunset',
    category: 'Nature / Illustration',
    prompt: 'Studio Ghibli style watercolor illustration of a serene alpine lake surrounded by glowing pine trees at sunset',
    modelId: 'sana-2-sprint',
    badge: '🎨 Artistic • Fast',
    gradient: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(168,85,247,0.3))',
  },
  {
    id: 'oil_mechanical_bee',
    title: 'Renaissance Clockwork Bee',
    category: 'Fine Art / Impasto',
    prompt: 'Classical Renaissance oil painting of a mechanical clockwork bee, textured canvas impasto brushstrokes, golden patina',
    modelId: 'flux2-klein-4b',
    badge: '🖼️ Fine Art • Studio Quality',
    gradient: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(236,72,153,0.3))',
  },
];

export interface FirstRenderShowcaseProps {
  onSelectTemplate: (template: StarterTemplate) => void;
}

export const FirstRenderShowcase: React.FC<FirstRenderShowcaseProps> = ({ onSelectTemplate }) => {
  return (
    <div style={{ width: '100%', marginTop: '20px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Sparkles size={18} color="#c084fc" />
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
          Choose a Starter Template for Your 1st Generation:
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {STARTER_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            onClick={() => onSelectTemplate(tmpl)}
            style={{
              background: tmpl.gradient,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, border-color 0.2s ease, boxShadow 0.2s ease',
              minHeight: '140px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = '#c084fc';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(168,85,247,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#c084fc', marginBottom: '4px' }}>
                {tmpl.category}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                {tmpl.title}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(9,9,11,0.7)', padding: '3px 8px', borderRadius: '10px', color: '#e4e4e7' }}>
                {tmpl.badge}
              </span>
              <Zap size={14} color="#ec4899" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
