export const MUTATION_KEYS = [
  'mythmaking',
  'melancholy',
  'absurdity',
  'grandeur',
  'intimacy',
  'decay',
  'ritual',
  'whimsy',
  'machinery',
  'mystery',
  'nostalgia',
  'satire',
  'wonder',
  'elegance',
  'danger',
] as const;

export type TasteMutation = typeof MUTATION_KEYS[number];

export type TasteVector = Record<TasteMutation, number>;

export type TasteGravity = {
  dominantAxes: TasteMutation[];
  suppressedAxes: TasteMutation[];
  recentTrajectory: TasteMutation[];
  noveltyPressure: number;
  coherencePressure: number;
};

export type CadencePhase = 'seed' | 'build' | 'twist' | 'resolve';

export type CadenceState = {
  acceptedCount: number;
  currentPhase: CadencePhase;
  phraseLengthBias: 'short' | 'medium';
  escalationLevel: number;
};

export type DecisionNeed = 'identity' | 'setting' | 'action' | 'conflict' | 'symbol' | 'composition' | 'tone';

export type DecisionState = {
  missingNeeds: DecisionNeed[];
  strongestNeed: DecisionNeed;
  alreadySatisfied: DecisionNeed[];
};

export type ArrivalMove = 'continue' | 'tighten' | 'sharpen' | 'generate';

export type ArrivalState = {
  hasIdentity: boolean;
  hasAction: boolean;
  hasSetting: boolean;
  hasConflict: boolean;
  hasSymbol: boolean;
  readinessScore: number;
  nextBestMove: ArrivalMove;
};

export type CreativeState = 'blank' | 'searching' | 'exploring' | 'committing' | 'refining' | 'finished';

export type ConfidenceField = {
  directionConfidence: number;
  conceptConfidence: number;
  executionConfidence: number;
};

export type ConfidenceMode = 'low' | 'medium' | 'high';

export type GhostAssertiveness = 'subtle' | 'normal' | 'strong';

export type InterventionReason = 'hesitation' | 'looping' | 'branch_confusion' | 'arrival' | 'overloaded' | 'none';

export type InterventionState = {
  uncertaintyScore: number;
  attentionCost: number;
  expectedMomentumGain: number;
  interventionLevel: 0 | 1 | 2 | 3;
  reason: InterventionReason;
};

export type DreamTrailEditorialAction = 'choose_direction' | 'tighten' | 'sharpen_conflict' | 'strengthen_symbol' | 'start_over_softer' | 'generate';

export type DreamTrailEditorialChip = {
  id: DreamTrailEditorialAction;
  label: string;
};

export type MutationEvent = {
  sourceText: string;
  acceptedGhost: string;
  detectedMutation: TasteMutation;
  detectedDecision?: DecisionNeed;
  timestamp: number;
};

export type DreamTrailMode = 'balanced' | 'dreamier' | 'weirder' | 'concept_art' | 'print_ready' | 'commercial';

export interface DreamInputState {
  prompt: string;
  ghostText: string;
  suggestions: DreamTrailSuggestion[];
  loading: boolean;
}

export interface DreamTrailSuggestion {
  text: string;
  mutation: TasteMutation;
  decision?: DecisionNeed;
  score: number;
}

export interface DreamTrailResponse {
  suggestions: DreamTrailSuggestion[];
  source?: 'remote' | 'fallback';
}

export const ARRIVAL_THRESHOLD = 0.65;
export const FINISHED_THRESHOLD = 0.86;
export const HIGH_CONFIDENCE_THRESHOLD = 0.72;

export const DREAMTRAIL_MODES: Array<{ id: DreamTrailMode; label: string }> = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'dreamier', label: 'Dreamier' },
  { id: 'weirder', label: 'Weirder' },
  { id: 'concept_art', label: 'Concept Art' },
  { id: 'print_ready', label: 'Print Ready' },
  { id: 'commercial', label: 'Commercial' },
];

export const MUTATION_ADJACENCY: Record<TasteMutation, TasteMutation[]> = {
  mythmaking: ['ritual', 'grandeur', 'mystery'],
  melancholy: ['nostalgia', 'intimacy', 'decay'],
  absurdity: ['satire', 'whimsy', 'machinery'],
  grandeur: ['mythmaking', 'wonder', 'danger'],
  intimacy: ['melancholy', 'nostalgia', 'elegance'],
  decay: ['melancholy', 'mystery', 'nostalgia'],
  ritual: ['mythmaking', 'mystery', 'elegance'],
  whimsy: ['absurdity', 'wonder', 'intimacy'],
  machinery: ['satire', 'danger', 'wonder'],
  mystery: ['mythmaking', 'decay', 'ritual'],
  nostalgia: ['melancholy', 'intimacy', 'decay'],
  satire: ['absurdity', 'machinery', 'danger'],
  wonder: ['grandeur', 'whimsy', 'mystery'],
  elegance: ['ritual', 'intimacy', 'grandeur'],
  danger: ['grandeur', 'machinery', 'satire'],
};

const VECTOR_STORAGE_KEY = 'dreambees:dreamtrail:v2:taste-vector';
const EVENTS_STORAGE_KEY = 'dreambees:dreamtrail:v2:mutation-events';
const LEGACY_TASTE_STORAGE_KEY = 'dreambees:dreamtrail:taste';
const MAX_EVENTS = 40;
const SUBJECT_STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'for',
  'from',
  'under',
  'inside',
  'near',
  'beside',
  'behind',
  'above',
  'below',
  'some',
  'that',
  'this',
  'here',
  'there',
  'into',
  'onto',
  'over',
  'through',
  'about',
  'after',
  'before',
  'between',
  'while',
  'where',
  'when',
  'then',
  'than',
  'very',
  'really',
  'just',
  'like',
  'made',
  'making',
]);

export const DEFAULT_TASTE_VECTOR: TasteVector = {
  mythmaking: 0.34,
  melancholy: 0.12,
  absurdity: 0.16,
  grandeur: 0.2,
  intimacy: 0.16,
  decay: 0.1,
  ritual: 0.2,
  whimsy: 0.38,
  machinery: 0.1,
  mystery: 0.24,
  nostalgia: 0.14,
  satire: 0.08,
  wonder: 0.45,
  elegance: 0.22,
  danger: 0.12,
};

const BANNED_FRAGMENTS = [
  '4k',
  '8k',
  'best quality',
  'masterpiece',
  'trending',
  'award-winning',
  'award winning',
  'high resolution',
  'ultra detailed',
  'photorealistic',
  'prompt',
  'midjourney',
  'stable diffusion',
  'beautiful',
  'nice',
  'cool',
  'quality',
  'artstation',
];

