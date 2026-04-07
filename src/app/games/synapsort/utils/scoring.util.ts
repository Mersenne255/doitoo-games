import {
  RoundResult,
  ScoringState,
  SortResult,
  SynapSortConfig,
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
    perseverativeErrorCount: 0,
    rulesDiscoveredCount: 0,
    postSwitchSortCount: 0,
    postSwitchCorrectCount: 0,
    consecutiveCorrectForSwitch: 0,
    totalResponseTimeMs: 0,
    respondedCount: 0,
    totalScore: 0,
  };
}

/**
 * Processes a single sort result and returns the updated scoring state.
 *
 * - Correct: +100 base points, streak incremented.
 *   Speed bonus: +50 when responseTimeMs < responseWindowMs / 2.
 * - Incorrect: 0 points, streak reset, increment incorrectCount.
 * - Timeout (selectedPileIndex is null): 0 points, streak reset, increment timedOutCount.
 * - Perseverative errors: if result.isPerseverativeError is true, increment perseverativeErrorCount.
 * - Response time tracked for all responded (non-timeout) results.
 */
export function processSortResult(
  state: ScoringState,
  result: SortResult,
  responseWindowMs: number,
): ScoringState {
  const timedOut = result.selectedPileIndex === null;

  const perseverativeErrorCount =
    state.perseverativeErrorCount + (result.isPerseverativeError ? 1 : 0);

  if (timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
      perseverativeErrorCount,
    };
  }

  if (!result.correct) {
    return {
      ...state,
      currentStreak: 0,
      incorrectCount: state.incorrectCount + 1,
      totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
      respondedCount: state.respondedCount + 1,
      perseverativeErrorCount,
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
    perseverativeErrorCount,
    rulesDiscoveredCount: state.rulesDiscoveredCount,
    postSwitchSortCount: state.postSwitchSortCount,
    postSwitchCorrectCount: state.postSwitchCorrectCount,
    consecutiveCorrectForSwitch: state.consecutiveCorrectForSwitch,
    totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
    respondedCount: state.respondedCount + 1,
    totalScore: state.totalScore + BASE_CORRECT_POINTS + speedBonus,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: SynapSortConfig,
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
    perseverativeErrorCount: state.perseverativeErrorCount,
    rulesDiscoveredCount: state.rulesDiscoveredCount,
    totalScore: state.totalScore,
    difficulty: config.difficulty,
    cardCount: config.cardCount,
    speedMode: config.speedMode,
  };
}

/** Returns (correct / total) * 100, or 0 if total is 0. Always in [0, 100]. */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (correct / total) * 100));
}
