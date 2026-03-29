import {
  ModalityScore,
  ModalityType,
  ResponseClass,
  SessionResult,
} from '../models/game.models';

/**
 * Classify a single modality response for one step.
 * (true, true) → hit; (true, false) → miss;
 * (false, true) → false_alarm; (false, false) → correct_rejection
 */
export function classifyResponse(
  wasMatch: boolean,
  playerPressed: boolean,
): ResponseClass {
  if (wasMatch) {
    return playerPressed ? 'hit' : 'miss';
  }
  return playerPressed ? 'false_alarm' : 'correct_rejection';
}

/**
 * Calculate the score breakdown for a single modality.
 * percentage = (hits + correctRejections) / totalSteps * 100
 */
export function calculateModalityScore(
  modality: ModalityType,
  classifications: ResponseClass[],
  totalSteps: number,
): ModalityScore {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctRejections = 0;

  for (const c of classifications) {
    switch (c) {
      case 'hit':
        hits++;
        break;
      case 'miss':
        misses++;
        break;
      case 'false_alarm':
        falseAlarms++;
        break;
      case 'correct_rejection':
        correctRejections++;
        break;
    }
  }

  const percentage =
    totalSteps > 0 ? ((hits + correctRejections) / totalSteps) * 100 : 0;

  return {
    modality,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    percentage,
  };
}

/**
 * Calculate the overall session result from per-modality scores.
 * overallPercentage = average of modality percentages
 * passed = overallPercentage >= 80
 * nLevelSuggestion: >=80 → nLevel+1, <50 → max(1, nLevel-1), else null
 */
export function calculateSessionResult(
  modalityScores: ModalityScore[],
  nLevel: number,
): SessionResult {
  const overallPercentage =
    modalityScores.length > 0
      ? modalityScores.reduce((sum, s) => sum + s.percentage, 0) /
        modalityScores.length
      : 0;

  const passed = overallPercentage >= 80;

  let nLevelSuggestion: number | null = null;
  if (overallPercentage >= 80) {
    nLevelSuggestion = nLevel + 1;
  } else if (overallPercentage < 50) {
    nLevelSuggestion = Math.max(1, nLevel - 1);
  }

  return {
    modalityScores,
    overallPercentage,
    passed,
    nLevelSuggestion,
  };
}
