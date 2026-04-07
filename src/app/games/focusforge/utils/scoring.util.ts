import {
  FocusforgeConfig,
  RoundResult,
  ScoringState,
  TrialResult,
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
    totalScore: 0,
    featureSearchTotalMs: 0,
    featureSearchCount: 0,
    conjunctionSearchTotalMs: 0,
    conjunctionSearchCount: 0,
  };
}

/**
 * Processes a single trial result and returns the updated scoring state.
 *
 * - Correct: +100 base points, streak incremented.
 *   Speed bonus: +50 when responseTimeMs < responseWindowMs / 2.
 * - Incorrect: 0 points, streak reset.
 * - Timeout (tappedShapeIndex is null): 0 points, streak reset.
 */
export function processTrialResult(
  state: ScoringState,
  result: TrialResult,
  responseWindowMs: number,
): ScoringState {
  const timedOut = result.tappedShapeIndex === null;
  const responseMs = result.responseTimeMs ?? 0;

  // Split metric accumulators — only update when the player actually responded
  let featureSearchTotalMs = state.featureSearchTotalMs;
  let featureSearchCount = state.featureSearchCount;
  let conjunctionSearchTotalMs = state.conjunctionSearchTotalMs;
  let conjunctionSearchCount = state.conjunctionSearchCount;

  if (!timedOut && result.responseTimeMs !== null) {
    if (result.searchType === 'feature') {
      featureSearchTotalMs += responseMs;
      featureSearchCount += 1;
    } else {
      conjunctionSearchTotalMs += responseMs;
      conjunctionSearchCount += 1;
    }
  }

  if (timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
      featureSearchTotalMs,
      featureSearchCount,
      conjunctionSearchTotalMs,
      conjunctionSearchCount,
    };
  }

  if (!result.correct) {
    return {
      ...state,
      currentStreak: 0,
      incorrectCount: state.incorrectCount + 1,
      totalResponseTimeMs: state.totalResponseTimeMs + responseMs,
      respondedCount: state.respondedCount + 1,
      featureSearchTotalMs,
      featureSearchCount,
      conjunctionSearchTotalMs,
      conjunctionSearchCount,
    };
  }

  // Correct response
  const newStreak = state.currentStreak + 1;
  const speedBonus =
    result.responseTimeMs !== null && result.responseTimeMs < responseWindowMs / 2
      ? SPEED_BONUS_POINTS
      : 0;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    correctCount: state.correctCount + 1,
    incorrectCount: state.incorrectCount,
    timedOutCount: state.timedOutCount,
    totalResponseTimeMs: state.totalResponseTimeMs + responseMs,
    respondedCount: state.respondedCount + 1,
    totalScore: state.totalScore + BASE_CORRECT_POINTS + speedBonus,
    featureSearchTotalMs,
    featureSearchCount,
    conjunctionSearchTotalMs,
    conjunctionSearchCount,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: FocusforgeConfig,
): RoundResult {
  const totalTrials = state.correctCount + state.incorrectCount + state.timedOutCount;

  return {
    accuracy: calculateAccuracy(state.correctCount, totalTrials),
    correctCount: state.correctCount,
    incorrectCount: state.incorrectCount,
    timedOutCount: state.timedOutCount,
    averageResponseTimeMs:
      state.respondedCount > 0
        ? state.totalResponseTimeMs / state.respondedCount
        : 0,
    longestStreak: state.longestStreak,
    totalScore: state.totalScore,
    difficulty: config.difficulty,
    trialCount: config.trialCount,
    speedMode: config.speedMode,
    averageFeatureSearchMs:
      state.featureSearchCount > 0
        ? state.featureSearchTotalMs / state.featureSearchCount
        : 0,
    averageConjunctionSearchMs:
      state.conjunctionSearchCount > 0
        ? state.conjunctionSearchTotalMs / state.conjunctionSearchCount
        : 0,
  };
}

/** Returns (correct / total) * 100, or 0 if total is 0. Always in [0, 100]. */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (correct / total) * 100));
}
