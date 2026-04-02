import { ConflictType, DifficultyParams } from '../models/game.models';

/**
 * Maps a difficulty level (1–20) to its corresponding DifficultyParams.
 * Input is clamped to [1, 20].
 */
export function getDifficultyParams(difficulty: number): DifficultyParams {
  const d = Math.round(Math.min(20, Math.max(1, difficulty)));

  // Response window: 3000ms at d=1, 800ms at d=20 (linear interpolation)
  const responseWindowMs = Math.round(3000 - ((d - 1) / 19) * (3000 - 800));

  // Conflict types by tier
  let conflictTypes: ConflictType[];
  if (d <= 5) {
    conflictTypes = ['stroop'];
  } else if (d <= 10) {
    conflictTypes = ['stroop', 'simon'];
  } else if (d <= 15) {
    conflictTypes = ['stroop', 'simon', 'directional'];
  } else {
    conflictTypes = ['stroop', 'simon', 'directional', 'nogo'];
  }

  // NoGo frequency: 0 for d1-10, 0.10-0.20 for d11-15, 0.20-0.30 for d16-20
  let nogoFrequency: number;
  if (d <= 10) {
    nogoFrequency = 0;
  } else if (d <= 15) {
    // Linear from 0.10 (d=11) to 0.20 (d=15)
    nogoFrequency = 0.10 + ((d - 11) / 4) * 0.10;
  } else {
    // Linear from 0.20 (d=16) to 0.30 (d=20)
    nogoFrequency = 0.20 + ((d - 16) / 4) * 0.10;
  }

  // Incongruent ratio: 0.60 at d=1, 0.75 at d=20
  const incongruentRatio = 0.60 + ((d - 1) / 19) * 0.15;

  // Rule switch interval: null for d1-15, 15 at d=16 down to 5 at d=20
  let ruleSwitchInterval: number | null;
  if (d <= 15) {
    ruleSwitchInterval = null;
  } else {
    // Linear from 15 (d=16) to 5 (d=20)
    ruleSwitchInterval = Math.round(15 - ((d - 16) / 4) * 10);
  }

  return {
    responseWindowMs,
    conflictTypes,
    nogoFrequency,
    incongruentRatio,
    ruleSwitchInterval,
    maxConsecutiveNogo: 3,
  };
}