const MUTATION_PATTERNS: Record<TasteMutation, RegExp> = {
  mythmaking: /\b(last|first|ancient|legend|oath|kingdom|hive|crown|prophecy|guardian|heir|relic|throne)\b/,
  melancholy: /\b(forgotten|lonely|fading|wilted|rain|mourning|empty|lost|silent|abandoned|farewell)\b/,
  absurdity: /\b(teacup|tiny|impossible|inside-out|upside-down|talking|oversized|miniature|nonsense|juggling)\b/,
  grandeur: /\b(colossal|cathedral|eclipse|procession|towering|vast|imperial|monument|storm-lit|banner)\b/,
  intimacy: /\b(whisper|bedside|pocket|letter|keepsake|small|close|tender|hidden|private|handheld)\b/,
  decay: /\b(rusted|cracked|overgrown|moth-eaten|withered|ruined|tarnished|moss|dust|broken)\b/,
  ritual: /\b(ceremonial|altar|mask|procession|candle|offering|sigil|rune|woven|consecrated|rite)\b/,
  whimsy: /\b(pollen|honey|lantern|dewdrop|storybook|velvet|mushroom|floating|glowing|bee|tiny)\b/,
  machinery: /\b(clockwork|gear|brass|engine|mechanical|automaton|hinged|copper|steam|machine)\b/,
  mystery: /\b(secret|hidden|moonlit|veiled|door|shadow|cipher|unknown|mist|locked|eclipse)\b/,
  nostalgia: /\b(old|vintage|childhood|faded|postcard|attic|heirloom|memory|sepia|keepsake)\b/,
  satire: /\b(bureaucratic|royal decree|paperwork|parade|tiny crown|mock|poster|official|committee)\b/,
  wonder: /\b(eclipse|constellation|aurora|floating|glowing|starlit|luminous|pollen-lit|moon|miracle)\b/,
  elegance: /\b(silk|porcelain|filigree|ivory|graceful|lace|delicate|velvet|ornate|ceremonial)\b/,
  danger: /\b(defending|battlefield|wasp|thorn|storm|blade|last stand|venom|guarding|peril|fang)\b/,
};

const DECISION_KEYS: DecisionNeed[] = ['identity', 'setting', 'action', 'conflict', 'symbol', 'composition', 'tone'];

const DECISION_PATTERNS: Record<DecisionNeed, RegExp> = {
  identity: /\b(armor|helmet|crown|cloak|sword|shield|mask|knight|queen|king|wizard|bee|dragon|relic|banner-bearer)\b/,
  setting: /\b(gates|walls|hive|castle|forest|battlefield|cathedral|garden|moon|throne|beyond|inside|beneath|under|at dawn)\b/,
  action: /\b(guarding|defending|holding|carrying|leading|facing|wearing|riding|searching|kneeling|returning)\b/,
  conflict: /\b(wasp|shadow|storm|venom|enemy|cracked|ruined|last|final|threat|gather|broken|peril)\b/,
  symbol: /\b(banner|sunrise|eclipse|sigil|relic|crown|altar|halo|standard|flag|rune|emblem|honeycomb)\b/,
  composition: /\b(centered|framed|foreground|silhouette|beneath|against|overhead|close-up|wide|bordered|profile)\b/,
  tone: /\b(final|lonely|festival|quiet|melancholy|triumphant|tender|ominous|joyful|forgotten|secret)\b/,
};

const CADENCE_DECISION: Record<CadencePhase, DecisionNeed> = {
  seed: 'identity',
  build: 'action',
  twist: 'conflict',
  resolve: 'symbol',
};

const FALLBACK_SUGGESTIONS: DreamTrailSuggestion[] = [
  { text: ', carrying a lantern', mutation: 'whimsy', decision: 'action', score: 0.5 },
  { text: ', beneath a strange glow', mutation: 'wonder', decision: 'setting', score: 0.5 },
  { text: ', at the edge of a forgotten place', mutation: 'melancholy', decision: 'setting', score: 0.5 },
];

export function getTasteVector(): TasteVector {
  try {
    const raw = localStorage.getItem(VECTOR_STORAGE_KEY);
    if (!raw) return migrateLegacyTaste();
    return normalizeTasteVector({ ...DEFAULT_TASTE_VECTOR, ...JSON.parse(raw) });
  } catch {
    return DEFAULT_TASTE_VECTOR;
  }
}

export function getMutationEvents(): MutationEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isMutationEvent).slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

export function getTasteGravity(
  tasteVector: TasteVector = getTasteVector(),
  events: MutationEvent[] = getMutationEvents()
): TasteGravity {
  const ranked = [...MUTATION_KEYS].sort((a, b) => tasteVector[b] - tasteVector[a]);
  const recentTrajectory = events.slice(0, 6).map((event) => event.detectedMutation);
  const lastThree = recentTrajectory.slice(0, 3);
  const repeatedRecent = Math.max(0, ...MUTATION_KEYS.map((axis) => lastThree.filter((item) => item === axis).length));
  const topValue = tasteVector[ranked[0]] ?? 0;
  const thirdValue = tasteVector[ranked[2]] ?? 0;
  const concentration = clamp01(topValue - thirdValue);
  const noveltyPressure = clamp01(0.22 + concentration * 0.55 + Math.max(0, repeatedRecent - 1) * 0.24);
  const coherencePressure = clamp01(0.82 - noveltyPressure * 0.42 + Math.min(0.16, recentTrajectory.length * 0.025));

  return {
    dominantAxes: ranked.slice(0, 3),
    suppressedAxes: ranked.slice(-4).reverse(),
    recentTrajectory,
    noveltyPressure,
    coherencePressure,
  };
}

export function getCadenceState(prompt: string, events: MutationEvent[] = getMutationEvents()): CadenceState {
  const normalizedPrompt = prompt.toLowerCase();
  const acceptedCount = events
    .slice(0, 12)
    .filter((event) => {
      const ghost = event.acceptedGhost.toLowerCase();
      const source = event.sourceText.toLowerCase();
      return normalizedPrompt.includes(ghost) || normalizedPrompt.startsWith(source);
    })
    .length;
  const currentPhase = phaseForCount(acceptedCount);
  return {
    acceptedCount,
    currentPhase,
    phraseLengthBias: currentPhase === 'seed' || currentPhase === 'build' ? 'short' : 'medium',
    escalationLevel: clamp01(acceptedCount / 3),
  };
}

export function getDecisionState(prompt: string, cadence: CadenceState = getCadenceState(prompt)): DecisionState {
  const alreadySatisfied = DECISION_KEYS.filter((need) => DECISION_PATTERNS[need].test(prompt.toLowerCase()));
  const missingNeeds = DECISION_KEYS.filter((need) => !alreadySatisfied.includes(need));
  const phaseNeed = CADENCE_DECISION[cadence.currentPhase];
  const strongestNeed = missingNeeds.includes(phaseNeed)
    ? phaseNeed
    : phaseNeed === 'identity' && !/\b(armor|helmet|cloak|crown|shield|sword|mask)\b/i.test(prompt)
      ? 'identity'
      : missingNeeds[0] ?? phaseNeed;

  return {
    missingNeeds,
    strongestNeed,
    alreadySatisfied,
  };
}

