import { GameStage } from '../../../shared/models/game-stage.type';

export type { GameStage };

// ── Color Palette ──
export const COLOR_NAMES = ['red', 'blue', 'green', 'yellow'] as const;
export type ColorName = (typeof COLOR_NAMES)[number];

export const COLOR_HEX: Record<ColorName, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
};

// ── Conflict Types ──
export type ConflictType = 'stroop' | 'simon' | 'directional' | 'nogo';

// ── Stimulus Position ──
export type StimulusPosition = 'left' | 'center' | 'right';

// ── Arrow Direction ──
export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

// ── Rule Types ──
export type RuleType = 'color' | 'word' | 'direction' | 'position';

// ── Active Rule ──
export interface ActiveRule {
  type: RuleType;
  instruction: string;
  responseOptions: string[];
}

// ── Stimulus ──
export interface Stimulus {
  content: string;
  displayColor: ColorName;
  position: StimulusPosition;
  arrowDirection?: ArrowDirection;
  isNogo: boolean;
}

// ── Trial ──
export interface Trial {
  index: number;
  stimulus: Stimulus;
  conflictTypes: ConflictType[];
  isCongruent: boolean;
  correctResponse: string | null;
  activeRule: ActiveRule;
  responseWindowMs: number;
  isRuleSwitch: boolean;
}

// ── Configuration ──
export interface ReflexaConfig {
  difficulty: number;
  trialCount: number;
}

export const DEFAULT_CONFIG: ReflexaConfig = {
  difficulty: 1,
  trialCount: 30,
};

// ── Trial Outcome ──
export type TrialOutcome =
  | 'correct_go'
  | 'incorrect_go'
  | 'missed_go'
  | 'correct_nogo'
  | 'false_alarm';

// ── Trial Result ──
export interface TrialResult {
  trialIndex: number;
  outcome: TrialOutcome;
  responseTimeMs: number | null;
  isCongruent: boolean;
  conflictTypes: ConflictType[];
}

// ── Scoring State ──
export interface ScoringState {
  results: TrialResult[];
  currentStreak: number;
  longestStreak: number;
}

// ── Round Result ──
export interface RoundResult {
  totalTrials: number;
  correctGoCount: number;
  incorrectGoCount: number;
  missedGoCount: number;
  correctNogoCount: number;
  falseAlarmCount: number;
  overallAccuracy: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  interferenceScore: number;
  nogoAccuracy: number | null;
  difficulty: number;
}

// ── Difficulty Parameters ──
export interface DifficultyParams {
  responseWindowMs: number;
  conflictTypes: ConflictType[];
  nogoFrequency: number;
  incongruentRatio: number;
  ruleSwitchInterval: number | null;
  maxConsecutiveNogo: number;
}
