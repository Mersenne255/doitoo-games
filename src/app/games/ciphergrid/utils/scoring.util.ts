import {
  CiphergridConfig,
  DifficultyParams,
  PuzzleResult,
  RoundResult,
  ScoringState,
} from '../models/game.models';

const BASE_PERFECT_POINTS = 100;
const DIFFICULTY_MULTIPLIER = 10;
const GRID_SIZE_MULTIPLIER = 20;
const SPEED_BONUS_POINTS = 50;

/** Returns a zeroed-out scoring state. */
export function initialScoringState(): ScoringState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    perfectCount: 0,
    imperfectCount: 0,
    timedOutCount: 0,
    totalSolveTimeMs: 0,
    completedCount: 0,
    totalScore: 0,
    totalCorrectCells: 0,
    totalHiddenCells: 0,
  };
}

/**
 * Processes a single puzzle result and returns the updated scoring state.
 * Pure function.
 *
 * Scoring rules:
 * - Perfect solve: BASE_PERFECT_POINTS + (difficulty × DIFFICULTY_MULTIPLIER) + (gridSize × GRID_SIZE_MULTIPLIER)
 * - Speed bonus: +SPEED_BONUS_POINTS when perfect AND solveTimeMs < responseWindowMs / 3 (standard/intense only)
 * - Imperfect: 0 points, streak reset
 * - Timed out: 0 points, streak reset
 */
export function processPuzzleResult(
  state: ScoringState,
  result: PuzzleResult,
  params: DifficultyParams,
): ScoringState {
  const totalHiddenCells = state.totalHiddenCells + result.totalHiddenCells;
  const totalCorrectCells = state.totalCorrectCells + result.correctCellCount;

  if (result.timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
      totalHiddenCells,
      totalCorrectCells,
    };
  }

  // Player completed the puzzle (not timed out) — count solve time
  const totalSolveTimeMs = state.totalSolveTimeMs + (result.solveTimeMs ?? 0);
  const completedCount = state.completedCount + 1;

  if (!result.perfect) {
    return {
      ...state,
      currentStreak: 0,
      imperfectCount: state.imperfectCount + 1,
      totalSolveTimeMs,
      completedCount,
      totalHiddenCells,
      totalCorrectCells,
    };
  }

  // Perfect solve
  const newStreak = state.currentStreak + 1;
  const difficultyBonus = params.gridSize * GRID_SIZE_MULTIPLIER
    + (params.numberRange.max > 9 ? params.numberRange.max : 0) * DIFFICULTY_MULTIPLIER / 10;
  let puzzleScore = BASE_PERFECT_POINTS + Math.round(difficultyBonus);

  // Speed bonus: only for standard/intense, and only if solve time < 1/3 of response window
  if (
    params.responseWindowMs !== null &&
    result.solveTimeMs !== null &&
    result.solveTimeMs < params.responseWindowMs / 3
  ) {
    puzzleScore += SPEED_BONUS_POINTS;
  }

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    perfectCount: state.perfectCount + 1,
    imperfectCount: state.imperfectCount,
    timedOutCount: state.timedOutCount,
    totalSolveTimeMs,
    completedCount,
    totalScore: state.totalScore + puzzleScore,
    totalCorrectCells,
    totalHiddenCells,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: CiphergridConfig,
): RoundResult {
  const totalPuzzles = state.perfectCount + state.imperfectCount + state.timedOutCount;

  return {
    puzzleAccuracy: calculateAccuracy(state.perfectCount, totalPuzzles),
    cellAccuracy: calculateAccuracy(state.totalCorrectCells, state.totalHiddenCells),
    perfectCount: state.perfectCount,
    imperfectCount: state.imperfectCount,
    timedOutCount: state.timedOutCount,
    averageSolveTimeMs:
      state.completedCount > 0
        ? state.totalSolveTimeMs / state.completedCount
        : 0,
    longestStreak: state.longestStreak,
    totalScore: state.totalScore,
    difficulty: config.difficulty,
    puzzleCount: config.puzzleCount,
    speedMode: config.speedMode,
  };
}

/** Returns (numerator / denominator) × 100, clamped to [0, 100]. Returns 0 if denominator is 0. */
function calculateAccuracy(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.min(100, Math.max(0, (numerator / denominator) * 100));
}
