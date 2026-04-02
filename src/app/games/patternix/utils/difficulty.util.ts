import { DifficultyParams, PatternixConfig } from '../models/game.models';

/**
 * Clamps a value to the range [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Maps a difficulty level (1–20) to concrete puzzle generation parameters.
 * All output parameters are monotonically non-decreasing as difficulty increases.
 *
 * - sequenceLength: 3 at difficulty 1, scaling to 6 at difficulty 20
 * - ruleCount: 1 for difficulty 1–5, up to 2 for 6–12, up to 3 for 13–20
 * - distractorCount: 3 at difficulty 1, scaling to 5 at difficulty 20
 */
export function getDifficultyParams(difficulty: number): DifficultyParams {
  const d = clamp(Math.round(difficulty), 1, 20);

  // sequenceLength: linear interpolation from 3 (d=1) to 6 (d=20), floored
  // 3 + floor((d - 1) * 3 / 19)
  const sequenceLength = 3 + Math.floor(((d - 1) * 3) / 19);

  // ruleCount: tier-based
  let ruleCount: number;
  if (d <= 5) {
    ruleCount = 1;
  } else if (d <= 12) {
    ruleCount = 2;
  } else {
    ruleCount = 3;
  }

  // distractorCount: linear interpolation from 3 (d=1) to 5 (d=20), floored
  // 3 + floor((d - 1) * 2 / 19)
  const distractorCount = 3 + Math.floor(((d - 1) * 2) / 19);

  return { sequenceLength, ruleCount, distractorCount };
}

/**
 * Validates and clamps all config values to valid ranges.
 * - difficulty: [1, 20]
 * - puzzleCount: [5, 50]
 * - timeLimitSec: [5, 60]
 * Returns a new config object with clamped values.
 */
export function validateConfig(config: PatternixConfig): PatternixConfig {
  return {
    difficulty: clamp(Math.round(config.difficulty), 1, 20),
    puzzleCount: clamp(Math.round(config.puzzleCount), 5, 50),
    timeLimitSec: clamp(Math.round(config.timeLimitSec), 5, 60),
    timedMode: config.timedMode,
  };
}
