// ── game.models.ts ──

// ── Stage Type (Voxel-specific, extends shared pattern) ──
export type VoxelStage = 'idle' | 'countdown' | 'memorizing' | 'questioning' | 'summary';

// ── View Directions ──
export const VIEW_DIRECTIONS = ['front', 'back', 'left', 'right', 'top', 'bottom'] as const;
export type ViewDirection = typeof VIEW_DIRECTIONS[number];

// ── Color Palette ──
export const VOXEL_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ef4444', // red
  '#3b82f6', // blue
] as const;
export type VoxelColor = typeof VOXEL_COLORS[number];

// ── Speed Mode ──
export type SpeedMode = 'relaxed' | 'standard' | 'intense';

export const SPEED_MODE_DELAYS: Record<SpeedMode, number> = {
  relaxed: 1000,
  standard: 500,
  intense: 250,
};

// ── Voxel and Shape ──
export interface Voxel {
  position: [number, number, number]; // [x, y, z] integer coordinates
  color: VoxelColor;                  // assigned color (used in multi-color mode)
}

export interface VoxelShape {
  voxels: Voxel[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

// ── Projection ──
export type ProjectionCell = VoxelColor | 'filled' | null; // color (multi-color), 'filled' (standard), null (empty)

export interface Projection {
  grid: ProjectionCell[][];  // grid[row][col]
  width: number;
  height: number;
}

// ── Trial ──
export interface Trial {
  shape: VoxelShape;
  askedDirection: ViewDirection;
  correctProjection: Projection;
  options: Projection[];           // 4 options: 1 correct + 3 distractors
  correctIndex: number;            // index of correct option in options array
  seed: number;                    // generation seed for this trial
}

// ── Trial Result ──
export interface TrialResult {
  trial: Trial;
  selectedIndex: number | null;    // null if timed out
  correct: boolean;
  responseTimeMs: number | null;   // null if timed out
  memorizationTimeMs: number;      // time spent in memorization phase
}

// ── Difficulty Params ──
export interface DifficultyParams {
  complexityRange: { min: number; max: number }; // voxel count range
  memorizationTimeSec: number | null;             // null = unlimited
  enabledDirections: ViewDirection[];
  nearMissRatio: number;                          // 0.0–1.0, ratio of near-miss distractors
  responseWindowMs: number | null;                // null = unlimited
  symmetric: boolean;                             // whether shapes must be symmetric
}

// ── Configuration ──
export interface VoxelConfig {
  difficulty: number;          // 1–100
  trialCount: number;          // 5–20, step 5
  speedMode: SpeedMode;
  multiColorMode: boolean;
}

export const DEFAULT_CONFIG: VoxelConfig = {
  difficulty: 1,
  trialCount: 10,
  speedMode: 'standard',
  multiColorMode: false,
};

// ── Scoring State ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  totalResponseTimeMs: number;
  respondedCount: number;
  totalMemorizationTimeMs: number;
  trialCount: number;
  totalScore: number;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;                // 0–100
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  averageMemorizationTimeSec: number;
  longestStreak: number;
  totalScore: number;
  difficulty: number;
  trialCount: number;
  speedMode: SpeedMode;
  multiColorMode: boolean;
}
