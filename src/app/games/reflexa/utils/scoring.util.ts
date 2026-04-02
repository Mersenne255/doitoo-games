import { RoundResult, TrialResult } from '../models/game.models';

/**
 * Calculate the complete round result from an array of trial results.
 */
export function calculateRoundResult(results: TrialResult[], difficulty: number): RoundResult {
  const totalTrials = results.length;

  let correctGoCount = 0;
  let incorrectGoCount = 0;
  let missedGoCount = 0;
  let correctNogoCount = 0;
  let falseAlarmCount = 0;

  for (const r of results) {
    switch (r.outcome) {
      case 'correct_go': correctGoCount++; break;
      case 'incorrect_go': incorrectGoCount++; break;
      case 'missed_go': missedGoCount++; break;
      case 'correct_nogo': correctNogoCount++; break;
      case 'false_alarm': falseAlarmCount++; break;
    }
  }

  // Overall accuracy
  const overallAccuracy = totalTrials > 0
    ? ((correctGoCount + correctNogoCount) / totalTrials) * 100
    : 0;

  // Average response time (across answered Go trials)
  const answeredGoTrials = results.filter(
    r => (r.outcome === 'correct_go' || r.outcome === 'incorrect_go') && r.responseTimeMs !== null,
  );
  const averageResponseTimeMs = answeredGoTrials.length > 0
    ? answeredGoTrials.reduce((sum, r) => sum + r.responseTimeMs!, 0) / answeredGoTrials.length
    : 0;

  // Longest streak
  const longestStreak = computeLongestStreak(results);

  // Interference score: congruent accuracy - incongruent accuracy (Go trials only)
  const interferenceScore = computeInterferenceScore(results);

  // NoGo accuracy
  const totalNogo = correctNogoCount + falseAlarmCount;
  const nogoAccuracy = totalNogo > 0 ? (correctNogoCount / totalNogo) * 100 : null;

  return {
    totalTrials,
    correctGoCount,
    incorrectGoCount,
    missedGoCount,
    correctNogoCount,
    falseAlarmCount,
    overallAccuracy,
    averageResponseTimeMs,
    longestStreak,
    interferenceScore,
    nogoAccuracy,
    difficulty,
  };
}

function computeLongestStreak(results: TrialResult[]): number {
  let longest = 0;
  let current = 0;

  for (const r of results) {
    if (r.outcome === 'correct_go' || r.outcome === 'correct_nogo') {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
}

function computeInterferenceScore(results: TrialResult[]): number {
  // Only consider Go trials (not NoGo)
  const goTrials = results.filter(
    r => r.outcome === 'correct_go' || r.outcome === 'incorrect_go' || r.outcome === 'missed_go',
  );

  const congruent = goTrials.filter(r => r.isCongruent);
  const incongruent = goTrials.filter(r => !r.isCongruent);

  if (congruent.length === 0 || incongruent.length === 0) return 0;

  const congruentAccuracy =
    (congruent.filter(r => r.outcome === 'correct_go').length / congruent.length) * 100;
  const incongruentAccuracy =
    (incongruent.filter(r => r.outcome === 'correct_go').length / incongruent.length) * 100;

  return congruentAccuracy - incongruentAccuracy;
}
