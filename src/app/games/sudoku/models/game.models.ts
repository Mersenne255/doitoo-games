import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Box Dimension ──
export type BoxDimension = [number, number]; // [boxRows, boxCols]

export const BOX_DIMENSIONS: { label: string; value: BoxDimension }[] = [
  { label: '2×2 (4×4 grid)', value: [2, 2] },
  { label: '2×3 (6×6 grid)', value: [2, 3] },
  { label: '3×3 (9×9 grid)', value: [3, 3] },
];

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

// ── Technique Names ──
export type TechniqueName =
  | 'naked_single'
  | 'hidden_single'
  | 'naked_pair'
  | 'pointing_pair'
  | 'box_line_reduction'
  | 'backtrack_guess';

export const TECHNIQUE_ORDER: TechniqueName[] = [
  'naked_single',
  'hidden_single',
  'naked_pair',
  'pointing_pair',
  'box_line_reduction',
  'backtrack_guess',
];

// ── Cell Position ──
export interface CellPosition {
  row: number;
  col: number;
}

// ── Cell State (player grid) ──
export interface CellState {
  value: number;              // 0 = empty, 1–gridSize = filled
  pencilMarks: Set<number>;   // candidate digits
  isGiven: boolean;           // true if pre-filled by generator
}

// ── Solve Step (from Explainer) ──
export interface SolveStep {
  technique: TechniqueName;
  cells: CellPosition[];
  digit?: number;
  eliminations?: { cell: CellPosition; digits: number[] }[];
  explanation: string;
}

// ── Puzzle ──
export interface Puzzle {
  grid: number[][];           // 0 = empty, 1–gridSize = given
  solution: number[][];       // complete valid solution
  boxRows: number;
  boxCols: number;
}

// ── Action Record (for undo/redo) ──
export interface ActionRecord {
  cell: CellPosition;
  previousValue: number;
  previousPencilMarks: number[];  // serialized from Set
  newValue: number;
  newPencilMarks: number[];
}

// ── Difficulty Params ──
export interface DifficultyParams {
  boxDimension: BoxDimension;
  givenCountRange: { min: number; max: number };
  techniqueCeiling: TechniqueName;
}

// ── Configuration ──
export interface SudokuConfig {
  difficulty: number;           // 1–100
  puzzleCount: number;          // 1–10
  boxDimension: BoxDimension;   // player override (or default from difficulty)
  speedMode: SpeedMode;
  errorHighlighting: boolean;
}

export const DEFAULT_CONFIG: SudokuConfig = {
  difficulty: 50,
  puzzleCount: 3,
  boxDimension: [3, 3],
  speedMode: 'standard',
  errorHighlighting: true,
};

// ── Completion Status ──
export type CompletionStatus = 'solved' | 'timed_out' | 'gave_up';

// ── Puzzle Result ──
export interface PuzzleResult {
  status: CompletionStatus;
  solveTimeSec: number;
  hintsUsed: number;
  errorCount: number;
}

// ── Scoring State ──
export interface ScoringState {
  puzzlesSolved: number;
  puzzlesTimedOut: number;
  puzzlesGaveUp: number;
  totalSolveTimeSec: number;
  totalHintsUsed: number;
  totalErrors: number;
  currentNoHintStreak: number;
  longestNoHintStreak: number;
  puzzleCount: number;
}

// ── Round Result ──
export interface RoundResult {
  puzzlesSolved: number;
  totalPuzzles: number;
  averageSolveTimeSec: number;
  totalHintsUsed: number;
  longestNoHintStreak: number;
  accuracy: number;             // 0–100 (solved / total × 100)
  difficulty: number;
  boxDimension: BoxDimension;
  speedMode: SpeedMode;
}