export function getArrivalState(prompt: string, decision: DecisionState = getDecisionState(prompt)): ArrivalState {
  const lower = prompt.toLowerCase();
  const hasIdentity = decision.alreadySatisfied.includes('identity');
  const hasAction = decision.alreadySatisfied.includes('action');
  const hasSetting = decision.alreadySatisfied.includes('setting');
  const hasConflict = decision.alreadySatisfied.includes('conflict');
  const hasSymbol = decision.alreadySatisfied.includes('symbol');
  const hasComposition = decision.alreadySatisfied.includes('composition');
  const hasTone = decision.alreadySatisfied.includes('tone');
  const structuralArrival = (hasIdentity && hasAction && hasSetting) || (hasIdentity && hasConflict && hasSymbol);
  const commaCount = (prompt.match(/,/g) ?? []).length;

  let readinessScore = 0;
  if (hasIdentity) readinessScore += 0.24;
  if (hasAction) readinessScore += 0.18;
  if (hasSetting) readinessScore += 0.18;
  if (hasConflict) readinessScore += 0.16;
  if (hasSymbol) readinessScore += 0.16;
  if (hasComposition) readinessScore += 0.04;
  if (hasTone) readinessScore += 0.04;
  if (structuralArrival) readinessScore = Math.max(readinessScore, ARRIVAL_THRESHOLD);
  if (commaCount >= 5) readinessScore = Math.min(1, readinessScore + 0.06);
  if (wordCount(prompt) > 28) readinessScore = Math.min(1, readinessScore + 0.04);
  readinessScore = clamp01(readinessScore);

  let nextBestMove: ArrivalMove = 'continue';
  if (readinessScore >= ARRIVAL_THRESHOLD) {
    if (commaCount >= 4 || /\b(armor|helmet|shield|sword|cloak|banner|eclipse|gate|wall|wasp|shadow)\b/.test(lower)) {
      nextBestMove = 'tighten';
    } else if (!hasConflict || !hasSymbol) {
      nextBestMove = 'sharpen';
    } else {
      nextBestMove = readinessScore >= 0.84 ? 'generate' : 'tighten';
    }
  }

  return {
    hasIdentity,
    hasAction,
    hasSetting,
    hasConflict,
    hasSymbol,
    readinessScore,
    nextBestMove,
  };
}

export function getCreativeState(
  prompt: string,
  decision: DecisionState = getDecisionState(prompt),
  arrival: ArrivalState = getArrivalState(prompt, decision),
  cadence: CadenceState = getCadenceState(prompt)
): CreativeState {
  const clean = prompt.trim();
  const words = wordCount(clean);
  if (!clean || words <= 1) return 'blank';
  if (arrival.readinessScore >= FINISHED_THRESHOLD && arrival.hasIdentity && arrival.hasAction && arrival.hasSetting && arrival.hasConflict && arrival.hasSymbol) {
    return 'finished';
  }
  if (arrival.hasIdentity && arrival.hasAction && arrival.hasSetting && !arrival.hasConflict && !arrival.hasSymbol) {
    return 'exploring';
  }
  if (arrival.readinessScore >= ARRIVAL_THRESHOLD) return 'refining';
  if (arrival.hasIdentity && arrival.hasAction && arrival.hasConflict) return 'committing';
  if (arrival.hasIdentity && (arrival.hasAction || arrival.hasSetting || cadence.currentPhase === 'build' || cadence.currentPhase === 'twist')) {
    return 'exploring';
  }
  return 'searching';
}

export function getConfidenceField(
  prompt: string,
  decision: DecisionState = getDecisionState(prompt),
  arrival: ArrivalState = getArrivalState(prompt, decision),
  creativeState: CreativeState = getCreativeState(prompt, decision, arrival),
  cadence: CadenceState = getCadenceState(prompt),
  events: MutationEvent[] = getMutationEvents()
): ConfidenceField {
  const clean = prompt.trim();
  const words = wordCount(clean);
  const lower = clean.toLowerCase();
  const recentEvents = events.slice(0, 8);
  const currentAccepts = recentEvents.filter((event) => {
    const ghost = event.acceptedGhost.toLowerCase();
    return lower.includes(ghost.replace(/^,\s*/, '')) || lower.startsWith(event.sourceText.toLowerCase());
  });
  const recentAxes = new Set(recentEvents.slice(0, 5).map((event) => event.detectedMutation));

  let directionConfidence = 0.08;
  if (arrival.hasIdentity) directionConfidence += 0.16;
  if (arrival.hasAction) directionConfidence += 0.2;
  if (arrival.hasSetting) directionConfidence += 0.16;
  if (arrival.hasConflict) directionConfidence += 0.2;
  if (arrival.hasSymbol) directionConfidence += 0.12;
  if (creativeState === 'blank') directionConfidence -= 0.18;
  if (creativeState === 'searching') directionConfidence -= 0.08;
  if (creativeState === 'committing' || creativeState === 'refining') directionConfidence += 0.1;
  if (words <= 2) directionConfidence -= 0.12;

  let conceptConfidence = 0.16;
  conceptConfidence += Math.min(0.22, words * 0.018);
  conceptConfidence += decision.alreadySatisfied.length * 0.055;
  if (/\b(ceremonial|honeycomb|amber|shadow|pollen|cracked|banner|gates|armor|wasps|lantern|procession)\b/.test(lower)) conceptConfidence += 0.2;
  if (/\b(cool|thing|stuff|vibe|aesthetic|fantasy|random|whatever|nice|beautiful)\b/.test(lower)) conceptConfidence -= 0.24;
  if (creativeState === 'blank') conceptConfidence -= 0.12;

  let executionConfidence = arrival.readinessScore * 0.58 + cadence.escalationLevel * 0.18;
  executionConfidence += Math.min(0.14, currentAccepts.length * 0.045);
  if (creativeState === 'refining') executionConfidence += 0.12;
  if (creativeState === 'finished') executionConfidence += 0.22;
  if (recentAxes.size >= 4 && currentAccepts.length < 2) executionConfidence -= 0.16;
  if (words <= 2) executionConfidence -= 0.12;

  return {
    directionConfidence: clamp01(directionConfidence),
    conceptConfidence: clamp01(conceptConfidence),
    executionConfidence: clamp01(executionConfidence),
  };
}

export function getConfidenceMode(confidence: ConfidenceField): ConfidenceMode {
  const average = (confidence.directionConfidence + confidence.conceptConfidence + confidence.executionConfidence) / 3;
  if (confidence.executionConfidence >= HIGH_CONFIDENCE_THRESHOLD || average >= 0.74) return 'high';
  if (confidence.directionConfidence < 0.42 || confidence.conceptConfidence < 0.38) return 'low';
  return 'medium';
}

