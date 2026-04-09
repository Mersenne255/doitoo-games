import {
  RoundResult,
  ScoringState,
  TrialResult,
  VoxelConfig,
} from '../models/game.models';

export function initialScoringState(): ScoringState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    totalCorrectCubes: 0,
    totalMissingCubes: 0,
    totalExtraCubes: 0,
    totalTargetCubes: 0,
    totalPlacedCubes: 0,
    totalAccuracy: 0,
    totalPrecision: 0,
    totalCombined: 0,
    totalBuildTimeMs: 0,
    totalStudyTimeMs: 0,
    trialCount: 0,
  };
}

export function calculateAccuracy(correct: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.max(0, (correct / target) * 100));
}

export function calculatePrecision(correct: number, placed: number): number {
  if (placed === 0) return 0;
  return Math.min(100, Math.max(0, (correct / placed) * 100));
}

export function calculateCombinedScore(accuracy: number, precision: number): number {
  return 0.7 * accuracy + 0.3 * precision;
}

export function processTrialResult(state: ScoringState, result: TrialResult): ScoringState {
  const correctCount = result.shapeDiff.correct.length;
  const missingCount = result.shapeDiff.missing.length;
  const extraCount = result.shapeDiff.extra.length;
  const targetCount = correctCount + missingCount;
  const placedCount = result.playerBuild.length;
  const newStreak = result.perfect ? state.currentStreak + 1 : 0;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    totalCorrectCubes: state.totalCorrectCubes + correctCount,
    totalMissingCubes: state.totalMissingCubes + missingCount,
    totalExtraCubes: state.totalExtraCubes + extraCount,
    totalTargetCubes: state.totalTargetCubes + targetCount,
    totalPlacedCubes: state.totalPlacedCubes + placedCount,
    totalAccuracy: state.totalAccuracy + result.accuracyScore,
    totalPrecision: state.totalPrecision + result.precisionScore,
    totalCombined: state.totalCombined + result.combinedScore,
    totalBuildTimeMs: state.totalBuildTimeMs + result.buildTimeMs,
    totalStudyTimeMs: state.totalStudyTimeMs + result.studyTimeMs,
    trialCount: state.trialCount + 1,
  };
}

export function calculateRoundResult(state: ScoringState, config: VoxelConfig): RoundResult {
  const n = state.trialCount || 1;
  return {
    averageAccuracy: state.totalAccuracy / n,
    averagePrecision: state.totalPrecision / n,
    averageCombined: state.totalCombined / n,
    totalCorrectCubes: state.totalCorrectCubes,
    totalMissingCubes: state.totalMissingCubes,
    totalExtraCubes: state.totalExtraCubes,
    longestStreak: state.longestStreak,
    averageBuildTimeSec: (state.totalBuildTimeMs / n) / 1000,
    cubeCount: config.cubeCount,
    colorCount: config.colorCount,
    symbolCount: config.symbolCount,
  };
}
