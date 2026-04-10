import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

// ── Board Shape ──
export type BoardShape = 'rectangular' | 'irregular';

// ── Timer Mode ──
export type TimerMode = 'off' | 'relaxed' | 'standard' | 'intense';

// ── Piece Size Range ──
export type PieceSizeRange = [number, number]; // [minSize, maxSize], e.g. [4, 4] or [5, 6]

export const PIECE_SIZE_OPTIONS: { label: string; value: PieceSizeRange }[] = [
  { label: 'Tetrominoes (4)', value: [4, 4] },
  { label: 'Pentominoes (5)', value: [5, 5] },
  { label: 'Tetrominoes + Pentominoes (4–5)', value: [4, 5] },
  { label: 'Pentominoes + Hexominoes (5–6)', value: [5, 6] },
];

// ── Piece Color Palette (15 distinct colors) ──
export const PIECE_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
  '#0ea5e9', // sky
] as const;
export type PieceColor = typeof PIECE_COLORS[number];

// ── Orientation ──
export interface Orientation {
  rotation: 0 | 1 | 2 | 3;     // 0°, 90°, 180°, 270° clockwise
  flipped: boolean;              // horizontal flip applied before rotation
}

export const IDENTITY_ORIENTATION: Orientation = { rotation: 0, flipped: false };

// ── Piece Definition (from library) ──
export interface PieceDefinition {
  id: string;                    // e.g., "T4-I", "P5-F", "H6-01"
  name: string;
  size: number;                  // number of squares
  cells: [number, number][];     // canonical [row, col] offsets
}

// ── Puzzle Piece (instance in a puzzle) ──
export interface PuzzlePiece {
  id: string;                    // unique instance ID (e.g., "piece-0", "piece-1")
  definitionId: string;          // reference to PieceDefinition.id
  cells: [number, number][];     // canonical cells from definition
  color: PieceColor;
  currentOrientation: Orientation;
}

// ── Board Layout ──
export interface BoardLayout {
  width: number;
  height: number;
  activeCells: boolean[][];      // [row][col] — true = active/fillable
}

// ── Occupancy Grid ──
export interface OccupancyGrid {
  cells: (string | null)[][];    // [row][col] — null = empty, string = piece instance ID
}

// ── Placement ──
export interface Placement {
  pieceId: string;               // puzzle piece instance ID
  anchorRow: number;
  anchorCol: number;
  orientation: Orientation;
  cells: [number, number][];     // absolute board positions occupied
}

// ── Placement Result ──
export type PlacementResult =
  | { valid: true }
  | { valid: false; reason: 'out_of_bounds' | 'inactive_cell' | 'occupied' };

// ── Solution Entry ──
export interface SolutionEntry {
  pieceId: string;
  definitionId: string;
  anchorRow: number;
  anchorCol: number;
  orientation: Orientation;
  cells: [number, number][];     // absolute positions
}

// ── Puzzle ──
export interface Puzzle {
  board: BoardLayout;
  pieces: PuzzlePiece[];
  solution: SolutionEntry[];
  seed: number;
}

// ── Placement Action (for undo/redo) ──
export type PlacementAction =
  | { type: 'place'; placement: Placement }
  | { type: 'remove'; placement: Placement };

// ── Drag State ──
export interface DragState {
  pieceId: string;
  currentRow: number;
  currentCol: number;
  orientation: Orientation;
  isValid: boolean;
}

// ── Placed Piece (on board) ──
export interface PlacedPiece {
  pieceId: string;
  definitionId: string;
  anchorRow: number;
  anchorCol: number;
  orientation: Orientation;
  cells: [number, number][];     // absolute board positions
  color: PieceColor;
  isHint: boolean;               // true if placed by hint system
}

// ── Difficulty Params ──
export interface DifficultyParams {
  pieceCount: number;
  pieceSizeRange: PieceSizeRange;
  maxPieceComplexity: number;    // size × orientations threshold
  rotationAllowed: boolean;
  flipAllowed: boolean;
}

// ── Configuration ──
export interface PolyominoConfig {
  difficulty: number;            // 1–100, controls piece complexity threshold
  pieceCount: number;            // 3–20
}

export const DEFAULT_CONFIG: PolyominoConfig = {
  difficulty: 25,
  pieceCount: 8,
};

// ── Completion Status ──
export type CompletionStatus = 'solved' | 'timed_out' | 'aborted';

// ── Puzzle Result ──
export interface PuzzleResult {
  status: CompletionStatus;
  solveTimeSec: number;
  moveCount: number;
  hintsUsed: number;
  completionScore: number;
  timeScore: number;
  efficiencyScore: number;
  difficultyBonus: number;
  combinedScore: number;
  filledRatio: number;           // 0–1, percentage of active cells filled
}

// ── Puzzle Result Params (input to scoring) ──
export interface PuzzleResultParams {
  status: CompletionStatus;
  solveTimeSec: number;
  moveCount: number;
  hintsUsed: number;
  pieceCount: number;
  difficulty: number;
  filledRatio: number;
  timeLimitSec: number | null;
}

// ── Saved Game State ──
export interface SavedGameState {
  puzzle: Puzzle;
  placedPieces: PlacedPiece[];
  unplacedPieceIds: string[];
  hintsUsed: number;
  moveCount: number;
  elapsedMs: number;
  config: PolyominoConfig;
}
