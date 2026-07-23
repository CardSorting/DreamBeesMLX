/**
 * [LAYER: INFRASTRUCTURE]
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconActivity, IconCheck, IconLoader } from '../icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GenerationTimeEstimatorProps {
  generating: boolean;
  estimatedSeconds?: number;
  showProgressBar?: boolean;
}

type GenerationStage = 'queued' | 'preparing' | 'generating' | 'finishing' | 'complete';

interface StageInfo {
  id: GenerationStage;
  label: string;
  icon: string;
  description: string;
  typicalDuration: number; // seconds
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GENERATION_STAGES: StageInfo[] = [
  {
    id: 'queued',
    label: 'Queued',
    icon: '📋',
    description: 'Request received',
    typicalDuration: 2
  },
  {
    id: 'preparing',
    label: 'Preparing',
    icon: '🔧',
    description: 'Setting up generation',
    typicalDuration: 5
  },
  {
    id: 'generating',
    label: 'Creating',
    icon: '✨',
    description: 'AI is painting',
    typicalDuration: 25
  },
  {
    id: 'finishing',
    label: 'Finalizing',
    icon: '🎨',
    description: 'Adding final touches',
    typicalDuration: 8
  },
  {
    id: 'complete',
    label: 'Done',
    icon: '✅',
    description: 'Image ready',
    typicalDuration: 0
  }
];

// Total estimated default time
const DEFAULT_ESTIMATED_SECONDS = GENERATION_STAGES.reduce(
  (sum, stage) => sum + stage.typicalDuration,
  0
);

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Formats seconds into human-readable durations
 * Mirrors formats used by YouTube, Midjourney, Instagram
 */
const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Calculate elapsed seconds since a start timestamp
 */
const getElapsedSeconds = (startTime?: number): number => {
  if (!startTime) return 0;
  return (Date.now() - startTime) / 1000;
};

/**
 * Determine the current generation stage based on elapsed time
 * Uses proportional timing similar to Midjourney's phase detection
 */
const getCurrentStage = (
  elapsedSeconds: number,
  estimatedTotal: number
): { stage: StageInfo; stageProgress: number } => {
  let accumulated = 0;

  for (const stage of GENERATION_STAGES) {
    // Scale stage duration proportionally to total estimate
    const scaleFactor = estimatedTotal / DEFAULT_ESTIMATED_SECONDS;
    const scaledDuration = stage.typicalDuration * scaleFactor;

    if (elapsedSeconds <= accumulated + scaledDuration) {
      const stageProgress = Math.min(
        100,
        ((elapsedSeconds - accumulated) / scaledDuration) * 100
      );
      return { stage, stageProgress };
    }
    accumulated += scaledDuration;
  }

  // If past all stages, show finishing
  return {
    stage: GENERATION_STAGES[GENERATION_STAGES.length - 2], // 'finishing'
    stageProgress: 95
  };
};

/**
 * Calculate overall progress percentage
 */
const getOverallProgress = (
  elapsedSeconds: number,
  estimatedTotal: number
): number => {
  if (estimatedTotal <= 0) return 0;
  return Math.min(98, (elapsedSeconds / estimatedTotal) * 100);
};

/**
 * Format an ETA message in a friendly, non-technical way
 * Mirrors patterns from food delivery apps, ride-sharing, YouTube
 */