export function getGhostAssertiveness(confidence: ConfidenceField): GhostAssertiveness {
  const mode = getConfidenceMode(confidence);
  if (mode === 'low') return 'strong';
  if (mode === 'high') return 'subtle';
  return 'normal';
}

export function getInterventionState(
  prompt: string,
  confidence: ConfidenceField,
  creativeState: CreativeState,
  arrival: ArrivalState,
  decision: DecisionState = getDecisionState(prompt),
  events: MutationEvent[] = getMutationEvents()
): InterventionState {
  const clean = prompt.trim();
  const words = wordCount(clean);
  const recent = events.slice(0, 5);
  const lastThree = recent.slice(0, 3);
  const repeatedAxis = Math.max(0, ...MUTATION_KEYS.map((axis) => lastThree.filter((event) => event.detectedMutation === axis).length));
  const repeatedDecision = Math.max(0, ...DECISION_KEYS.map((need) => lastThree.filter((event) => event.detectedDecision === need).length));
  const commaCount = (clean.match(/,/g) ?? []).length;
  const isGeneric = /\b(cool|thing|stuff|vibe|aesthetic|random|whatever|bored|boring)\b/i.test(clean);
  const confidenceAverage = (confidence.directionConfidence + confidence.conceptConfidence + confidence.executionConfidence) / 3;

  const uncertaintyScore = clamp01(
    1
    - confidenceAverage * 0.7
    + (decision.missingNeeds.length / DECISION_KEYS.length) * 0.2
    + (creativeState === 'blank' || creativeState === 'searching' ? 0.18 : 0)
    + (isGeneric ? 0.18 : 0)
  );

  const attentionCost = clamp01(
    0.16
    + confidence.executionConfidence * 0.3
    + confidence.directionConfidence * 0.18
    + (words > 18 ? 0.12 : 0)
    + (creativeState === 'refining' || creativeState === 'finished' ? 0.18 : 0)
    + (clean.endsWith(',') ? 0.08 : 0)
  );

  let reason: InterventionReason = 'none';
  if (creativeState === 'refining' || creativeState === 'finished' || confidence.executionConfidence >= HIGH_CONFIDENCE_THRESHOLD) {
    reason = 'arrival';
  } else if (repeatedAxis >= 3 || repeatedDecision >= 3) {
    reason = 'looping';
  } else if (isGeneric || (words > 14 && decision.missingNeeds.length >= 4)) {
    reason = 'overloaded';
  } else if (creativeState === 'blank' || words <= 1) {
    reason = 'hesitation';
  } else if (getConfidenceMode(confidence) === 'low' || creativeState === 'searching') {
    reason = 'branch_confusion';
  }

  let expectedMomentumGain = 0;
  if (reason === 'hesitation') expectedMomentumGain = 0.74;
  if (reason === 'branch_confusion') expectedMomentumGain = 0.66;
  if (reason === 'looping') expectedMomentumGain = 0.82;
  if (reason === 'overloaded') expectedMomentumGain = 0.78;
  if (reason === 'arrival') expectedMomentumGain = confidence.executionConfidence >= 0.86 ? 0.36 : 0.62;
  if (reason === 'none') expectedMomentumGain = Math.max(0.08, uncertaintyScore * 0.45);
  if (commaCount >= 5 && confidence.executionConfidence < 0.7) expectedMomentumGain += 0.08;
  expectedMomentumGain = clamp01(expectedMomentumGain);

  let interventionLevel: 0 | 1 | 2 | 3 = 0;
  if (reason === 'looping' || reason === 'overloaded') interventionLevel = 3;
  else if (reason === 'hesitation' || reason === 'branch_confusion') interventionLevel = 2;
  else if (reason === 'arrival') interventionLevel = confidence.executionConfidence >= 0.86 ? 1 : 3;
  else interventionLevel = 1;

  return {
    uncertaintyScore,
    attentionCost,
    expectedMomentumGain,
    interventionLevel,
    reason,
  };
}

export function getRescueChips(): DreamTrailEditorialChip[] {
  return [
    { id: 'choose_direction', label: '🧭 Choose direction' },
    { id: 'tighten', label: '⚡ Tighten prompt' },
    { id: 'start_over_softer', label: '🔄 Start over softer' },
  ];
}

export function getEditorialChips(arrival: ArrivalState, confidence?: ConfidenceField): DreamTrailEditorialChip[] {
  if (confidence && getConfidenceMode(confidence) === 'high') {
    if (confidence.executionConfidence >= 0.86) return [{ id: 'generate', label: '✨ Generate picture' }];
    return [
      { id: 'tighten', label: '⚡ Tighten prompt' },
      { id: 'sharpen_conflict', label: '💥 Sharpen conflict' },
      { id: 'strengthen_symbol', label: '🔮 Strengthen symbol' },
      { id: 'generate', label: '✨ Generate picture' },
    ];
  }
  if (arrival.readinessScore >= FINISHED_THRESHOLD && arrival.hasIdentity && arrival.hasAction && arrival.hasSetting && arrival.hasConflict && arrival.hasSymbol) {
    return [{ id: 'generate', label: '✨ Generate picture' }];
  }
  if (arrival.readinessScore < ARRIVAL_THRESHOLD) return [];
  const chips: DreamTrailEditorialChip[] = [
    { id: 'tighten', label: '⚡ Tighten prompt' },
    { id: 'sharpen_conflict', label: '💥 Sharpen conflict' },
    { id: 'strengthen_symbol', label: '🔮 Strengthen symbol' },
    { id: 'generate', label: '✨ Generate picture' },
  ];

  if (arrival.nextBestMove === 'sharpen') {
    return [chips[1], chips[2], chips[0], chips[3]];
  }
  if (arrival.nextBestMove === 'generate') {
    return [chips[3], chips[0], chips[1], chips[2]];
  }
  return chips;
}

export function applyEditorialAction(prompt: string, action: DreamTrailEditorialAction): string {
  if (action === 'generate') return prompt;
  if (action === 'choose_direction') return appendEditorialPhrase(prompt, directionPhraseFor(prompt));
  if (action === 'tighten') return tightenPrompt(prompt);
  if (action === 'sharpen_conflict') return appendEditorialPhrase(prompt, conflictPhraseFor(prompt));
  if (action === 'start_over_softer') return softerStartFor(prompt);
  return appendEditorialPhrase(prompt, symbolPhraseFor(prompt));
}

export function getAcceptedHistory(limit = 8) {
  return getMutationEvents().map((event) => event.acceptedGhost).slice(0, limit);
}

