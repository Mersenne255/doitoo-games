import {
  PhantomLinkConfig,
  RoundResult,
  ScoringState,
  TrialResult,
} from '../models/game.models';

const BASE_CORRECT_POINTS = 100;
const SPEED_BONUS_POINTS = 50;

/** Returns a zeroed-out scoring state including phantom-specific fields. */
export function initialScoringState(): ScoringState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    correctCount: 0,
    incorrectCount: 0,
    timedOutCount: 0,
    phantomErrorCount: 0,
    postChangeTrialCount: 0,
    postChangeCorrectCount: 0,
    totalResponseTimeMs: 0,
    respondedCount: 0,
    totalScore: 0,
  };
}

/**
 * Processes a single trial result and returns the updated scoring state.
 *
 * - Correct: +100 base points, streak incremented.
 *   Speed bonus: +50 when responseTimeMs < responseWindowMs / 2.
 * - Incorrect: 0 points, streak reset, increment incorrectCount.
 * - Timeout (selectedColor is null): 0 points, streak reset, increment timedOutCount.
 * - Phantom errors: if result.isPhantomError is true, increment phantomErrorCount.
 * - Post-change trials: if result.trial.isPostChange, increment postChangeTrialCount;
 *   if also correct, increment postChangeCorrectCount.
 * - Response time tracked for all responded trials.
 */
export function processTrialResult(
  state: ScoringState,
  result: TrialResult,
  responseWindowMs: number,
): ScoringState {
  const timedOut = result.selectedColor === null;

  // Track phantom errors regardless of outcome type
  const phantomErrorCount = state.phantomErrorCount + (result.isPhantomError ? 1 : 0);

  // Track post-change trials regardless of outcome type
  const postChangeTrialCount =
    state.postChangeTrialCount + (result.trial.isPostChange ? 1 : 0);
  const postChangeCorrectCount =
    state.postChangeCorrectCount +
    (result.trial.isPostChange && result.correct ? 1 : 0);

  if (timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
      phantomErrorCount,
      postChangeTrialCount,
      postChangeCorrectCount,
    };
  }

  if (!result.correct) {
    return {
      ...state,
      currentStreak: 0,
      incorrectCount: state.incorrectCount + 1,
      totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
      respondedCount: state.respondedCount + 1,
      phantomErrorCount,
      postChangeTrialCount,
      postChangeCorrectCount,
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
    phantomErrorCount,
    postChangeTrialCount,
    postChangeCorrectCount,
    totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
    respondedCount: state.respondedCount + 1,
    totalScore: state.totalScore + BASE_CORRECT_POINTS + speedBonus,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: PhantomLinkConfig,
): RoundResult {
  const totalTrials = state.correctCount + state.incorrectCount + state.timedOutCount;

  const phantomResistanceRate =
    state.postChangeTrialCount > 0
      ? (state.postChangeCorrectCount / state.postChangeTrialCount) * 100
      : 0;

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
    phantomErrorCount: state.phantomErrorCount,
    phantomResistanceRate,
    totalScore: state.totalScore,
    symbolCount: config.symbolCount,
  };
}

/** Returns (correct / total) * 100, or 0 if total is 0. Always in [0, 100]. */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (correct / total) * 100));
}
