// ── game.models.ts ──

// ── Stage Type (6-stage lifecycle) ──
export type VoxelStage = 'idle' | 'countdown' | 'studying' | 'building' | 'comparison' | 'summary';

// ── Interaction Mode ──
export type InteractionMode = 'build' | 'remove';

// ── Color Palette (9 vivid colors from visual config) ──
export const VOXEL_COLORS = [
  '#ff0000', // red
  '#ff6a00', // orange
  '#fff200', // yellow
  '#11ff00', // green
  '#4acce1', // cyan
  '#0800ff', // blue
  '#6f00d8', // purple
  '#ff89c2', // pink
  '#f1f5f9', // white
] as const;
export type VoxelColor = typeof VOXEL_COLORS[number];

// ── Voxel Position (used for player build and shape comparison) ──
export interface VoxelPosition {
  x: number;
  y: number;
  z: number;
  color: VoxelColor;
}

// ── Voxel and Shape (compatible with shape-generator) ──
export interface Voxel {
  position: [number, number, number];
  color: VoxelColor;
}

export interface VoxelShape {
  voxels: Voxel[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

// ── Shape Diff ──
export interface ShapeDiff {
  correct: VoxelPosition[];
  missing: VoxelPosition[];
  extra: VoxelPosition[];
}

// ── Trial ──
export interface Trial {
  shape: VoxelShape;
  studyTimeSec: number | null;
  seed: number;
}

// ── Trial Result ──
export interface TrialResult {
  trial: Trial;
  playerBuild: VoxelPosition[];
  shapeDiff: ShapeDiff;
  accuracyScore: number;
  precisionScore: number;
  combinedScore: number;
  buildTimeMs: number;
  studyTimeMs: number;
  perfect: boolean;
}

// ── Configuration ──
export interface VoxelConfig {
  cubeCount: number;       // 3–30
  colorCount: number;      // 1–9 (number of distinct colors used)
}

export const DEFAULT_CONFIG: VoxelConfig = {
  cubeCount: 4,
  colorCount: 1,
};

// ── Scoring State ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  totalCorrectCubes: number;
  totalMissingCubes: number;
  totalExtraCubes: number;
  totalTargetCubes: number;
  totalPlacedCubes: number;
  totalAccuracy: number;
  totalPrecision: number;
  totalCombined: number;
  totalBuildTimeMs: number;
  totalStudyTimeMs: number;
  trialCount: number;
}

// ── Round Result ──
export interface RoundResult {
  averageAccuracy: number;
  averagePrecision: number;
  averageCombined: number;
  totalCorrectCubes: number;
  totalMissingCubes: number;
  totalExtraCubes: number;
  longestStreak: number;
  averageBuildTimeSec: number;
  cubeCount: number;
  colorCount: number;
}
