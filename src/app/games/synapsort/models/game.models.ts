// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Shape Definitions ──
export const SHAPE_NAMES = [
  'circle', 'triangle', 'square', 'diamond', 'star', 'hexagon',
] as const;
export type ShapeName = typeof SHAPE_NAMES[number];

// ── Color Palette ──
export const COLOR_NAMES = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink',
] as const;
export type ColorName = typeof COLOR_NAMES[number];

export const COLOR_HEX: Record<ColorName, string> = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan:   '#06b6d4',
  pink:   '#ec4899',
};

// ── Count Range ──
export const MIN_COUNT = 1;
export const MAX_COUNT = 4;

// ── Conflict Types (Sorting Rules) ──
export type ConflictType = 'shape' | 'color' | 'count' | 'compound';

// ── Compound Rule Definition ──
export interface CompoundRule {
  attributes: ('shape' | 'color' | 'count')[];  // exactly 2 attributes
}

// ── Visual Noise Levels ──
export type VisualNoiseLevel = 'none' | 'size_variation' | 'size_variation_rotation';

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

export const SPEED_MODE_DELAYS: Record<SpeedMode, number> = {
  relaxed:  800,
  standard: 400,
  intense:  200,
};

// ── Distractor Quality ──
export type DistractorQuality = 'low' | 'medium' | 'high' | 'maximum';

// ── Difficulty Params ──
export interface DifficultyParams {
  responseWindowMs: number;              // 1500–5000
  enabledRules: ConflictType[];          // which sort rules are active
  switchThresholdMin: number;            // min consecutive correct before switch
  switchThresholdMax: number;            // max consecutive correct before switch
  pileCount: number;                     // 3 or 4
  distractorQuality: DistractorQuality;  // how similar piles are to each other
  visualNoise: VisualNoiseLevel;         // visual effects on card shapes
}

// ── Configuration ──
export interface SynapSortConfig {
  difficulty: number;       // 1–20
  cardCount: number;        // 15–40, step 5
  speedMode: SpeedMode;     // relaxed | standard | intense
}

export const DEFAULT_CONFIG: SynapSortConfig = {
  difficulty: 1,
  cardCount: 25,
  speedMode: 'standard',
};

// ── Card ──
export interface Card {
  shape: ShapeName;
  color: ColorName;
  count: number;            // 1–4
}

// ── Pile (Reference Card) ──
export interface Pile {
  referenceCard: Card;
}

// ── Rule Schedule Entry ──
export interface RuleScheduleEntry {
  /** The conflict type active for this segment */
  rule: ConflictType;
  /** For compound rules, which two attributes */
  compoundRule?: CompoundRule;
  /** Number of consecutive correct sorts before switching to next rule */
  switchThreshold: number;
}

// ── Sort Attempt (pre-generated) ──
export interface SortAttempt {
  /** The card displayed to the player */
  card: Card;
  /** Index of the correct pile under each possible rule */
  correctPileByRule: Record<ConflictType, number>;
  /** Whether this card is ambiguous (matches multiple piles on different attributes) */
  isAmbiguous: boolean;
  /** Whether this card immediately follows a rule switch */
  isPostSwitch: boolean;
}

// ── Sort Result (recorded during play) ──
export interface SortResult {
  sortAttempt: SortAttempt;
  /** Index of the pile the player tapped, or null if timed out */
  selectedPileIndex: number | null;
  /** Whether the response was correct under the active rule */
  correct: boolean;
  /** Whether this was a perseverative error */
  isPerseverativeError: boolean;
  /** Response time in ms, or null if timed out */
  responseTimeMs: number | null;
}

// ── Round Structure (output of card generator) ──
export interface RoundStructure {
  /** The piles (reference cards) for this round */
  piles: Pile[];
  /** The ordered sequence of sort attempts */
  sortAttempts: SortAttempt[];
  /** The rule schedule (sequence of rules with switch thresholds) */
  ruleSchedule: RuleScheduleEntry[];
}

// ── Feedback State ──
export interface FeedbackState {
  correct: boolean;
  isPerseverativeError: boolean;
  selectedPileIndex: number;
  correctPileIndex: number;
}

// ── Scoring State (tracked during play) ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  perseverativeErrorCount: number;
  rulesDiscoveredCount: number;
  postSwitchSortCount: number;
  postSwitchCorrectCount: number;
  consecutiveCorrectForSwitch: number;  // tracks progress toward next rule switch
  totalResponseTimeMs: number;
  respondedCount: number;
  totalScore: number;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;                     // 0–100
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  perseverativeErrorCount: number;
  rulesDiscoveredCount: number;
  totalScore: number;
  difficulty: number;
  cardCount: number;
  speedMode: SpeedMode;
}
