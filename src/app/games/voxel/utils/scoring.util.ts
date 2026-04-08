import {
  RoundResult,
  ScoringState,
  TrialResult,
  VoxelConfig,
} from '../models/game.models';

const BASE_CORRECT_POINTS = 100;
const SPEED_BONUS_POINTS = 50;

/** Returns a zeroed-out scoring state. */
export function initialScoringState(): ScoringState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    correctCount: 0,
    incorrectCount: 0,
    timedOutCount: 0,
    totalResponseTimeMs: 0,
    respondedCount: 0,
    totalMemorizationTimeMs: 0,
    trialCount: 0,
    totalScore: 0,
  };
}

/**
 * Processes a single trial result and returns the updated scoring state.
 *
 * - Correct: base points (100 × difficulty/10), streak incremented.
 *   Speed bonus: +50 when responseTimeMs < responseWindowMs / 2 (finite window only).
 * - Incorrect: 0 points, streak reset.
 * - Timeout (selectedIndex is null): 0 points, streak reset.
 */
export function processTrialResult(
  state: ScoringState,
  result: TrialResult,
  responseWindowMs: number | null,
): ScoringState {
  const timedOut = result.selectedIndex === null;
  const newTrialCount = state.trialCount + 1;
  const newTotalMemorizationTimeMs = state.totalMemorizationTimeMs + result.memorizationTimeMs;

  if (timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
      totalMemorizationTimeMs: newTotalMemorizationTimeMs,
      trialCount: newTrialCount,
    };
  }

  if (!result.correct) {
    return {
      ...state,
      currentStreak: 0,
      incorrectCount: state.incorrectCount + 1,
      totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
      respondedCount: state.respondedCount + 1,
      totalMemorizationTimeMs: newTotalMemorizationTimeMs,
      trialCount: newTrialCount,
    };
  }

  // Correct response
  const newStreak = state.currentStreak + 1;
  const speedBonus =
    responseWindowMs !== null &&
    isFinite(responseWindowMs) &&
    result.responseTimeMs !== null &&
    result.responseTimeMs < responseWindowMs / 2
      ? SPEED_BONUS_POINTS
      : 0;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    correctCount: state.correctCount + 1,
    incorrectCount: state.incorrectCount,
    timedOutCount: state.timedOutCount,
    totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
    respondedCount: state.respondedCount + 1,
    totalMemorizationTimeMs: newTotalMemorizationTimeMs,
    trialCount: newTrialCount,
    totalScore: state.totalScore + BASE_CORRECT_POINTS + speedBonus,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: VoxelConfig,
): RoundResult {
  return {
    accuracy: calculateAccuracy(state.correctCount, state.trialCount),
    correctCount: state.correctCount,
    incorrectCount: state.incorrectCount,
    timedOutCount: state.timedOutCount,
    averageResponseTimeMs:
      state.respondedCount > 0
        ? state.totalResponseTimeMs / state.respondedCount
        : 0,
    averageMemorizationTimeSec:
      state.trialCount > 0
        ? (state.totalMemorizationTimeMs / state.trialCount) / 1000
        : 0,
    longestStreak: state.longestStreak,
    totalScore: state.totalScore,
    difficulty: config.difficulty,
    trialCount: config.trialCount,
    speedMode: config.speedMode,
    multiColorMode: config.multiColorMode,
  };
}

/** Returns (correct / total) × 100, or 0 if total is 0. Always in [0, 100]. */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (correct / total) * 100));
}
