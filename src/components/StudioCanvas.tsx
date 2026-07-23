import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Sliders, Play, RefreshCw, Copy, Check, Info, Image as ImageIcon, Zap } from 'lucide-react';
import { HardwareMonitor } from './HardwareMonitor';

export const ASPECT_RATIOS = [
  { label: 'Square 1:1', ratio: '1:1', width: 1024, height: 1024, icon: '⏹' },
  { label: 'Portrait 3:4', ratio: '3:4', width: 768, height: 1024, icon: '📱' },
  { label: 'Landscape 4:3', ratio: '4:3', width: 1024, height: 768, icon: '🖼' },
  { label: 'Widescreen 16:9', ratio: '16:9', width: 1344, height: 768, icon: '🖥' },
  { label: 'Story 9:16', ratio: '9:16', width: 768, height: 1344, icon: '📱' },
];

export const StudioCanvas: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [steps, setSteps] = useState(4);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [seed, setSeed] = useState<number | ''>('');
  const [selectedModel, setSelectedModel] = useState('sana-2-sprint');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (window.electronAPI?.mlx) {
      window.electronAPI.mlx.listModels().then((models) => {
        const readyModel = models.find((m) => m.status === 'ready');
        if (readyModel) {
          setSelectedModel(readyModel.id);
        }
      });

      const unsubProgress = window.electronAPI.mlx.onProgress((data: any) => {
        setIsGenerating(true);
        setProgressPct(data.progress_pct || 0);
        setProgressStage(data.stage || 'Rendering on Apple GPU...');
        if (data.elapsed_ms) setElapsedMs(data.elapsed_ms);
      });

      const unsubComplete = window.electronAPI.mlx.onComplete((data: any) => {
        setIsGenerating(false);
        if (data.auto_provisioned_model_id) {
          setSelectedModel(data.auto_provisioned_model_id);
        }
        if (data.output_path) {
          setResultImage(`file://${data.output_path}`);
        }
        if (data.duration_ms) setElapsedMs(data.duration_ms);
      });

      return () => {
        unsubProgress();
        unsubComplete();
      };
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setProgressPct(5);
    setProgressStage('Initializing MLX pipeline...');
    setResultImage(null);

    const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 1000000);

    if (window.electronAPI?.mlx) {
      try {
        await window.electronAPI.mlx.generateImage({
          prompt: prompt.trim(),
          modelId: selectedModel,
          width: selectedRatio.width,
          height: selectedRatio.height,
          steps,
          guidanceScale,
          seed: actualSeed,
        });
      } catch (err) {
        console.error('Generation error:', err);
        setIsGenerating(false);
      }
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div style={{ background: '#09090b', minHeight: '90vh', padding: '28px', color: '#f4f4f5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <HardwareMonitor />

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '28px' }}>
        {/* Controls Sidebar */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', display: 'block', marginBottom: '8px' }}>
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic cybernetic bee harvesting glowing starlight nectar, 8k cinematic..."
              rows={4}
              style={{
                width: '100%',
                background: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                padding: '12px',
                color: '#fff',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa', display: 'block', marginBottom: '8px' }}>
              Aspect Ratio
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {ASPECT_RATIOS.map((item) => (
                <button
                  key={item.ratio}
                  type="button"
                  onClick={() => setSelectedRatio(item)}
                  style={{
                    background: selectedRatio.ratio === item.ratio ? '#a855f722' : '#09090b',
                    border: selectedRatio.ratio === item.ratio ? '1px solid #a855f7' : '1px solid #27272a',
                    borderRadius: '8px',
                    padding: '8px 6px',
                    color: selectedRatio.ratio === item.ratio ? '#c084fc' : '#a1a1aa',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  {item.ratio}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#71717a', display: 'block', marginTop: '6px' }}>
              Resolution: {selectedRatio.width} × {selectedRatio.height}px
            </span>
          </div>

          {/* Advanced Accordion Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a855f7',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
              }}
            >
              <Sliders size={14} /> {showAdvanced ? 'Hide Sampling Controls' : 'Advanced Sampling Controls'}
            </button>

            {showAdvanced && (
              <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '10px', padding: '16px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#a1a1aa' }}>
                    <span>Diffusion Steps: {steps}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={28}
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#a855f7' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#a1a1aa' }}>
                    <span>Guidance Scale: {guidanceScale}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#a855f7' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '4px', color: '#a1a1aa' }}>
                    <span>Seed</span>
                    <button type="button" onClick={randomizeSeed} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: '11px' }}>
                      <RefreshCw size={12} /> Randomize
                    </button>
                  </div>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Random seed"
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      padding: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: !prompt.trim() || isGenerating ? '#27272a' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: !prompt.trim() || isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isGenerating ? 'none' : '0 4px 20px #a855f744',
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={18} className="spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Render on Apple GPU (Cmd + Enter)
              </>
            )}
          </button>
        </div>

        {/* Studio Viewport Canvas */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '520px', position: 'relative' }}>
          {isGenerating && (
            <div style={{ width: '80%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: '#a855f715', padding: '20px', borderRadius: '50%', border: '1px solid #a855f744' }}>
                <Zap size={36} color="#c084fc" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0' }}>{progressStage}</h3>
                <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Step progress on Apple Silicon Metal GPU</p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', background: '#09090b', borderRadius: '20px', height: '10px', overflow: 'hidden', border: '1px solid #27272a' }}>
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 600 }}>{progressPct}% Completed</span>
            </div>
          )}

          {!isGenerating && resultImage && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
              <img
                src={resultImage}
                alt={prompt}
                style={{
                  maxWidth: '100%',
                  maxHeight: '480px',
                  borderRadius: '12px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  objectFit: 'contain',
                }}
              />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={copyPrompt}
                  style={{
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </button>

                {elapsedMs > 0 && (
                  <span style={{ fontSize: '12px', color: '#a1a1aa', background: '#09090b', padding: '6px 12px', borderRadius: '20px', border: '1px solid #27272a' }}>
                    ⚡ Rendered in {(elapsedMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            </div>
          )}

          {!isGenerating && !resultImage && (
            <div style={{ textAlign: 'center', color: '#71717a', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <ImageIcon size={48} strokeWidth={1.5} color="#3f3f46" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#a1a1aa', margin: '0 0 4px 0' }}>Studio Canvas Ready</h3>
                <p style={{ fontSize: '13px', margin: 0 }}>Type a prompt on the left and tap Render to create local artwork</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