const formatETAMessage = (
  elapsedSeconds: number,
  estimatedTotal: number,
  currentStage: StageInfo
): string => {
  const remaining = Math.max(0, estimatedTotal - elapsedSeconds);
  const progress = getOverallProgress(elapsedSeconds, estimatedTotal);

  // Early stage: friendly waiting messages
  if (elapsedSeconds < 3) return 'Starting up...';
  if (elapsedSeconds < 8) return 'Warming up the AI...';

  // Overdue: reassuring messages (like Uber when driver is late)
  if (elapsedSeconds > estimatedTotal * 1.2) {
    const overageMessages = [
      'Almost there, polishing details...',
      'Taking a bit longer for quality...',
      'Final quality checks in progress...'
    ];
    return overageMessages[Math.floor(elapsedSeconds / 15) % overageMessages.length];
  }

  // Late stage: completion-focused
  if (progress > 85) return 'Nearly done...';
  if (progress > 70) return 'Adding finishing touches...';

  // Mid-stage: show time remaining (like food delivery)
  if (remaining > 0 && estimatedTotal > 0) {
    return `About ${formatDuration(remaining)} left`;
  }

  // Fallback: stage description
  return currentStage.description;
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

/**
 * Stage indicator dot — shows completed, active, or pending
 */
function StageDot({
  stage,
  isActive,
  isComplete,
  index
}: {
  stage: StageInfo;
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  return (
    <motion.div
      className={`stage-dot ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      title={stage.label}
      aria-label={`${stage.label}: ${stage.description}`}
    >
      {isComplete ? (
        <IconCheck size={10} />
      ) : isActive ? (
        <motion.span
          className="stage-pulse"
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      ) : (
        <span className="stage-pending" />
      )}
    </motion.div>
  );
}

/**
 * Stage connector line — shows progress between dots
 */
function StageConnector({ isComplete }: { isComplete: boolean }) {
  return (
    <div className={`stage-connector ${isComplete ? 'complete' : ''}`}>
      {isComplete && (
        <motion.div
          className="connector-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}

/**
 * Progress bar with gradient fill and smooth animation
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="time-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="time-progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <div className="progress-shimmer" />
    </div>
  );
}

/**
 * Time metrics row — elapsed time and confidence indicator
 */
function TimeMetrics({
  elapsedSeconds,
  estimatedTotal,
  confidence
}: {
  elapsedSeconds: number;
  estimatedTotal: number;
  confidence: 'high' | 'medium' | 'low';
}) {
  const confidenceLabel = {
    high: 'Accurate estimate',
    medium: 'Approximate',
    low: 'Varies by server load'
  }[confidence];

  const confidenceColor = {
    high: 'var(--color-green-400, #4ade80)',
    medium: 'var(--color-yellow-400, #facc15)',
    low: 'var(--color-zinc-400, #a1a1aa)'
  }[confidence];

  return (
    <div className="time-metrics-row">
      <div className="elapsed-badge" aria-live="polite">
        <IconActivity size={11} />
        <span>{formatDuration(elapsedSeconds)} elapsed</span>
      </div>
      <div
        className="confidence-badge"
        title={confidenceLabel}
        style={{ borderColor: confidenceColor }}
      >
        <span style={{ color: confidenceColor }}>●</span>
        <span>{confidenceLabel}</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GenerationTimeEstimator({
  generating,
  estimatedSeconds,
  showProgressBar = true
}: GenerationTimeEstimatorProps) {
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [tick, setTick] = useState(0);

  // Track generation start/stop
  useEffect(() => {
    if (generating) {
      setStartTime(Date.now());
    } else {
      setStartTime(undefined);
    }
  }, [generating]);

  // Live-updating timer (1 second interval)
  useEffect(() => {
    if (!generating || !startTime) return;

    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [generating, startTime]);

  // Calculate all derived values
  const elapsedSeconds = useMemo(
    () => getElapsedSeconds(startTime),
    [startTime, tick]
  );

  const estimatedTotal = useMemo(
    () => estimatedSeconds || DEFAULT_ESTIMATED_SECONDS,
    [estimatedSeconds]
  );

  const { stage: currentStage, stageProgress } = useMemo(
    () => getCurrentStage(elapsedSeconds, estimatedTotal),
    [elapsedSeconds, estimatedTotal]
  );

  const overallProgress = useMemo(
    () => getOverallProgress(elapsedSeconds, estimatedTotal),
    [elapsedSeconds, estimatedTotal]
  );

  const etaMessage = useMemo(
    () => formatETAMessage(elapsedSeconds, estimatedTotal, currentStage),
    [elapsedSeconds, estimatedTotal, currentStage]
  );

  // Confidence level based on whether server provided an estimate
  const confidence = useMemo(() => {
    if (!estimatedSeconds) return 'low';
    if (estimatedSeconds > 120) return 'medium';
    return 'high';
  }, [estimatedSeconds]);

  // Current stage index for rendering stage indicators
  const currentStageIndex = useMemo(() => {
    return GENERATION_STAGES.findIndex(s => s.id === currentStage.id);
  }, [currentStage]);

  // Don't render if not generating
  if (!generating) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className="generation-time"
        role="status"
        aria-label={`Generation status: ${etaMessage}`}
        aria-live="polite"
      >
        {/* ── Stage Indicator Bar ──────────────────────────────── */}
        <div className="stage-indicator-bar" aria-label="Generation stages">
          {GENERATION_STAGES.filter(s => s.id !== 'complete').map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <StageDot
                stage={stage}
                isActive={idx === currentStageIndex}
                isComplete={idx < currentStageIndex}
                index={idx}
              />
              {idx < GENERATION_STAGES.length - 2 && (
                <StageConnector isComplete={idx < currentStageIndex} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Stage Labels ─────────────────────────────────────── */}
        <div className="stage-labels">
          <span className="stage-label active-stage">
            <span className="stage-emoji">{currentStage.icon}</span>
            {currentStage.label}
          </span>
          <span className="eta-message">{etaMessage}</span>
        </div>

        {/* ── Progress Bar ─────────────────────────────────────── */}
        {showProgressBar && (
          <div className="progress-section">
            <ProgressBar progress={overallProgress} />
            <span className="progress-percentage">{Math.round(overallProgress)}%</span>
          </div>
        )}

        {/* ── Time Metrics ─────────────────────────────────────── */}
        <TimeMetrics
          elapsedSeconds={elapsedSeconds}
          estimatedTotal={estimatedTotal}
          confidence={confidence}
        />
      </motion.div>
    </AnimatePresence>
  );
}