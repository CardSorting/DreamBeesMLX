/**
 * [LAYER: INFRASTRUCTURE]
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLite } from '../contexts/LiteContext';
import { getOptimizedImageUrl } from '../lite-utils';
import DreamInput from '../components/DreamInput';
import PictureThumb from '../components/PictureThumb';
import PreviewImage from '../components/PreviewImage';
import { HardwareMonitor } from '../components/HardwareMonitor';
import {
  AspectRatio,
  DEFAULT_ASPECT_RATIO,
  aspectRatioOptions,
  getAspectRatioOption,
  normalizeAspectRatio,
  toCssAspectRatio,
} from '../lib/aspectRatios';
import { formatElapsed, formatPendingTimeRemaining, historyThumbUrl, messageForStage, STAGE_ORDER } from '../lib/generationFlow';
import { DREAMTRAIL_MODES, DreamTrailMode } from '../lib/dreamtrail';
import { IconImage, IconLoader, IconMagic, IconZap } from '../icons';
import './Generator.css';

const quickIdeas = [
  { label: 'Cute bee', prompt: 'A cute bee mascot, playful sticker style' },
  { label: 'Cozy studio', prompt: 'A cozy bee studio inside a sunflower, soft morning light' },
  { label: 'Honey jar', prompt: 'A premium honey jar, golden studio light' },
] as const;

const getStoredAspectRatio = (): AspectRatio => {
  if (typeof window === 'undefined') return DEFAULT_ASPECT_RATIO;
  return normalizeAspectRatio(window.localStorage.getItem('generator_aspect_ratio'));
};

export default function Generator() {
  const [prompt, setPrompt] = useState('');
  const [dreamTrailMode, setDreamTrailMode] = useState<DreamTrailMode>('balanced');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(getStoredAspectRatio);

  const {
    selectedModel, generate, generating, generationStage, generationProgress,
    generationPreviewUrl, activeGeneration, pendingGeneration, displayHistory, generateStartTime,
    currentUser, isOffline, zaps, dismissStuckPending,
  } = useLite();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [, setElapsedTick] = useState(0);
  useEffect(() => {
    if (!generating || !generateStartTime) return;
    const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [generating, generateStartTime]);

  const cleanPrompt = prompt.trim();
  const latestImage = displayHistory[0];
  const recentImages = displayHistory.slice(1, 9);
  const latestAspectRatio =
    latestImage?.aspectRatio ||
    latestImage?.params?.aspectRatio ||
    latestImage?.params?.size;
  const previewAspectRatio = toCssAspectRatio(
    activeGeneration?.aspectRatio ||
      pendingGeneration?.aspectRatio ||
      (typeof latestAspectRatio === 'string' ? latestAspectRatio : aspectRatio)
  );
  const selectedRatioOption = getAspectRatioOption(aspectRatio) || aspectRatioOptions[0];

  const hasCredits = zaps === 'unlimited' || zaps > 0;
  const awaitingPending = Boolean(pendingGeneration && !generating);
  const pendingTimeHint = pendingGeneration ? formatPendingTimeRemaining(pendingGeneration) : null;
  const canGenerate = Boolean(
    cleanPrompt && selectedModel && currentUser && !isOffline && !generating && !awaitingPending && hasCredits
  );

  const greeting = useMemo(() => {
    const firstName = currentUser?.displayName?.split(' ')[0];
    return firstName ? `Hi ${firstName}!` : 'Create a picture';
  }, [currentUser]);

  const creditsText = useMemo(() => {
    if (!currentUser) return null;
    if (zaps === 'unlimited') return 'Unlimited credits';
    if (typeof zaps === 'number') return `${Math.max(0, Math.floor(zaps))} credits left`;
    return null;
  }, [currentUser, zaps]);

  const progressLabel = generating ? messageForStage(generationStage) : null;
  const stageIndex = generating ? STAGE_ORDER.indexOf(generationStage as typeof STAGE_ORDER[number]) : -1;
  const previewSharpen = generationProgress >= 88;
  const elapsedText =
    generating && generateStartTime ? formatElapsed(Date.now() - generateStartTime) : null;

  const blockReason = useMemo(() => {
    if (generating || canGenerate) return null;
    if (isOffline) return 'You need internet';
    if (!currentUser) return 'Sign in first';
    if (!selectedModel) return 'Pick a style below';
    if (!hasCredits) return 'No credits left';
    if (awaitingPending) return 'Your last picture is still finishing';
    if (!cleanPrompt) return 'Write what you want above';
    return null;
  }, [generating, canGenerate, isOffline, currentUser, selectedModel, hasCredits, cleanPrompt, awaitingPending]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const submitted = cleanPrompt;
    if (!submitted) return;

    if (window.electronAPI?.mlx) {
      try {
        await window.electronAPI.mlx.generateImage({
          prompt: submitted,
          modelId: selectedModel?.id || 'flux2-klein-4b',
          width: 1024,
          height: 1024,
          steps: 4,
          guidanceScale: 3.5,
        });
        if (mountedRef.current) setPrompt('');
        return;
      } catch (err) {
        console.error('Local MLX generation error:', err);
      }
    }
    const ok = await generate(submitted, { aspectRatio });
    if (ok && mountedRef.current) setPrompt('');
  };

  const handleAspectRatioChange = (next: AspectRatio) => {
    setAspectRatio(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('generator_aspect_ratio', next);
    }
  };

  const handleRatioKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, current: AspectRatio) => {
    const currentIndex = aspectRatioOptions.findIndex((option) => option.value === current);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % aspectRatioOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + aspectRatioOptions.length) % aspectRatioOptions.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = aspectRatioOptions.length - 1;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    const next = aspectRatioOptions[nextIndex].value;
    handleAspectRatioChange(next);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-ratio="${next}"]`)?.focus();
    });
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [cleanPrompt, canGenerate]);

  return (
    <div className="generator-simple fade-in">
      <header className="page-head">
        <h1>{greeting}</h1>
        <p>Write an idea, pick a style, tap create.</p>
      </header>

      <HardwareMonitor />

      <main className="generator-layout">
        <aside className="input-column">
          <form onSubmit={handleGenerate} className="input-panel" aria-label="Create image">
            <label htmlFor="image-prompt" className="field-label">What do you want?</label>
            <DreamInput
              id="image-prompt"
              placeholder="A friendly bee painting a rainbow…"
              value={prompt}
              mode={dreamTrailMode}
              onChange={setPrompt}
              onSubmit={handleGenerate}
              maxLength={1000}
            />

            <div className="dreamtrail-mode-row" aria-label="DreamTrail mode">
              {DREAMTRAIL_MODES.map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  className={mode.id === dreamTrailMode ? 'active' : ''}
                  onClick={() => setDreamTrailMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="idea-row" aria-label="Quick ideas">
              {quickIdeas.map((idea) => (
                <button
                  type="button"
                  key={idea.label}
                  className="idea-pill"
                  onClick={() => {
                    setPrompt((prev) => {
                      const cleanPrev = prev.trim();
                      if (!cleanPrev) return idea.prompt;
                      if (cleanPrev.toLowerCase().includes(idea.prompt.toLowerCase())) return prev;
                      return `${cleanPrev}, ${idea.prompt}`;
                    });
                  }}
                >
                  {idea.label}
                </button>
              ))}
            </div>

            <fieldset className="ratio-field">
              <legend className="field-label ratio-legend">Shape</legend>
              <div className="ratio-heading">
                <span>Shape</span>
                {'badge' in selectedRatioOption ? <span>{selectedRatioOption.badge}</span> : null}
              </div>
              <div className="ratio-grid" role="radiogroup" aria-label="Image shape">
                {aspectRatioOptions.map((option) => (
                  <button
                    type="button"
                    role="radio"
                    key={option.value}
                    className={option.value === aspectRatio ? 'active' : ''}
                    onClick={() => handleAspectRatioChange(option.value)}
                    onKeyDown={(e) => handleRatioKeyDown(e, option.value)}
                    aria-checked={option.value === aspectRatio}
                    tabIndex={option.value === aspectRatio ? 0 : -1}
                    data-ratio={option.value}
                  >
                    <span className="ratio-mini" style={{ aspectRatio: toCssAspectRatio(option.value) }} aria-hidden />
                    <span className="ratio-copy">
                      <span>{option.label}</span>
                      <small>{option.value}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Link 
              to="/" 
              className="style-row" 
              aria-label="Choose style"
            >
              <IconMagic size={18} />
              <span className="style-row-label">Style</span>
              <span className="style-row-value">{selectedModel?.name || 'Choose one'}</span>
              <span className="style-row-chevron" aria-hidden>›</span>
            </Link>

            <div className="create-zone">
              <button type="submit" className="btn-create" disabled={!canGenerate} aria-busy={generating}>
                {generating ? (
                  <>
                    <IconLoader size={22} className="spin" />
                    {progressLabel || 'Creating…'}
                  </>
                ) : (
                  <>
                    <IconZap size={22} fill={zaps === 'unlimited' ? '#fbbf24' : 'currentColor'} />
                    Create picture
                  </>
                )}
              </button>

              {creditsText ? <p className="credits-line">{creditsText}</p> : null}
              {blockReason ? <p className="block-line">{blockReason}</p> : null}
              {generating ? (
                <>
                  <p className="wait-line">
                    {progressLabel}
                    {elapsedText ? <span className="elapsed-hint"> · {elapsedText}</span> : null}
                  </p>
                  <div className="progress-track" role="progressbar" aria-valuenow={generationProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Creation progress">
                    <div className="progress-fill" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <div className="stage-dots" aria-hidden>
                    {STAGE_ORDER.map((step, i) => (
                      <span key={step} className={`stage-dot ${i <= stageIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </form>
        </aside>

        <section className="preview-column" aria-label="Preview and history">
          <div className="simple-card preview-card">
            <strong className="card-label">
              {generating ? 'Creating…' : awaitingPending ? 'Still working…' : latestImage ? 'Newest' : 'Preview'}
            </strong>

            <div className="preview-stage" style={{ aspectRatio: previewAspectRatio }}>
              {awaitingPending && !generating ? (
                <div className="preview-loading" role="status" aria-live="polite">
                  <div className="preview-skeleton" aria-hidden />
                  <div className="preview-overlay">
                    <IconLoader size={44} className="spin" />
                    <span>Your picture may still finish</span>
                    {pendingGeneration?.prompt ? (
                      <p className="preview-prompt">“{pendingGeneration.prompt}”</p>
                    ) : null}
                    <p className="elapsed-line">
                      {pendingTimeHint
                        ? `Session ends in ${pendingTimeHint}. Check your profile in a moment.`
                        : 'Check your profile in a moment.'}
                    </p>
                    <button
                      type="button"
                      className="dismiss-pending-btn"
                      onClick={dismissStuckPending}
                    >
                      Start fresh
                    </button>
                  </div>
                </div>
              ) : generating ? (
                <div className="preview-loading" role="status" aria-live="polite">
                  {generationPreviewUrl ? (
                    <img
                      src={
                        generationPreviewUrl.startsWith('data:')
                          ? generationPreviewUrl
                          : (getOptimizedImageUrl(generationPreviewUrl) || generationPreviewUrl)
                      }
                      alt=""
                      className={previewSharpen ? 'preview-sharp' : 'preview-blur'}
                      decoding="async"
                    />
                  ) : (
                    <div className="preview-skeleton" aria-hidden />
                  )}
                  <div className="preview-overlay">
                    <IconLoader size={44} className="spin" />
                    <span>{progressLabel}</span>
                    {activeGeneration?.prompt ? (
                      <p className="preview-prompt">“{activeGeneration.prompt}”</p>
                    ) : null}
                    {elapsedText ? <p className="elapsed-line">{elapsedText}</p> : null}
                    <div className="progress-track preview-progress" aria-hidden>
                      <div className="progress-fill" style={{ width: `${generationProgress}%` }} />
                    </div>
                  </div>
                </div>
              ) : latestImage ? (
                <figure className="latest-figure">
                  <PreviewImage
                    src={historyThumbUrl(latestImage) || latestImage.imageUrl}
                    alt={latestImage.prompt || 'Generated image'}
                  />
                  {latestImage.prompt ? <figcaption>{latestImage.prompt}</figcaption> : null}
                </figure>
              ) : (
                <div className="latest-empty">
                  <IconImage size={36} />
                  <span>Your picture shows here</span>
                </div>
              )}
            </div>
          </div>

          <div className="simple-card history-card">
            <div className="card-label-row">
              <strong className="card-label">Older pictures</strong>
              <Link to="/profile" className="text-link">See all</Link>
            </div>

            {recentImages.length > 0 ? (
              <div className="history-grid">
                {recentImages.map((item) => (
                  <div key={item.id}>
                    <PictureThumb
                      item={item}
                      className="history-thumb"
                      showCaption={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="history-empty">More pictures show up here later.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