export function rememberAcceptedSuggestion(sourceText: string, suggestion: DreamTrailSuggestion) {
  const acceptedGhost = normalizeSuggestion(suggestion.text);
  if (!acceptedGhost) return;

  const detectedMutation = isMutation(suggestion.mutation)
    ? suggestion.mutation
    : detectMutation(acceptedGhost);
  const detectedDecision = isDecisionNeed(suggestion.decision)
    ? suggestion.decision
    : detectDecision(acceptedGhost);

  const event: MutationEvent = {
    sourceText: sourceText.trim().slice(-180),
    acceptedGhost,
    detectedMutation,
    detectedDecision,
    timestamp: Date.now(),
  };

  const events = [event, ...getMutationEvents()].slice(0, MAX_EVENTS);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(updateTasteVector(getTasteVector(), detectedMutation)));
}

export function updateTasteVector(vector: TasteVector, mutation: TasteMutation) {
  const next = { ...vector };
  MUTATION_KEYS.forEach((key) => {
    next[key] = key === mutation ? next[key] + 0.08 : next[key] * 0.995;
  });
  return normalizeTasteVector(next);
}

export function getLocalDreamTrailSuggestions(
  prompt: string,
  mode: DreamTrailMode,
  tasteVector = getTasteVector(),
  gravity = getTasteGravity(tasteVector),
  cadence = getCadenceState(prompt),
  decision = getDecisionState(prompt, cadence),
  arrival = getArrivalState(prompt, decision),
  creativeState = getCreativeState(prompt, decision, arrival, cadence),
  confidence = getConfidenceField(prompt, decision, arrival, creativeState, cadence)
): DreamTrailSuggestion[] {
  const source = prompt.trim();
  if ((source.length < 3 && creativeState !== 'blank') || endsWithConnector(source)) return [];
  return FALLBACK_SUGGESTIONS.map((suggestion) => ({ ...suggestion }));
}

export function filterDreamTrailSuggestions(
  suggestions: Array<DreamTrailSuggestion | string>,
  prompt = '',
  tasteVector: TasteVector = DEFAULT_TASTE_VECTOR,
  mode: DreamTrailMode = 'balanced',
  gravity: TasteGravity = getTasteGravity(tasteVector),
  cadence: CadenceState = getCadenceState(prompt),
  decision: DecisionState = getDecisionState(prompt, cadence),
  arrival: ArrivalState = getArrivalState(prompt, decision),
  creativeState: CreativeState = getCreativeState(prompt, decision, arrival, cadence),
  confidence: ConfidenceField = getConfidenceField(prompt, decision, arrival, creativeState, cadence)
) {
  const promptTokens = tokenSet(prompt);
  const accepted: DreamTrailSuggestion[] = [];

  for (const candidate of suggestions) {
    const suggestion = normalizeDreamTrailSuggestion(candidate, tasteVector, mode);
    if (!suggestion) continue;
    const lower = suggestion.text.toLowerCase();
    if (BANNED_FRAGMENTS.some((fragment) => lower.includes(fragment))) continue;
    if (isKeywordSoup(suggestion.text)) continue;
    if (wordCount(suggestion.text) < 3 || wordCount(suggestion.text) > 14) continue;
    if (promptTokens.size && jaccard(promptTokens, tokenSet(suggestion.text)) > 0.72) continue;
    if (accepted.some((existing) => jaccard(tokenSet(existing.text), tokenSet(suggestion.text)) > 0.44)) continue;
    accepted.push({
      ...suggestion,
      score: scoreSuggestion(suggestion, tasteVector, mode, gravity, cadence, decision, arrival, creativeState, confidence),
    });
  }

  return orderWithTasteGravity(accepted, gravity);
}

export function normalizeSuggestion(value: string) {
  const trimmed = value
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed) return '';
  if (/^(,|\band\b|\bwith\b|\bbeneath\b|\bunder\b|\binside\b|\bwearing\b|\bholding\b|\bdefending\b)/i.test(trimmed)) {
    return trimmed.replace(/\s+([,;:])/g, '$1');
  }
  return `, ${trimmed}`;
}

export function takeGhostPhrase(ghostText: string) {
  const text = ghostText.trimStart();
  if (!text) return '';
  if (text.startsWith(',')) {
    const rest = text.slice(1);
    const nextComma = rest.indexOf(',');
    return nextComma === -1 ? text : `,${rest.slice(0, nextComma)}`;
  }
  const match = text.match(/^(.+?)(,\s+|\s+and\s+|\s+with\s+)/i);
  return match?.[1] ?? text;
}

function normalizeDreamTrailSuggestion(
  candidate: DreamTrailSuggestion | string,
  tasteVector: TasteVector,
  mode: DreamTrailMode
): DreamTrailSuggestion | null {
  if (typeof candidate === 'string') {
    const text = normalizeSuggestion(candidate);
    if (!text) return null;
    const mutation = detectMutation(text);
    const decision = detectDecision(text);
    const decisionState = getDecisionState('', phaseDefaults.seed);
    const arrival = getArrivalState('', decisionState);
    const creativeState = getCreativeState('', decisionState, arrival, phaseDefaults.seed);
    return { text, mutation, decision, score: scoreSuggestion({ text, mutation, decision, score: 0.5 }, tasteVector, mode, getTasteGravity(tasteVector), phaseDefaults.seed, decisionState, arrival, creativeState, getConfidenceField('', decisionState, arrival, creativeState, phaseDefaults.seed)) };
  }

  const text = normalizeSuggestion(candidate.text);
  if (!text) return null;
  const mutation = isMutation(candidate.mutation) ? candidate.mutation : detectMutation(text);
  const decision = isDecisionNeed(candidate.decision) ? candidate.decision : detectDecision(text);
  return {
    text,
    mutation,
    decision,
    score: clamp01(typeof candidate.score === 'number' ? candidate.score : 0.5),
  };
}

function detectMutation(text: string): TasteMutation {
  const lower = text.toLowerCase();
  let best: TasteMutation = 'wonder';
  let bestScore = 0;

  MUTATION_KEYS.forEach((key) => {
    const matches = lower.match(MUTATION_PATTERNS[key]);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  });

  return best;
}

function detectDecision(text: string): DecisionNeed {
  const lower = text.toLowerCase();
  let best: DecisionNeed = 'symbol';
  let bestScore = 0;
  DECISION_KEYS.forEach((key) => {
    const matches = lower.match(DECISION_PATTERNS[key]);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  });
  return best;
}

