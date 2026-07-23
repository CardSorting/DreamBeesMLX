import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyEditorialAction,
  ARRIVAL_THRESHOLD,
  DreamTrailMode,
  DreamTrailEditorialAction,
  DreamTrailResponse,
  DreamTrailSuggestion,
  filterDreamTrailSuggestions,
  getAcceptedHistory,
  getArrivalState,
  getCadenceState,
  getConfidenceField,
  getConfidenceMode,
  getCreativeState,
  getDecisionState,
  getEditorialChips,
  getInterventionState,
  getLocalDreamTrailSuggestions,
  getRescueChips,
  getTasteGravity,
  getTasteVector,
  isLastWordComplete,
  normalizeSuggestion,
  rememberAcceptedSuggestion,
  takeGhostPhrase,
} from '../lib/dreamtrail';
import { IconChevronLeft, IconChevronRight } from '../icons';

type DreamInputProps = {
  id: string;
  value: string;
  mode: DreamTrailMode;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const REQUEST_DEBOUNCE_MS = 320;
const STALE_AFTER_MS = 7500;
type DreamTrailSource = 'remote' | 'fallback' | 'cached';

function getSustainedGhost(cleanPrompt: string, suggestionsPrompt: string, rawGhost: string): string {
  if (!cleanPrompt || !suggestionsPrompt || !rawGhost) return '';
  
  const cleanPromptLower = cleanPrompt.toLowerCase();
  const suggestionsPromptLower = suggestionsPrompt.toLowerCase();
  
  const strip = (s: string) => s.replace(/[^a-z0-9]/g, '');
  const promptAlphanum = strip(cleanPromptLower);
  const suggestionsPromptAlphanum = strip(suggestionsPromptLower);
  
  if (!promptAlphanum.startsWith(suggestionsPromptAlphanum)) {
    return '';
  }
  
  const typedSuggestionAlphanum = promptAlphanum.slice(suggestionsPromptAlphanum.length);
  const ghostAlphanum = strip(rawGhost.toLowerCase());
  
  if (!ghostAlphanum.startsWith(typedSuggestionAlphanum)) {
    return '';
  }
  
  let alphanumCount = 0;
  const targetCount = typedSuggestionAlphanum.length;
  
  let ghostIndex = 0;
  while (ghostIndex < rawGhost.length && alphanumCount < targetCount) {
    const char = rawGhost[ghostIndex].toLowerCase();
    if (/[a-z0-9]/.test(char)) {
      alphanumCount++;
    }
    ghostIndex++;
  }
  
  let result = rawGhost.slice(ghostIndex);
  
  if (cleanPrompt.endsWith(',')) {
    result = result.replace(/^[\s,]*/, '');
  } else if (cleanPrompt.endsWith(' ')) {
    result = result.replace(/^,?\s*/, '');
  }
  
  return result;
}

export default function DreamInput({
  id,
  value,
  mode,
  placeholder,
  maxLength,
  onChange,
  onSubmit,
}: DreamInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const cooldownTimeoutRef = useRef<number | null>(null);
  const suggestionsRef = useRef<DreamTrailSuggestion[]>([]);
  const activeSuggestionIndexRef = useRef(0);
  const suggestionsPromptRef = useRef('');
  const [suggestions, setSuggestions] = useState<DreamTrailSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [activeKey, setActiveKey] = useState<'tab' | 'right' | 'esc' | null>(null);
  const helpCardRef = useRef<HTMLDivElement | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [undoPrompt, setUndoPrompt] = useState<string | null>(null);
  const [suggestionsPrompt, setSuggestionsPrompt] = useState('');
  const [dreamTrailSource, setDreamTrailSourceState] = useState<DreamTrailSource | null>(null);
  const lastLoggedSourceRef = useRef<DreamTrailSource | null>(null);

  const setDreamTrailSource = useCallback((source: DreamTrailSource | null) => {
    setDreamTrailSourceState(source);
    if (source && source !== lastLoggedSourceRef.current && import.meta.env.DEV) {
      console.debug("[DreamTrail] source:", source);
    }
    lastLoggedSourceRef.current = source;
  }, []);

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    activeSuggestionIndexRef.current = activeSuggestionIndex;
  }, [activeSuggestionIndex]);

  useEffect(() => {
    suggestionsPromptRef.current = suggestionsPrompt;
  }, [suggestionsPrompt]);

  useEffect(() => {
    if (!showHelp) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (helpCardRef.current && !helpCardRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showHelp]);

  const cleanPrompt = value.trim();
  const cadenceState = useMemo(() => getCadenceState(cleanPrompt), [cleanPrompt]);
  const decisionState = useMemo(() => getDecisionState(cleanPrompt, cadenceState), [cleanPrompt, cadenceState]);
  const arrivalState = useMemo(() => getArrivalState(cleanPrompt, decisionState), [cleanPrompt, decisionState]);
  const creativeState = useMemo(() => getCreativeState(cleanPrompt, decisionState, arrivalState, cadenceState), [arrivalState, cadenceState, cleanPrompt, decisionState]);
  const confidenceField = useMemo(() => getConfidenceField(cleanPrompt, decisionState, arrivalState, creativeState, cadenceState), [arrivalState, cadenceState, cleanPrompt, creativeState, decisionState]);
  const confidenceMode = useMemo(() => getConfidenceMode(confidenceField), [confidenceField]);
  const interventionState = useMemo(() => getInterventionState(cleanPrompt, confidenceField, creativeState, arrivalState, decisionState), [arrivalState, cleanPrompt, confidenceField, creativeState, decisionState]);
  const rescueChips = useMemo(() => getRescueChips(), []);
  const editorialChips = useMemo(() => getEditorialChips(arrivalState, confidenceField), [arrivalState, confidenceField]);
  
  const hasArrived = creativeState === 'refining' || creativeState === 'finished' || confidenceMode === 'high' || arrivalState.readinessScore >= ARRIVAL_THRESHOLD;
  const showForks = !hasArrived && (interventionState.reason === 'hesitation' || interventionState.reason === 'branch_confusion');
  const showRescue = !hasArrived && (interventionState.reason === 'looping' || interventionState.reason === 'overloaded' || (interventionState.reason === 'arrival' && confidenceField.executionConfidence < 0.86));
  
  const activeSuggestion = suggestions[activeSuggestionIndex] ?? suggestions[0] ?? null;
  const rawGhost = activeSuggestion?.text ?? '';
  const ghostText = getSustainedGhost(cleanPrompt, suggestionsPrompt, rawGhost);
  const visibleGhost = (
    cleanPrompt &&
    ghostText &&
    isFocused &&
    !cooldownActive &&
    !apiFailed &&
    suggestions.length > 0 &&
    caretAtEnd &&
    !hasSelection
  ) ? ghostText : '';

  const updateCaret = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    setCaretAtEnd(node.selectionStart === value.length && node.selectionEnd === value.length);
    setHasSelection(node.selectionStart !== node.selectionEnd);
  }, [value.length]);

  const acceptSuggestion = useCallback((suggestion: DreamTrailSuggestion | null) => {
    if (!suggestion) return;
    const accepted = normalizeSuggestion(suggestion.text);
    if (!accepted) return;
    rememberAcceptedSuggestion(value, { ...suggestion, text: accepted });
    
    if (cooldownTimeoutRef.current) {
      window.clearTimeout(cooldownTimeoutRef.current);
    }
    setCooldownActive(false);
    setApiFailed(false);
    
    setUndoPrompt(value);
    setSuggestions([]);
    setActiveSuggestionIndex(0);
    setSuggestionsPrompt("");
    setDreamTrailSource(null);
    onChange(value.trim() ? `${value}${accepted}` : accepted.replace(/^,\s*/, ''));
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      node?.focus();
      node?.setSelectionRange(node.value.length, node.value.length);
      if (node && overlayRef.current) {
        overlayRef.current.scrollTop = node.scrollTop;
        overlayRef.current.scrollLeft = node.scrollLeft;
      }
    });
  }, [onChange, setDreamTrailSource, value]);

  const applyEditorialChip = useCallback((action: DreamTrailEditorialAction) => {
    if (action === 'generate') {
      onSubmit();
      return;
    }

    const nextPrompt = applyEditorialAction(value, action);
    if (nextPrompt !== value) {
      if (cooldownTimeoutRef.current) {
        window.clearTimeout(cooldownTimeoutRef.current);
      }
      setCooldownActive(false);
      setApiFailed(false);
      
      setUndoPrompt(value);
      setSuggestions([]);
      setActiveSuggestionIndex(0);
      setSuggestionsPrompt("");
      setDreamTrailSource(null);
      onChange(nextPrompt);
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        node?.focus();
        node?.setSelectionRange(node.value.length, node.value.length);
        if (node && overlayRef.current) {
          overlayRef.current.scrollTop = node.scrollTop;
          overlayRef.current.scrollLeft = node.scrollLeft;
        }
      });
    }
  }, [onChange, onSubmit, setDreamTrailSource, value]);

  useEffect(() => {
    if (!cleanPrompt || cooldownActive) {
      setSuggestions([]);
      setActiveSuggestionIndex(0);
      setSuggestionsPrompt("");
      setDreamTrailSource(null);
      setLoading(false);
      return;
    }

    const currentSuggestions = suggestionsRef.current;
    const currentSuggestionsPrompt = suggestionsPromptRef.current;
    const currentActive = currentSuggestions[activeSuggestionIndexRef.current] ?? currentSuggestions[0] ?? null;
    const currentGhost = currentActive?.text ?? '';
    const currentPrediction = (currentSuggestionsPrompt && currentGhost) ? `${currentSuggestionsPrompt}${currentGhost}` : '';
    const isTypingThrough = (
      cleanPrompt &&
      currentSuggestionsPrompt &&
      currentGhost &&
      cleanPrompt.length > currentSuggestionsPrompt.length &&
      currentPrediction.startsWith(cleanPrompt)
    );

    if (isTypingThrough) {
      setDreamTrailSource('cached');
      setLoading(false);
      return;
    }

    if (!isLastWordComplete(value)) {
      setSuggestions([]);
      setActiveSuggestionIndex(0);
      setSuggestionsPrompt("");
      setDreamTrailSource(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), STALE_AFTER_MS);
    setLoading(true);
    const debounceId = window.setTimeout(async () => {
      const tasteVector = getTasteVector();
      const tasteGravity = getTasteGravity(tasteVector);
      setApiFailed(false);
      try {
        const response = await fetch('/api/dreamtrail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            acceptedHistory: getAcceptedHistory(),
            tasteVector,
            tasteGravity,
            cadenceState,
            decisionState,
            arrivalState,
            creativeState,
            confidenceField,
            interventionState,
            mode,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const fallback = getLocalDreamTrailSuggestions(cleanPrompt, mode, tasteVector, tasteGravity, cadenceState, decisionState, arrivalState, creativeState, confidenceField);
          setSuggestions(fallback);
          setActiveSuggestionIndex(0);
          setSuggestionsPrompt(cleanPrompt);
          setDreamTrailSource('fallback');
          setApiFailed(fallback.length === 0);
          return;
        }
        const data = await response.json() as DreamTrailResponse;
        if (requestId !== requestIdRef.current || cooldownActive) return;
        const responseSource: DreamTrailSource = data.source === 'fallback' ? 'fallback' : 'remote';
        if (responseSource === 'fallback') {
          const fallback = getLocalDreamTrailSuggestions(cleanPrompt, mode, tasteVector, tasteGravity, cadenceState, decisionState, arrivalState, creativeState, confidenceField);
          setSuggestions(fallback);
          setActiveSuggestionIndex(0);
          setSuggestionsPrompt(cleanPrompt);
          setDreamTrailSource('fallback');
          setApiFailed(fallback.length === 0);
          return;
        }
        const filtered = filterDreamTrailSuggestions(data.suggestions ?? [], cleanPrompt, tasteVector, mode, tasteGravity, cadenceState, decisionState, arrivalState, creativeState, confidenceField);
        const fallback = filtered.length === 0
          ? getLocalDreamTrailSuggestions(cleanPrompt, mode, tasteVector, tasteGravity, cadenceState, decisionState, arrivalState, creativeState, confidenceField)
          : [];
        setSuggestions(filtered.length ? filtered.slice(0, 3) : fallback);
        setActiveSuggestionIndex(0);
        setSuggestionsPrompt(cleanPrompt);
        setDreamTrailSource(filtered.length ? responseSource : 'fallback');
        setApiFailed(filtered.length === 0 && fallback.length === 0);
      } catch {
        if (requestId === requestIdRef.current) {
          const fallback = getLocalDreamTrailSuggestions(cleanPrompt, mode, tasteVector, tasteGravity, cadenceState, decisionState, arrivalState, creativeState, confidenceField);
          setSuggestions(fallback);
          setActiveSuggestionIndex(0);
          setSuggestionsPrompt(cleanPrompt);
          setDreamTrailSource('fallback');
          setApiFailed(fallback.length === 0);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, REQUEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceId);
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [arrivalState, cadenceState, cleanPrompt, confidenceField, creativeState, decisionState, mode, value, cooldownActive, setDreamTrailSource]);

  const panelSuggestions = useMemo(() => {
    if (loading || !dreamTrailSource || dreamTrailSource === 'cached' || showRescue || hasArrived) return [];
    return suggestions.slice(0, 2);
  }, [dreamTrailSource, hasArrived, loading, showRescue, suggestions]);

  return (
    <div className="dream-input-shell">
      <div className="dream-input-wrap" data-loading={loading ? 'true' : 'false'}>
        {import.meta.env.DEV && dreamTrailSource ? (
          <div className="dreamtrail-dev-source">DreamTrail: {dreamTrailSource}</div>
        ) : null}
        <div ref={overlayRef} className="dreamtrail-overlay" aria-hidden>
          <span className="dreamtrail-overlay-prompt">{value || ' '}</span>
          {visibleGhost ? <span className="dreamtrail-ghost">{visibleGhost}</span> : null}
        </div>
        <textarea
          ref={textareaRef}
          id={id}
          className="prompt-input dream-input-textarea"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            if (cooldownTimeoutRef.current) {
              window.clearTimeout(cooldownTimeoutRef.current);
            }
            setCooldownActive(false);
            setApiFailed(false);
            setUndoPrompt(null);
            onChange(event.target.value);
            
            const target = event.currentTarget;
            setTimeout(() => {
              updateCaret();
              if (overlayRef.current) {
                overlayRef.current.scrollTop = target.scrollTop;
                overlayRef.current.scrollLeft = target.scrollLeft;
              }
            }, 0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
              return;
            }
            if (event.key === 'Tab' && visibleGhost) {
              event.preventDefault();
              setActiveKey('tab');
              setTimeout(() => setActiveKey(null), 150);
              acceptSuggestion(activeSuggestion);
              return;
            }
            if (event.key === 'ArrowDown' && suggestions.length > 1) {
              event.preventDefault();
              setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
              return;
            }
            if (event.key === 'ArrowUp' && suggestions.length > 1) {
              event.preventDefault();
              setActiveSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (event.key === 'ArrowRight' && visibleGhost && caretAtEnd && activeSuggestion) {
              event.preventDefault();
              setActiveKey('right');
              setTimeout(() => setActiveKey(null), 150);
              acceptSuggestion({
                ...activeSuggestion,
                text: takeGhostPhrase(visibleGhost),
              });
              return;
            }
            if (event.key === 'Escape' && suggestions.length) {
              event.preventDefault();
              setActiveKey('esc');
              setTimeout(() => setActiveKey(null), 150);
              setCooldownActive(true);
              if (cooldownTimeoutRef.current) {
                window.clearTimeout(cooldownTimeoutRef.current);
              }
              cooldownTimeoutRef.current = window.setTimeout(() => {
                setCooldownActive(false);
              }, 5000);
              setSuggestions([]);
              setActiveSuggestionIndex(0);
              setSuggestionsPrompt("");
            }
          }}
          onScroll={(event) => {
            if (overlayRef.current) {
              overlayRef.current.scrollTop = event.currentTarget.scrollTop;
              overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            updateCaret();
            if (textareaRef.current && overlayRef.current) {
              overlayRef.current.scrollTop = textareaRef.current.scrollTop;
              overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
            }
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onClick={updateCaret}
          onKeyUp={updateCaret}
          onSelect={updateCaret}
          maxLength={maxLength}
          spellCheck
          aria-describedby={`${id}-hint`}
        />
      </div>
      <div id={`${id}-hint`} className="dreamtrail-hint">
        <div className="dreamtrail-hint-left">
          {visibleGhost ? (
            <div className="dreamtrail-hint-keys">
              <button
                type="button"
                className="dreamtrail-hint-btn"
                onClick={() => acceptSuggestion(activeSuggestion)}
                title="Accept suggestion (Tab)"
              >
                <span className={`dreamtrail-keycap ${activeKey === 'tab' ? 'active' : ''}`}>Tab</span> <span className="dreamtrail-hint-action">accept suggestion</span>
              </button>
              <span className="dreamtrail-hint-divider">•</span>
              <button
                type="button"
                className="dreamtrail-hint-btn"
                onClick={() =>
                  acceptSuggestion({
                    ...activeSuggestion,
                    text: takeGhostPhrase(visibleGhost),
                  })
                }
                title="Accept next word (Right Arrow)"
              >
                <span className={`dreamtrail-keycap ${activeKey === 'right' ? 'active' : ''}`}>→</span> <span className="dreamtrail-hint-action">accept word</span>
              </button>
              
              {suggestions.length > 1 && (
                <>
                  <span className="dreamtrail-hint-divider">•</span>
                  <div className="dreamtrail-pagination">
                    <button
                      type="button"
                      className="dreamtrail-pagination-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSuggestionIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
                      }}
                      title="Previous suggestion (ArrowUp)"
                    >
                      <IconChevronLeft size={12} />
                    </button>
                    <span className="dreamtrail-pagination-text" title="Cycle suggestions (ArrowUp / ArrowDown)">
                      {activeSuggestionIndex + 1} of {suggestions.length}
                    </span>
                    <button
                      type="button"
                      className="dreamtrail-pagination-arrow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
                      }}
                      title="Next suggestion (ArrowDown)"
                    >
                      <IconChevronRight size={12} />
                    </button>
                  </div>
                </>
              )}

              <span className="dreamtrail-hint-divider">•</span>
              <button
                type="button"
                className="dreamtrail-hint-btn"
                onClick={() => {
                  setActiveKey('esc');
                  setTimeout(() => setActiveKey(null), 150);
                  setCooldownActive(true);
                  if (cooldownTimeoutRef.current) {
                    window.clearTimeout(cooldownTimeoutRef.current);
                  }
                  cooldownTimeoutRef.current = window.setTimeout(() => {
                    setCooldownActive(false);
                  }, 5000);
                  setSuggestions([]);
                  setActiveSuggestionIndex(0);
                  setSuggestionsPrompt("");
                }}
                title="Dismiss suggestions (Escape)"
              >
                <span className={`dreamtrail-keycap ${activeKey === 'esc' ? 'active' : ''}`}>Esc</span> <span className="dreamtrail-hint-action">dismiss</span>
              </button>
            </div>
          ) : undoPrompt ? (
            <div className="dreamtrail-hint-keys">
              <button
                type="button"
                className="dreamtrail-hint-btn dreamtrail-undo-btn"
                onClick={() => {
                  onChange(undoPrompt);
                  setUndoPrompt(null);
                  requestAnimationFrame(() => {
                    const node = textareaRef.current;
                    node?.focus();
                    node?.setSelectionRange(node.value.length, node.value.length);
                  });
                }}
                title="Undo last change"
              >
                <span className="dreamtrail-keycap">↺</span> <span className="dreamtrail-hint-action">undo last change</span>
              </button>
            </div>
          ) : (
            <span className="dreamtrail-hint-idle">DreamTrail is listening for the edge of your idea.</span>
          )}
        </div>
        
        <div className="dreamtrail-status-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {cleanPrompt && (
            <div className={`dreamtrail-status-pill ${loading ? 'dreamtrail-status-loading' : `dreamtrail-status-${confidenceMode}`}`}>
              <span className="dreamtrail-status-dot"></span>
              <span className="dreamtrail-status-text">
                {loading ? 'DreamTrail thinking...' : (
                  <>
                    {confidenceMode === 'low' && 'Dream Explorer'}
                    {confidenceMode === 'medium' && 'Dream Builder'}
                    {confidenceMode === 'high' && 'Dream Editor'}
                  </>
                )}
              </span>
            </div>
          )}
          <button
            type="button"
            className={`dreamtrail-info-trigger ${showHelp ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(prev => !prev);
            }}
            title="What is DreamTrail?"
            aria-expanded={showHelp}
          >
            ?
          </button>
          
          {showHelp && (
            <div className="dreamtrail-info-card glass-immersive fade-in" ref={helpCardRef}>
              <h4>About DreamTrail</h4>
              <p>DreamTrail is your ambient creative companion. As you write, it predicts details, actions, and settings to inspire your imagination.</p>
              <ul>
                <li><span className="info-key">Tab</span> accepts suggestion.</li>
                <li><span className="info-key">→</span> accepts word.</li>
                <li><span className="info-key">↓</span> / <span className="info-key">↑</span> cycles alternative suggestions.</li>
                <li><span className="info-key">Esc</span> dismisses suggestions.</li>
              </ul>
              <p className="info-note">Use the mode buttons below the prompt to guide how dreamlike or realistic suggestions should be.</p>
            </div>
          )}
        </div>
      </div>
      {showRescue ? (
        <div className="dreamtrail-panel dreamtrail-editorial-panel" aria-label="DreamTrail rescue moves">
          <div className="dreamtrail-panel-title">Creative Rescue Moves:</div>
          {rescueChips.map((chip) => (
            <button type="button" key={chip.id} onClick={() => applyEditorialChip(chip.id)}>
              {chip.label}
            </button>
          ))}
        </div>
      ) : hasArrived && editorialChips.length > 0 ? (
        <div className="dreamtrail-panel dreamtrail-editorial-panel" aria-label="DreamTrail editorial moves">
          <div className="dreamtrail-panel-title">Editorial Refinements:</div>
          {editorialChips.map((chip) => (
            <button type="button" key={chip.id} onClick={() => applyEditorialChip(chip.id)}>
              {chip.label}
            </button>
          ))}
        </div>
      ) : panelSuggestions.length > 0 ? (
        <div className="dreamtrail-panel" aria-label="DreamTrail alternatives">
          <div className="dreamtrail-panel-title">Alternate Directions:</div>
          {panelSuggestions.map((suggestion, index) => (
            <button
              type="button"
              key={`${suggestion.mutation}:${suggestion.text}`}
              className={index === activeSuggestionIndex ? 'active' : ''}
              onClick={() => acceptSuggestion(suggestion)}
            >
              ↳ {suggestion.text.replace(/^,\s*/, '')}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
