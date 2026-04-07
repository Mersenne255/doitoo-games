// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Color Palette ──
export const COLOR_NAMES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type ColorName = typeof COLOR_NAMES[number];

export const COLOR_HEX: Record<ColorName, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
};

export const COLOR_DISPLAY_LABELS: Record<ColorName, string> = {
  red: 'RED',
  blue: 'BLUE',
  green: 'GREEN',
  yellow: 'YELLOW',
  purple: 'PURPLE',
  orange: 'ORANGE',
};

// ── Semantic Interference Words ──
// Words associated with a color but not the color name itself
export const SEMANTIC_WORDS: { word: string; associatedColor: ColorName }[] = [
  { word: 'SKY', associatedColor: 'blue' },
  { word: 'OCEAN', associatedColor: 'blue' },
  { word: 'GRASS', associatedColor: 'green' },
  { word: 'LEAF', associatedColor: 'green' },
  { word: 'LEMON', associatedColor: 'yellow' },
  { word: 'SUN', associatedColor: 'yellow' },
  { word: 'BLOOD', associatedColor: 'red' },
  { word: 'FIRE', associatedColor: 'red' },
  { word: 'GRAPE', associatedColor: 'purple' },
  { word: 'CARROT', associatedColor: 'orange' },
];

// ── Conflict Types ──
export type ConflictType = 'classic_stroop' | 'semantic_interference' | 'response_competition';

// ── Visual Noise Levels ──
export type VisualNoiseLevel = 'none' | 'size_variation' | 'size_rotation' | 'size_rotation_pulse';

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

export const SPEED_MODE_DELAYS: Record<SpeedMode, number> = {
  relaxed: 800,
  standard: 400,
  intense: 200,
};

// ── Difficulty Params ──
export interface DifficultyParams {
  responseWindowMs: number;
  congruentRatio: number;
  conflictTypes: ConflictType[];
  optionsCount: number;
  visualNoise: VisualNoiseLevel;
}

// ── Configuration ──
export interface ChromaclashConfig {
  difficulty: number;       // 1–20
  trialCount: number;       // 10–50, step 5
  speedMode: SpeedMode;     // relaxed | standard | intense
}

export const DEFAULT_CONFIG: ChromaclashConfig = {
  difficulty: 1,
  trialCount: 20,
  speedMode: 'standard',
};

// ── Trial ──
export interface Trial {
  /** The word displayed as the stimulus */
  word: string;
  /** The ink color the word is rendered in (this is the correct answer) */
  inkColor: ColorName;
  /** Whether this is a congruent trial */
  congruent: boolean;
  /** The conflict type for this trial */
  conflictType: ConflictType;
  /** The color options presented as buttons (one matches inkColor) */
  options: ColorName[];
  /** For response_competition: additional distractor words with their ink colors */
  distractorWords?: { word: string; inkColor: ColorName }[];
}

// ── Trial Result ──
export interface TrialResult {
  trial: Trial;
  /** The color the player selected, or null if timed out */
  selectedColor: ColorName | null;
  /** Whether the response was correct */
  correct: boolean;
  /** Response time in ms, or null if timed out */
  responseTimeMs: number | null;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;             // 0–100
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  totalScore: number;
  difficulty: number;
  trialCount: number;
  speedMode: SpeedMode;
}

// ── Scoring State (tracked during play) ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  totalResponseTimeMs: number;
  respondedCount: number;       // trials where player actually tapped (not timed out)
  totalScore: number;
}