function scoreSuggestion(
  suggestion: DreamTrailSuggestion,
  tasteVector: TasteVector,
  mode: DreamTrailMode,
  gravity: TasteGravity,
  cadence: CadenceState,
  decision: DecisionState,
  arrival: ArrivalState,
  creativeState: CreativeState,
  confidence: ConfidenceField
) {
  const lower = suggestion.text.toLowerCase();
  let score = clamp01(suggestion.score) * 0.75 + tasteVector[suggestion.mutation] * 0.18;
  const isDominant = gravity.dominantAxes.includes(suggestion.mutation);
  const isAdjacent = gravity.dominantAxes.some((axis) => MUTATION_ADJACENCY[axis].includes(suggestion.mutation));
  const lastThree = gravity.recentTrajectory.slice(0, 3);

  if (mode === 'dreamier' && ['wonder', 'whimsy', 'mystery'].includes(suggestion.mutation)) score += 0.05;
  if (mode === 'weirder' && ['absurdity', 'machinery', 'mystery'].includes(suggestion.mutation)) score += 0.05;
  if (mode === 'concept_art' && ['ritual', 'grandeur', 'danger'].includes(suggestion.mutation)) score += 0.04;
  if (mode === 'print_ready' && ['elegance', 'mythmaking', 'ritual'].includes(suggestion.mutation)) score += 0.04;
  if (mode === 'commercial' && ['whimsy', 'elegance', 'satire'].includes(suggestion.mutation)) score += 0.04;

  if (isAdjacent) score += 0.13 * gravity.noveltyPressure;
  if (isDominant) score += 0.08 * gravity.coherencePressure;
  if (gravity.suppressedAxes.includes(suggestion.mutation)) {
    score += gravity.noveltyPressure > 0.7 ? 0.08 : -0.04;
  }
  if (lastThree.filter((axis) => axis === suggestion.mutation).length > 2) score *= 0.6;
  score += scoreConfidence(suggestion, confidence, arrival);
  score += scoreCadence(suggestion, cadence);
  score += scoreCreativeState(suggestion, creativeState, arrival, decision);
  score += creativeState === 'refining' || creativeState === 'finished'
    ? scoreEditorialUsefulness(suggestion, arrival, decision)
    : scoreDecision(suggestion, decision);
  if (/\b(defending|last|beneath|ceremonial|secret|eclipse|ritual|forgotten|impossible)\b/.test(lower)) score += 0.035;
  if (/\b(style|lighting|composition|quality|detailed)\b/.test(lower)) score -= 0.18;
  score -= Math.max(0, wordCount(suggestion.text) - 10) * 0.015;

  return clamp01(score);
}

const phaseDefaults: Record<CadencePhase, CadenceState> = {
  seed: { acceptedCount: 0, currentPhase: 'seed', phraseLengthBias: 'short', escalationLevel: 0 },
  build: { acceptedCount: 1, currentPhase: 'build', phraseLengthBias: 'short', escalationLevel: 0.33 },
  twist: { acceptedCount: 2, currentPhase: 'twist', phraseLengthBias: 'medium', escalationLevel: 0.66 },
  resolve: { acceptedCount: 3, currentPhase: 'resolve', phraseLengthBias: 'medium', escalationLevel: 1 },
};

function phaseForCount(acceptedCount: number): CadencePhase {
  if (acceptedCount <= 0) return 'seed';
  if (acceptedCount === 1) return 'build';
  if (acceptedCount === 2) return 'twist';
  return 'resolve';
}

function scoreCadence(suggestion: DreamTrailSuggestion, cadence: CadenceState) {
  const text = suggestion.text.toLowerCase();
  const words = wordCount(suggestion.text);
  let score = 0;

  if (cadence.phraseLengthBias === 'short' && words <= 5) score += 0.06;
  if (cadence.phraseLengthBias === 'medium' && words >= 6 && words <= 11) score += 0.06;

  if (cadence.currentPhase === 'seed') {
    if (/\b(armor|crown|cloak|relic|lantern|shield|mask|hive)\b/.test(text)) score += 0.3;
    if (/\b(guarding|defending|as shadow|beyond|final|last|ruined)\b/.test(text)) score -= 0.14;
    if (/\b(final|last|beyond|as shadow|ruined)\b/.test(text)) score -= 0.08;
  } else if (cadence.currentPhase === 'build') {
    if (/\b(guarding|defending|carrying|leading|holding|at the gates|procession)\b/.test(text)) score += 0.22;
  } else if (cadence.currentPhase === 'twist') {
    if (/\b(as|but|while|beyond|shadow|wasp|storm|secret|impossible|ruined|venom)\b/.test(text)) score += 0.24;
    if (suggestion.mutation === 'danger' || suggestion.mutation === 'mystery' || suggestion.mutation === 'absurdity') score += 0.16;
    if (/\b(armor|crown|cloak|gates)\b/.test(text)) score -= 0.12;
  } else {
    if (/\b(final|last|sunrise|farewell|returns|home|quiet|beneath|after)\b/.test(text)) score += 0.26;
    if (suggestion.mutation === 'melancholy' || suggestion.mutation === 'wonder' || suggestion.mutation === 'intimacy') score += 0.12;
    if (/\b(guarding|defending|as shadow|gates|armor)\b/.test(text)) score -= 0.16;
    if (/\b(and then|another|more|extra)\b/.test(text)) score -= 0.1;
  }

  return score * (0.72 + cadence.escalationLevel * 0.28);
}

function scoreDecision(suggestion: DreamTrailSuggestion, decision: DecisionState) {
  const suggestionDecision = suggestion.decision ?? detectDecision(suggestion.text);
  let score = 0;
  if (suggestionDecision === decision.strongestNeed) score += 0.32;
  if (decision.missingNeeds.includes(suggestionDecision)) score += 0.14;
  if (decision.alreadySatisfied.includes(suggestionDecision) && suggestionDecision !== decision.strongestNeed) score -= 0.18;
  if (decision.alreadySatisfied.filter((need) => need === suggestionDecision).length > 0 && suggestionDecision === 'identity') score -= 0.08;
  return score;
}

function scoreConfidence(suggestion: DreamTrailSuggestion, confidence: ConfidenceField, arrival: ArrivalState) {
  const suggestionDecision = suggestion.decision ?? detectDecision(suggestion.text);
  const mode = getConfidenceMode(confidence);
  const text = suggestion.text.toLowerCase();
  let score = 0;

  if (mode === 'low') {
    if (suggestionDecision === 'action' || suggestionDecision === 'setting') score += 0.25;
    if (suggestionDecision === 'conflict') score += 0.15;
    if (/\b(defending|exploring|leading|lost|searching|carrying|wandering|finding)\b/.test(text)) score += 0.15;
    if (suggestionDecision === 'identity' && arrival.hasIdentity) score -= 0.18;
  } else if (mode === 'medium') {
    if (!arrival.hasConflict && suggestionDecision === 'conflict') score += 0.25;
    if (arrival.hasConflict && !arrival.hasSymbol && suggestionDecision === 'symbol') score += 0.18;
    if (suggestionDecision === 'action' && !arrival.hasAction) score += 0.15;
    if (suggestionDecision === 'setting' && !arrival.hasSetting) score += 0.15;
    if (suggestionDecision === 'identity' && arrival.hasIdentity) score -= 0.2;
  } else {
    if (suggestionDecision === 'composition' || suggestionDecision === 'symbol' || suggestionDecision === 'tone') score += 0.25;
    if (suggestionDecision === 'identity' || suggestionDecision === 'action' || suggestionDecision === 'setting') score -= 0.2;
    
    // Favor smaller and more focused suggestions for subtle assertiveness
    const words = wordCount(suggestion.text);
    if (words <= 7) score += 0.15;
    else if (words >= 10) score -= 0.2;
  }

  return score;
}

