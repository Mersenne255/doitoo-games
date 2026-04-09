// ── game.models.ts ──

// ── Stage Type (6-stage lifecycle) ──
export type VoxelStage = 'idle' | 'countdown' | 'studying' | 'building' | 'comparison' | 'summary';

// ── Interaction Mode ──
export type InteractionMode = 'build' | 'remove';

// ── Color Palette (9 vivid colors, ordered for maximal distinction) ──
export const VOXEL_COLORS = [
  '#b40000ff', // red
  '#0600c0ff', // blue
  '#0a9100ff', // green
  '#ff6a00', // orange
  '#6f00d8', // purple
  '#4acce1', // cyan
  '#e0d500ff', // yellow
  '#d63c87ff', // pink
] as const;
export type VoxelColor = typeof VOXEL_COLORS[number];
export const MAX_COLORS = VOXEL_COLORS.length;

// ── Symbol Palette (9 distinct symbols for cube faces) ──
export const VOXEL_SYMBOLS = ['★', '●', '▲', '■', '♦', '♠', '♣', '♥'] as const;
export type VoxelSymbol = typeof VOXEL_SYMBOLS[number];
export const MAX_SYMBOLS = VOXEL_SYMBOLS.length;

// ── Voxel Position (used for player build and shape comparison) ──
export interface VoxelPosition {
  x: number;
  y: number;
  z: number;
  color: VoxelColor;
  symbol: VoxelSymbol | null;
}

// ── Voxel and Shape (compatible with shape-generator) ──
export interface Voxel {
  position: [number, number, number];
  color: VoxelColor;
  symbol: VoxelSymbol | null;
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
  cubeCount: number;       // 3–50
  colorCount: number;      // 1–9 (number of distinct colors used)
  symbolCount: number;     // 1–9, where 1 means no symbols shown
}

export const DEFAULT_CONFIG: VoxelConfig = {
  cubeCount: 4,
  colorCount: 1,
  symbolCount: 1,
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
  symbolCount: number;
}
