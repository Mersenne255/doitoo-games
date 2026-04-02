// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Pattern Element Attributes ──

export type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star';
export const SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

export type ElementSize = 'small' | 'medium' | 'large';
export const ELEMENT_SIZES: ElementSize[] = ['small', 'medium', 'large'];

export type FillPattern = 'solid' | 'striped' | 'dotted' | 'empty';
export const FILL_PATTERNS: FillPattern[] = ['solid', 'striped', 'dotted', 'empty'];

export type Rotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export const ROTATIONS: Rotation[] = [0, 45, 90, 135, 180, 225, 270, 315];

export const COLOR_PALETTE: string[] = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];

// ── Pattern Element ──

export interface PatternElement {
  shape: ShapeType;
  color: string;
  size: ElementSize;
  rotation: Rotation;
  fill: FillPattern;
}

// ── Transformation Rules ──

export type TransformationType = 'cycle' | 'progression' | 'alternation' | 'constant';
export type TransformableAttribute = 'shape' | 'color' | 'size' | 'rotation' | 'fill';

export interface TransformationRule {
  type: TransformationType;
  attribute: TransformableAttribute;
  values: (string | number)[];
}

// ── Puzzle ──

export interface Puzzle {
  sequence: PatternElement[];
  correctAnswer: PatternElement;
  distractors: PatternElement[];
  rules: TransformationRule[];
}

export interface AnswerOption {
  element: PatternElement;
  isCorrect: boolean;
}

// ── Configuration ──

export interface PatternixConfig {
  difficulty: number;     // 1–20
  puzzleCount: number;    // 5–50
  timeLimitSec: number;   // 5–60
  timedMode: boolean;
}

export const DEFAULT_CONFIG: PatternixConfig = {
  difficulty: 1,
  puzzleCount: 10,
  timeLimitSec: 30,
  timedMode: true,
};

// ── Scoring ──

export type PuzzleOutcome = 'correct' | 'incorrect' | 'unanswered';

export interface PuzzleResult {
  outcome: PuzzleOutcome;
  responseTimeMs: number | null;
}

export interface ScoringState {
  results: PuzzleResult[];
  currentStreak: number;
  longestStreak: number;
}

export interface RoundResult {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  difficulty: number;
  totalPuzzles: number;
}

// ── Difficulty Parameters ──

export interface DifficultyParams {
  sequenceLength: number;   // 3–6
  ruleCount: number;        // 1–3
  distractorCount: number;  // 3–5
}
