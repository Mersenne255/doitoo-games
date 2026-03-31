import { ScoringState } from '../models/game.models';

const MAX_SPEED_BONUS = 50;
const SPEED_BONUS_WINDOW = 10000; // 10 seconds in ms

export function initialScoringState(): ScoringState {
  return { score: 0, streak: 0, longestStreak: 0, correctDeliveries: 0, misdeliveries: 0 };
}

export function processCorrectDelivery(
  state: ScoringState,
  spawnTime: number,
  deliveryTime: number,
): ScoringState {
  const newStreak = state.streak + 1;
  const multiplier = Math.min(newStreak, 5);
  const baseScore = 100 * multiplier;
  const elapsed = deliveryTime - spawnTime;
  const speedBonus = Math.max(0, MAX_SPEED_BONUS - (elapsed / SPEED_BONUS_WINDOW) * MAX_SPEED_BONUS);

  return {
    score: state.score + baseScore + speedBonus,
    streak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    correctDeliveries: state.correctDeliveries + 1,
    misdeliveries: state.misdeliveries,
  };
}

export function processMisdelivery(state: ScoringState): ScoringState {
  return {
    ...state,
    streak: 0,
    misdeliveries: state.misdeliveries + 1,
  };
}

export function calculateAccuracy(correct: number, misdeliveries: number): number {
  const total = correct + misdeliveries;
  if (total === 0) return 0;
  return (correct / total) * 100;
}
