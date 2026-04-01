export type GameStage = 'idle' | 'countdown' | 'playing' | 'summary';

export type MathOperator = '+' | '−' | '×' | '/';

export type ProgressionSpeed = 'slow' | 'medium' | 'fast';

export interface Equation {
  operands: number[];
  operators: MathOperator[];
  correctAnswer: number;
  displayString: string;
}

export interface MathEquationsConfig {
  allowedOperators: MathOperator[]; // which ops can appear
}

export const DEFAULT_MATH_CONFIG: MathEquationsConfig = {
  allowedOperators: ['+', '−'],
};

/** Configuration for the Comet minigame */
export interface CometConfig {
  gapSize: number; // vertical gap between top and bottom barriers (pixels)
}

export const MIN_GAP_SIZE = 80;
export const MAX_GAP_SIZE = 300;
export const DEFAULT_GAP_SIZE = 250;

export const DEFAULT_COMET_CONFIG: CometConfig = {
  gapSize: DEFAULT_GAP_SIZE,
};

/** Config is now a union */
export type MinigameConfig = MathEquationsConfig | CometConfig;

export type EquationOutcome = 'correct' | 'incorrect' | 'timed_out';

export interface MinigameResult {
  slotIndex: number;
  score: number;
  total: number;
  maxDifficulty?: number;
  details: {
    correct: number;
    incorrect: number;
    timedOut: number;
  };
}

export interface SlotConfig {
  minigameId: string | null;
  config: MinigameConfig;
}

export interface MinigameRegistryEntry {
  id: string;
  name: string;
  defaultConfig: MinigameConfig;
}

export const MINIGAME_REGISTRY: MinigameRegistryEntry[] = [
  { id: 'math-equations', name: 'Equations', defaultConfig: DEFAULT_MATH_CONFIG },
  { id: 'comet', name: 'Comet', defaultConfig: DEFAULT_COMET_CONFIG },
];

/**
 * Derive equation parameters from a numeric difficulty (1–100).
 * - operandMax: scales from 10 at diff=1 to 1000 at diff=100
 * - All operands and the final result stay within [-operandMax, operandMax]
 */
export function difficultyParams(difficulty: number): { operandMax: number } {
  const d = Math.max(1, Math.min(100, difficulty));
  const operandMax = Math.round(10 + (d - 1) * (1000 - 10) / 99);
  return { operandMax };
}

/** How many seconds between each difficulty level increase */
export const PROGRESSION_INTERVAL_SEC: Record<ProgressionSpeed, number> = {
  slow: 15,
  medium: 10,
  fast: 5,
};

/**
 * Derive time limit from current difficulty.
 * Ranges from 20s at difficulty 1 to 10s at difficulty 100.
 */
export function timeLimitForDifficulty(difficulty: number): number {
  const d = Math.max(1, Math.min(100, difficulty));
  return Math.round(20 - (d - 1) * (20 - 10) / 99);
}

/** Scroll speed in pixels/second. Ranges from 40 at diff=1 to 788 at diff=100. */
export function scrollSpeedForDifficulty(difficulty: number): number {
  const d = Math.max(1, Math.min(100, difficulty));
  return Math.round(40 + (d - 1) * (788 - 40) / 99);
}

/** Gap size reduction factor. At diff=1 factor=1.0, at diff=100 factor=0.55.
 *  Applied to the configured gapSize. */
export function gapFactorForDifficulty(difficulty: number): number {
  const d = Math.max(1, Math.min(100, difficulty));
  return 1.0 - (d - 1) * 0.45 / 99;
}