function scoreCreativeState(
  suggestion: DreamTrailSuggestion,
  creativeState: CreativeState,
  arrival: ArrivalState,
  decision: DecisionState
) {
  const suggestionDecision = suggestion.decision ?? detectDecision(suggestion.text);
  const text = suggestion.text.toLowerCase();
  let score = 0;

  if (creativeState === 'blank') {
    if (suggestionDecision === 'action' || suggestionDecision === 'setting') score += 0.26;
    if (/\b(carrying|lost|searching|finding|walking|following)\b/.test(text)) score += 0.14;
    if (suggestionDecision === 'identity') score -= 0.16;
  } else if (creativeState === 'searching') {
    if (suggestionDecision === 'action' || suggestionDecision === 'setting') score += 0.2;
    if (/\b(defending|exploring|leading|searching|finding)\b/.test(text)) score += 0.12;
    if (suggestionDecision === 'identity') score -= 0.75;
    if (suggestionDecision === 'symbol') score -= 0.24;
  } else if (creativeState === 'exploring') {
    if (suggestionDecision === 'conflict') score += 0.3;
    if (suggestionDecision === 'setting' && !arrival.hasSetting) score += 0.16;
    if (suggestionDecision === 'setting' && arrival.hasSetting) score -= 0.2;
    if (/\b(as|while|beyond|beneath|inside)\b/.test(text)) score += 0.1;
    if (!arrival.hasConflict && suggestionDecision === 'symbol') score -= 0.08;
    if (suggestionDecision === 'identity') score -= 0.6;
    if (suggestionDecision === 'action' && arrival.hasAction) score -= 0.18;
  } else if (creativeState === 'committing') {
    if (suggestionDecision === 'symbol' || suggestionDecision === 'tone' || suggestionDecision === 'composition') score += 0.22;
    if (suggestionDecision === 'setting' && !arrival.hasSetting) score += 0.14;
    if (suggestionDecision === 'setting' && arrival.hasSetting) score -= 0.24;
    if (decision.alreadySatisfied.includes(suggestionDecision)) score -= 0.12;
    if (suggestionDecision === 'identity') score -= 0.24;
  } else if (creativeState === 'refining' || creativeState === 'finished') {
    if (suggestionDecision === 'composition' || suggestionDecision === 'symbol' || suggestionDecision === 'tone') score += 0.25;
    if (suggestionDecision === 'setting' && arrival.hasSetting) score -= 0.2;
    if (suggestionDecision === 'identity' || suggestionDecision === 'action') score -= 0.2;
  } else {
    score -= 0.1;
  }

  return score;
}

function scoreEditorialUsefulness(suggestion: DreamTrailSuggestion, arrival: ArrivalState, decision: DecisionState) {
  const suggestionDecision = suggestion.decision ?? detectDecision(suggestion.text);
  const text = suggestion.text.toLowerCase();
  let score = 0;

  if (arrival.nextBestMove === 'sharpen') {
    if (suggestionDecision === 'conflict' || suggestionDecision === 'symbol') score += 0.3;
  } else if (arrival.nextBestMove === 'tighten') {
    if (suggestionDecision === 'composition' || suggestionDecision === 'symbol' || suggestionDecision === 'tone') score += 0.16;
    if (wordCount(suggestion.text) <= 8) score += 0.1;
  } else if (arrival.nextBestMove === 'generate') {
    if (suggestionDecision === 'composition' || suggestionDecision === 'symbol' || suggestionDecision === 'tone') score += 0.15;
  }

  if (decision.alreadySatisfied.includes(suggestionDecision)) score -= 0.12;
  if (suggestionDecision === 'identity' && arrival.hasIdentity) score -= 0.28;
  if (suggestionDecision === 'action' && arrival.hasAction) score -= 0.42;
  if (suggestionDecision === 'setting' && arrival.hasSetting) score -= 0.22;
  if ((arrival.nextBestMove === 'tighten' || arrival.nextBestMove === 'generate') && suggestionDecision === 'setting' && arrival.hasSetting) score -= 0.35;
  if (suggestionDecision === 'conflict' && arrival.hasConflict && arrival.hasSymbol) score -= 0.1;
  if (arrival.hasAction && /\b(guarding|defending|holding|carrying|leading|wearing)\b/.test(text)) score -= 0.16;
  if (!arrival.hasConflict && suggestionDecision === 'conflict') score += 0.22;
  if (!arrival.hasSymbol && suggestionDecision === 'symbol') score += 0.2;
  return score;
}

function orderWithTasteGravity(suggestions: DreamTrailSuggestion[], gravity: TasteGravity) {
  const sorted = [...suggestions].sort((a, b) => b.score - a.score);
  const ordered = sorted;

  if (gravity.noveltyPressure > 0.7) {
    const contrast = ordered.find((suggestion) => {
      const adjacent = gravity.dominantAxes.some((axis) => MUTATION_ADJACENCY[axis].includes(suggestion.mutation));
      return gravity.suppressedAxes.includes(suggestion.mutation) || (!gravity.dominantAxes.includes(suggestion.mutation) && !adjacent);
    });
    if (contrast) {
      const without = ordered.filter((suggestion) => suggestion !== contrast);
      without.splice(Math.min(2, without.length), 0, contrast);
      return without;
    }
  }

  return ordered;
}

function tightenPrompt(prompt: string) {
  const parts = prompt.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return prompt.trim();

  const subject = parts[0];
  const armor = parts.find((part) => /\b(amber|armor|helmet|cloak|shield|sword)\b/i.test(part));
  const action = parts.find((part) => /\b(guarding|defending|holding|carrying|leading|facing|kneeling)\b/i.test(part));
  const conflict = parts.find((part) => /\b(wasp|shadow|storm|enemy|threat|venom|gather)\b/i.test(part));
  const symbol = parts.find((part) => /\b(banner|eclipse|sunrise|sigil|relic|halo|honeycomb)\b/i.test(part));
  const location = parts.find((part) => /\b(gates|walls|hive|castle|forest|battlefield|cathedral|garden|beyond)\b/i.test(part));

  if (/bee knight/i.test(subject) && armor && action && conflict && symbol) {
    return 'bee knight guarding the hive gates in amber armor, shadow wasps gathering beneath a cracked honeycomb banner';
  }

  const lead = compactPhrase([subject, action, location && location !== action ? location : '', armor ? `in ${stripConnector(armor)}` : '']);
  const turn = compactPhrase([conflict ? sharpenConflictPhrase(conflict) : '', symbol ? landSymbolPhrase(symbol) : '']);
  return [lead, turn].filter(Boolean).join(', ') || prompt.trim();
}

