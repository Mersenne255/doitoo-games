// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Shape Definitions ──
export const SHAPE_TYPES = [
  'circle', 'square', 'triangle', 'diamond', 'pentagon',
  'hexagon', 'star', 'cross', 'arrow', 'heart',
] as const;
export type ShapeType = typeof SHAPE_TYPES[number];

// ── Size ──
export const SIZES = ['small', 'medium', 'large'] as const;
export type ShapeSize = typeof SIZES[number];

// ── Rotation ──
export const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type ShapeRotation = typeof ROTATIONS[number];

// ── Fill ──
export const FILLS = ['solid', 'striped', 'dotted', 'empty'] as const;
export type ShapeFill = typeof FILLS[number];

// ── Color Palette ──
export const COLORS = [
  'red', 'blue', 'green', 'yellow',
  'purple', 'orange', 'cyan', 'white',
] as const;
export type ShapeColor = typeof COLORS[number];

export const COLOR_HEX: Record<ShapeColor, string> = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan:   '#06b6d4',
  white:  '#f8fafc',
};

// ── Counts ──
export const COUNTS = [1, 2, 3, 4] as const;
export type ShapeCount = typeof COUNTS[number];

// ── Shape Layer ──
export interface ShapeLayer {
  shape: ShapeType;
  size: ShapeSize;
  rotation: ShapeRotation;
  fill: ShapeFill;
  color: ShapeColor;
}

// ── Cell Content ──
export interface CellContent {
  layers: ShapeLayer[];
}

// ── Pattern Dimensions ──
export const DIMENSIONS = ['shape', 'size', 'rotation', 'fill', 'color', 'count'] as const;
export type PatternDimension = typeof DIMENSIONS[number];

// ── Rule Types ──
export const RULE_TYPES = ['constant', 'progression', 'cycle', 'distribution', 'xor'] as const;
export type RuleType = typeof RULE_TYPES[number];

// ── Rule Direction ──
export type RuleDirection = 'row-wise' | 'column-wise';

// ── Pattern Rule ──
export interface PatternRule {
  type: RuleType;
  dimension: PatternDimension;
  direction: RuleDirection;
  /** Layer index this rule applies to (0 for single-layer puzzles) */
  layerIndex: number;
  /** Type-specific parameters */
  params: RuleParams;
}

export type RuleParams =
  | ConstantRuleParams
  | ProgressionRuleParams
  | CycleRuleParams
  | DistributionRuleParams
  | XORRuleParams;

export interface ConstantRuleParams {
  kind: 'constant';
  /** Value per row (row-wise) or per column (column-wise): 3 values */
  values: DimensionValue[];
}

export interface ProgressionRuleParams {
  kind: 'progression';
  /** The 3-element sequence used in each row/column */
  sequence: DimensionValue[];
}

export interface CycleRuleParams {
  kind: 'cycle';
  /** The 3 values in the cycle */
  cycleValues: DimensionValue[];
  /** Starting offset per row/column: [0, 1, 2] in some permutation */
  offsets: [number, number, number];
}

export interface DistributionRuleParams {
  kind: 'distribution';
  /** The 3 distinct values distributed across each row/column */
  valueSet: DimensionValue[];
  /** Permutation per row/column: 3 permutations of [0, 1, 2] */
  permutations: [number, number, number][];
}

export interface XORRuleParams {
  kind: 'xor';
  /** The 3 values used in the XOR mapping */
  valueSet: DimensionValue[];
}

/** Union type for dimension values — the actual value depends on the dimension */
export type DimensionValue = ShapeType | ShapeSize | ShapeRotation | ShapeFill | ShapeColor | number;

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

// ── Distractor Sophistication ──
export type DistractorSophistication =
  | 'naive'
  | 'partial'
  | 'all-but-one'
  | 'all-but-one-subtle'
  | 'one-rule-each'
  | 'one-rule-each-max-similarity';

// ── Difficulty Params ──
export interface DifficultyParams {
  ruleCount: number;                        // 1–6
  allowedRuleTypes: RuleType[];
  dimensionCount: number;                   // 1–6
  optionCount: number;                      // 4–8
  distractorSophistication: DistractorSophistication;
  layerCount: number;                       // 1–4
  responseWindowMs: number | null;          // null = unlimited (relaxed)
}

// ── Configuration ──
export interface MatrixIQConfig {
  difficulty: number;       // 1–100
  puzzleCount: number;      // 5–30
  speedMode: SpeedMode;     // relaxed | standard | intense
  debugOverrides: DebugOverrides | null;
}

/** Debug overrides for manual testing — bypasses difficulty-based auto-selection */
export interface DebugOverrides {
  ruleType: RuleType | null;          // force a specific rule type (null = auto)
  dimension: PatternDimension | null; // force a specific dimension (null = auto)
  direction: RuleDirection | null;    // force a specific direction (null = auto)
  ruleCount: number | null;           // force rule count (null = auto from difficulty)
}

export const DEFAULT_CONFIG: MatrixIQConfig = {
  difficulty: 1,
  puzzleCount: 10,
  speedMode: 'standard',
  debugOverrides: null,
};

// ── Puzzle ──
export interface Puzzle {
  /** The 3×3 grid. grid[row][col]. grid[2][2] is the missing cell (null in presentation) */
  grid: CellContent[][];
  /** The correct answer for position [2,2] */
  correctAnswer: CellContent;
  /** Index of the correct answer within options */
  correctIndex: number;
  /** Shuffled answer options (includes correct answer) */
  options: CellContent[];
  /** The active pattern rules governing this puzzle */
  rules: PatternRule[];
  /** The seed used to generate this puzzle */
  seed: number;
}

// ── Puzzle Result ──
export interface PuzzleResult {
  puzzle: Puzzle;
  /** Index of the option the player selected, or null if timed out */
  selectedIndex: number | null;
  /** Whether the response was correct */
  correct: boolean;
  /** Response time in ms, or null if timed out */
  responseTimeMs: number | null;
}

// ── Feedback State ──
export interface FeedbackState {
  result: PuzzleResult;
  /** Whether the explanation is currently showing */
  showExplanation: boolean;
}

// ── Explanation Data ──
export interface ExplanationData {
  entries: ExplanationEntry[];
}

export interface ExplanationEntry {
  /** Human-readable description of the rule */
  description: string;
  /** The rule direction */
  direction: RuleDirection;
  /** Cell positions to highlight for this rule */
  highlightCells: [number, number][];
  /** Color for the highlight overlay */
  highlightColor: string;
}

// ── Scoring State ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  totalResponseTimeMs: number;
  respondedCount: number;
  totalScore: number;
  /** Sum of difficulty levels for correctly answered puzzles */
  correctDifficultySum: number;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;                 // 0–100
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  totalScore: number;
  difficulty: number;
  puzzleCount: number;
  speedMode: SpeedMode;
}
