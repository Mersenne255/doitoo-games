import {
  PuzzleResult,
  RoundResult,
  ScoringState,
} from '../models/game.models';

/**
 * Returns a fresh initial scoring state with empty results and zero streaks.
 */
export function initialScoringState(): ScoringState {
  return {
    results: [],
    currentStreak: 0,
    longestStreak: 0,
  };
}

/**
 * Returns a new ScoringState with the given result appended and streaks updated.
 * Does not mutate the input state.
 */
export function updateScoringState(
  state: ScoringState,
  result: PuzzleResult,
): ScoringState {
  const newResults = [...state.results, result];
  const newCurrentStreak =
    result.outcome === 'correct' ? state.currentStreak + 1 : 0;
  const newLongestStreak = Math.max(state.longestStreak, newCurrentStreak);

  return {
    results: newResults,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
  };
}

/**
 * Computes the final round result from an array of puzzle results and the difficulty used.
 */
export function calculateRoundResult(
  results: PuzzleResult[],
  difficulty: number,
): RoundResult {
  const totalPuzzles = results.length;

  const correctCount = results.filter((r) => r.outcome === 'correct').length;
  const incorrectCount = results.filter(
    (r) => r.outcome === 'incorrect',
  ).length;
  const unansweredCount = results.filter(
    (r) => r.outcome === 'unanswered',
  ).length;

  const accuracy = totalPuzzles > 0 ? (correctCount / totalPuzzles) * 100 : 0;

  const answeredTimes = results
    .map((r) => r.responseTimeMs)
    .filter((t): t is number => t !== null);
  const averageResponseTimeMs =
    answeredTimes.length > 0
      ? answeredTimes.reduce((sum, t) => sum + t, 0) / answeredTimes.length
      : 0;

  const longestStreak = computeLongestStreak(results);

  return {
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    averageResponseTimeMs,
    longestStreak,
    difficulty,
    totalPuzzles,
  };
}

/**
 * Computes the longest contiguous run of 'correct' outcomes.
 */
function computeLongestStreak(results: PuzzleResult[]): number {
  let longest = 0;
  let current = 0;

  for (const r of results) {
    if (r.outcome === 'correct') {
      current++;
      if (current > longest) {
        longest = current;
      }
    } else {
      current = 0;
    }
  }

  return longest;
}
