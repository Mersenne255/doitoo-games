// ── game.models.ts ──

export type GameStage = 'idle' | 'countdown' | 'playing' | 'summary';

export type ModalityType = 'spatial' | 'auditory' | 'color' | 'shape';

/** Match intensity as a percentage (10–50). */
export type StimulusIntensity = number;

export const INTENSITY_OPTIONS: StimulusIntensity[] = [10, 20, 30, 40, 50];

export type ShapeType = 'circle' | 'square' | 'star' | 'triangle' | 'diamond' | 'hexagon' | 'cross';

export const SHAPES: ShapeType[] = ['circle', 'square', 'star', 'triangle', 'diamond', 'hexagon', 'cross'];

export const MODALITY_LABELS: Record<ModalityType, string> = {
  spatial: 'Position',
  auditory: 'Auditory',
  color: 'Color',
  shape: 'Shape',
};

export const MODALITY_KEYS: Record<ModalityType, string> = {
  spatial: 'a',
  shape: 's',
  color: 'd',
  auditory: 'f',
};

export interface NBackConfig {
  gridSize: number;                    // 2–5
  nLevel: number;                      // 1–20
  stepDuration: number;                // 1–10 seconds (0.5 increments)
  activeModalities: ModalityType[];    // minimum 2
  colorCount: number;                  // 2–10
  stepCount: number;                   // 5–1000
  intensity: StimulusIntensity;
}

export const DEFAULT_CONFIG: NBackConfig = {
  gridSize: 3,
  nLevel: 2,
  stepDuration: 3,
  activeModalities: ['spatial', 'auditory'],
  colorCount: 6,
  stepCount: 20,
  intensity: 30,
};

/** A single stimulus presented during one step */
export interface Stimulus {
  position: number;    // cell index (0 to gridSize²−1), always present
  letter: string;      // A–Z, always generated (used if auditory active)
  color: string;       // hex color string, always generated (used if color active)
  shape: ShapeType;    // always generated (used if shape active)
}

/** Whether a match exists for each modality at a given step */
export interface MatchFlags {
  spatial: boolean;
  auditory: boolean;
  color: boolean;
  shape: boolean;
}

/** Player's response for a single step */
export interface StepResponse {
  pressed: Set<ModalityType>;  // modalities the player indicated as match
}

/** Classification of a single modality response */
export type ResponseClass = 'hit' | 'miss' | 'false_alarm' | 'correct_rejection';

/** Per-modality score breakdown */
export interface ModalityScore {
  modality: ModalityType;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  percentage: number;  // (hits + correctRejections) / totalSteps * 100
}

/** Full session result */
export interface SessionResult {
  modalityScores: ModalityScore[];
  overallPercentage: number;  // average of modality percentages
  passed: boolean;            // overallPercentage >= 80
  nLevelSuggestion: number | null;  // +1, -1, or null
}

/** Persisted session record */
export interface SessionRecord {
  timestamp: number;
  nLevel: number;
  activeModalities: ModalityType[];
  gridSize: number;
  stepCount: number;
  intensity: StimulusIntensity;
  modalityScores: ModalityScore[];
  overallPercentage: number;
}

/** Generated sequence for a full session */
export interface GeneratedSequence {
  stimuli: Stimulus[];
  matchFlags: MatchFlags[];  // one per step, indicates if step i matches step i-N
}

export const COLOR_PALETTE: string[] = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f5f5f5', // white
];


