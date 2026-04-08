// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Operators ──
export const OPERATORS = ['+', '-', '*', '/'] as const;
export type Operator = typeof OPERATORS[number];

// ── Chaining Mode ──
export type ChainingMode = 'chained' | 'precedence';

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

// ── Cell Types ──
export interface NumberCell {
  kind: 'number';
  value: number;
}

export interface HiddenCell {
  kind: 'hidden';
  solutionValue: number;
}

export type GridCell = NumberCell | HiddenCell;

// ── Equation ──
export interface Equation {
  cellIndices: [number, number][];  // positions of cells in this equation
  operators: Operator[];            // operators between adjacent cells
  result: number;                   // the displayed result value
  mode: ChainingMode;              // evaluation mode
}

// ── Puzzle ──
export interface Puzzle {
  gridSize: number;                 // 3, 4, or 5
  grid: GridCell[][];               // grid[row][col]
  rowEquations: Equation[];         // one per row
  colEquations: Equation[];         // one per column
  solution: number[][];             // complete solution grid[row][col]
  hiddenCells: [number, number][];  // positions of hidden cells
  seed: number;                     // generation seed
  chainingMode: ChainingMode;       // evaluation mode used
  numberRange: { min: number; max: number };
}

// ── Grid State (player input tracking) ──
export interface GridState {
  /** Player-entered values. null means not yet filled. Indexed by hidden cell order. */
  entries: Map<string, number | null>;  // key: "row,col"
  /** Feedback state per cell */
  feedback: Map<string, 'correct' | 'incorrect' | 'pending'>;
}

// ── Puzzle Result ──
export interface PuzzleResult {
  puzzle: Puzzle;
  /** Player's final values for each hidden cell, or null if not filled */
  playerValues: Map<string, number | null>;
  /** Whether every hidden cell was correctly filled */
  perfect: boolean;
  /** Number of correctly filled hidden cells */
  correctCellCount: number;
  /** Total hidden cells */
  totalHiddenCells: number;
  /** Solve time in ms, or null if timed out */
  solveTimeMs: number | null;
  /** Whether the puzzle timed out */
  timedOut: boolean;
}

// ── Difficulty Params ──
export interface DifficultyParams {
  gridSize: number;                 // 3, 4, or 5
  numberRange: { min: number; max: number };
  operatorSet: Operator[];
  hiddenCount: number;
  chainingMode: ChainingMode;
  responseWindowMs: number | null;  // null = unlimited (relaxed)
  useSegments: boolean;
}

// ── Configuration ──
export interface CiphergridConfig {
  difficulty: number;       // 1–20
  puzzleCount: number;      // 3–15
  speedMode: SpeedMode;
}

export const DEFAULT_CONFIG: CiphergridConfig = {
  difficulty: 1,
  puzzleCount: 5,
  speedMode: 'relaxed',
};

// ── Scoring State ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  perfectCount: number;
  imperfectCount: number;
  timedOutCount: number;
  totalSolveTimeMs: number;
  completedCount: number;       // puzzles where player filled all cells (not timed out)
  totalScore: number;
  totalCorrectCells: number;
  totalHiddenCells: number;
}

// ── Round Result ──
export interface RoundResult {
  puzzleAccuracy: number;           // 0–100 (perfect puzzles / total)
  cellAccuracy: number;             // 0–100 (correct cells / total hidden cells)
  perfectCount: number;
  imperfectCount: number;
  timedOutCount: number;
  averageSolveTimeMs: number;
  longestStreak: number;
  totalScore: number;
  difficulty: number;
  puzzleCount: number;
  speedMode: SpeedMode;
}
