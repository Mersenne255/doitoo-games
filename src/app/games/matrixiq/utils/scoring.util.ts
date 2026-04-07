import {
  MatrixIQConfig,
  PuzzleResult,
  RoundResult,
  ScoringState,
} from '../models/game.models';

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
    correctDifficultySum: 0,
  };
}

/**
 * Processes a single puzzle result and returns the updated scoring state.
 *
 * - Correct: base score = 10 * difficultyLevel, streak incremented.
 *   Speed bonus: +50% (5 * difficultyLevel) when responseTimeMs < responseWindowMs / 3
 *   (only when responseWindowMs is not null, i.e. standard/intense modes).
 * - Incorrect: 0 points, streak reset.
 * - Timeout (selectedIndex is null): 0 points, streak reset.
 */
export function processPuzzleResult(
  state: ScoringState,
  result: PuzzleResult,
  difficultyLevel: number,
  responseWindowMs: number | null,
): ScoringState {
  const timedOut = result.selectedIndex === null;

  if (timedOut) {
    return {
      ...state,
      currentStreak: 0,
      timedOutCount: state.timedOutCount + 1,
    };
  }

  if (!result.correct) {
    return {
      ...state,
      currentStreak: 0,
      incorrectCount: state.incorrectCount + 1,
      totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
      respondedCount: state.respondedCount + 1,
    };
  }

  // Correct response
  const newStreak = state.currentStreak + 1;
  const baseScore = 10 * difficultyLevel;
  const speedBonus =
    responseWindowMs !== null &&
    result.responseTimeMs !== null &&
    result.responseTimeMs < responseWindowMs / 3
      ? 5 * difficultyLevel
      : 0;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    correctCount: state.correctCount + 1,
    incorrectCount: state.incorrectCount,
    timedOutCount: state.timedOutCount,
    totalResponseTimeMs: state.totalResponseTimeMs + (result.responseTimeMs ?? 0),
    respondedCount: state.respondedCount + 1,
    totalScore: state.totalScore + baseScore + speedBonus,
    correctDifficultySum: state.correctDifficultySum + difficultyLevel,
  };
}

/** Computes the final round result from the accumulated scoring state. */
export function calculateRoundResult(
  state: ScoringState,
  config: MatrixIQConfig,
): RoundResult {
  const totalPuzzles = state.correctCount + state.incorrectCount + state.timedOutCount;

  return {
    accuracy: calculateAccuracy(state.correctCount, totalPuzzles),
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
    puzzleCount: config.puzzleCount,
    speedMode: config.speedMode,
  };
}

/** Returns (correct / total) * 100, or 0 if total is 0. Always in [0, 100]. */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (correct / total) * 100));
}