function appendEditorialPhrase(prompt: string, phrase: string) {
  const cleanPrompt = prompt.trim().replace(/[.!?]+$/g, '');
  const cleanPhrase = normalizeSuggestion(phrase);
  if (!cleanPrompt) return cleanPhrase.replace(/^,\s*/, '');
  if (cleanPrompt.toLowerCase().includes(cleanPhrase.replace(/^,\s*/, '').toLowerCase())) return cleanPrompt;
  return `${cleanPrompt}${cleanPhrase}`;
}

function directionPhraseFor(prompt: string) {
  if (/\bbee\s+knight\b/i.test(prompt)) return ', guarding the hive gates';
  if (/\bbee\b/i.test(prompt)) return ', carrying a lantern';
  if (/\bforest|garden\b/i.test(prompt)) return ', following a hidden trail';
  return ', finding a small path forward';
}

function conflictPhraseFor(prompt: string) {
  if (/\bbee|hive|honey|pollen\b/i.test(prompt)) return ', as shadow wasps gather outside';
  if (/\bcastle|knight|queen|king\b/i.test(prompt)) return ', as the last gate begins to fall';
  if (/\bforest|garden\b/i.test(prompt)) return ', as something ancient wakes beneath the roots';
  return ', as the last safe path disappears';
}

function symbolPhraseFor(prompt: string) {
  if (/\bbee|hive|honey|pollen\b/i.test(prompt)) return ', beneath a cracked honeycomb banner';
  if (/\bcastle|knight|queen|king\b/i.test(prompt)) return ', beneath a torn royal standard';
  if (/\bforest|garden\b/i.test(prompt)) return ', beside a moss-covered altar stone';
  return ', beneath a single broken emblem';
}

function softerStartFor(prompt: string) {
  if (/\bbee\s+knight\b/i.test(prompt)) return 'bee knight carrying a lantern';
  if (/\bbee\b/i.test(prompt)) return 'bee carrying a lantern';
  const subject = prompt.trim().split(/[,\n]/)[0].split(/\s+/).slice(0, 4).join(' ');
  return subject ? `${subject} finding a small path` : 'a small lantern finding a path';
}

function stripConnector(value: string) {
  return value.replace(/^(,|\band\b|\bwith\b|\bbeneath\b|\bunder\b|\binside\b|\bwearing\b|\bholding\b|\bdefending\b)\s*/i, '').trim();
}

function sharpenConflictPhrase(value: string) {
  const clean = stripConnector(value);
  if (/\bgather/i.test(clean)) return clean;
  if (/\bwasp/i.test(clean) && !/\bgather/i.test(clean)) return `${clean} gathering`;
  return clean;
}

function landSymbolPhrase(value: string) {
  const clean = stripConnector(value);
  if (/^beneath\b/i.test(value.trim())) return value.trim();
  if (/\b(banner|eclipse|sunrise|halo|standard)\b/i.test(clean)) return `beneath ${clean}`;
  return clean;
}

function compactPhrase(parts: Array<string | false | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part))
    .map((part) => stripConnector(part).replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(' ')
    .replace(/\b(gates|walls|hive)\s+\1\b/gi, '$1')
    .trim();
}

function normalizeTasteVector(raw: Partial<TasteVector>): TasteVector {
  const next = {} as TasteVector;
  MUTATION_KEYS.forEach((key) => {
    next[key] = clamp01(typeof raw[key] === 'number' ? raw[key] : DEFAULT_TASTE_VECTOR[key]);
  });
  return next;
}

function migrateLegacyTaste() {
  try {
    const raw = localStorage.getItem(LEGACY_TASTE_STORAGE_KEY);
    if (!raw) return DEFAULT_TASTE_VECTOR;
    const legacy = JSON.parse(raw);
    const migrated = {
      ...DEFAULT_TASTE_VECTOR,
      mythmaking: clamp01(legacy.fantasyWeight ?? DEFAULT_TASTE_VECTOR.mythmaking),
      whimsy: clamp01(legacy.whimsicalWeight ?? DEFAULT_TASTE_VECTOR.whimsy),
      machinery: clamp01(legacy.scifiWeight ?? DEFAULT_TASTE_VECTOR.machinery),
      elegance: clamp01(legacy.realismWeight ?? DEFAULT_TASTE_VECTOR.elegance),
      grandeur: clamp01(legacy.cinematicWeight ?? DEFAULT_TASTE_VECTOR.grandeur),
      wonder: clamp01(Math.max(legacy.whimsicalWeight ?? 0, legacy.fantasyWeight ?? 0, DEFAULT_TASTE_VECTOR.wonder)),
    };
    const normalized = normalizeTasteVector(migrated);
    localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return DEFAULT_TASTE_VECTOR;
  }
}

function isMutationEvent(value: unknown): value is MutationEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as MutationEvent;
  return typeof event.sourceText === 'string'
    && typeof event.acceptedGhost === 'string'
    && isMutation(event.detectedMutation)
    && typeof event.timestamp === 'number';
}

function isMutation(value: unknown): value is TasteMutation {
  return typeof value === 'string' && (MUTATION_KEYS as readonly string[]).includes(value);
}

function isDecisionNeed(value: unknown): value is DecisionNeed {
  return typeof value === 'string' && (DECISION_KEYS as readonly string[]).includes(value);
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function wordCount(value: string) {
  return value.replace(/^[,;:]\s*/, '').replace(/-/g, ' ').split(/\s+/).filter(Boolean).length;
}

function isKeywordSoup(value: string) {
  const text = value.replace(/^,\s*/, '');
  const commaCount = (text.match(/,/g) ?? []).length;
  if (commaCount > 1) return true;
  if (commaCount === 1 && !/\b(and|with|from|under|inside|over|through|woven|grown|lit)\b/i.test(text)) return true;
  return /\b(style|aesthetic|vibes|highly|extremely|beautiful|quality|detailed)\b/i.test(text);
}

function tokenSet(value: string) {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !['with', 'and', 'the', 'for', 'from', 'style'].includes(token));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  return intersection / (a.size + b.size - intersection);
}

function endsWithConnector(value: string) {
  return /(?:,|\band|\bwith|\bof|\bin|\bon|\bthe)$/i.test(value.trim());
}

export function isLastWordComplete(prompt: string): boolean {
  const trimmed = prompt.trimEnd();
  if (trimmed.length === 0) return true;

  if (trimmed.length !== prompt.length || /[.,;:!?)\]}"']$/.test(trimmed)) {
    return true;
  }

  const match = trimmed.match(/[a-z0-9][a-z0-9'-]*$/i);
  if (!match) return false;

  const lastWord = match[0].toLowerCase().replace(/^['-]+|['-]+$/g, '');
  if (lastWord.length < 3 || SUBJECT_STOP_WORDS.has(lastWord) || /['-]$/.test(match[0])) {
    return false;
  }

  return true;
}
