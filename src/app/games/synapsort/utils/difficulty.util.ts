import {
  ConflictType,
  DistractorQuality,
  DifficultyParams,
  VisualNoiseLevel,
} from '../models/game.models';

/**
 * Linearly interpolate between two values based on position within a 5-level tier.
 * @param start Value at the first level of the tier
 * @param end Value at the last level of the tier
 * @param position 0-based position within the tier (0–4)
 */
function lerp(start: number, end: number, position: number): number {
  return Math.round(start + (end - start) * (position / 4));
}

/**
 * Maps a difficulty level (1–20) to tier-based gameplay parameters
 * with linear interpolation within each tier.
 *
 * Monotonicity guarantee: higher difficulty produces equal or harder
 * params on every axis (response window non-increasing, switch threshold
 * max non-increasing, pile count non-decreasing, distractor quality
 * non-decreasing).
 *
 * Input is clamped to [1, 20].
 */
export function mapDifficultyToParams(difficulty: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(20, Math.round(difficulty)));

  // Beginner: levels 1–5
  if (clamped <= 5) {
    const pos = clamped - 1; // 0–4
    return {
      responseWindowMs: lerp(5000, 4000, pos),
      enabledRules: ['shape', 'color'] as ConflictType[],
      switchThresholdMin: 6,
      switchThresholdMax: 8,
      pileCount: 3,
      distractorQuality: 'low' as DistractorQuality,
      visualNoise: 'none' as VisualNoiseLevel,
    };
  }

  // Intermediate: levels 6–10
  if (clamped <= 10) {
    const pos = clamped - 6; // 0–4
    return {
      responseWindowMs: lerp(3500, 2500, pos),
      enabledRules: ['shape', 'color', 'count'] as ConflictType[],
      switchThresholdMin: 5,
      switchThresholdMax: 7,
      pileCount: 4,
      distractorQuality: 'medium' as DistractorQuality,
      visualNoise: 'none' as VisualNoiseLevel,
    };
  }

  // Advanced: levels 11–15
  if (clamped <= 15) {
    const pos = clamped - 11; // 0–4
    return {
      responseWindowMs: lerp(2200, 1800, pos),
      enabledRules: ['shape', 'color', 'count', 'compound'] as ConflictType[],
      switchThresholdMin: 4,
      switchThresholdMax: 6,
      pileCount: 4,
      distractorQuality: 'high' as DistractorQuality,
      visualNoise: 'size_variation' as VisualNoiseLevel,
    };
  }

  // Expert: levels 16–20
  const pos = clamped - 16; // 0–4
  return {
    responseWindowMs: lerp(1700, 1500, pos),
    enabledRules: ['shape', 'color', 'count', 'compound'] as ConflictType[],
    switchThresholdMin: 3,
    switchThresholdMax: 4,
    pileCount: 4,
    distractorQuality: 'maximum' as DistractorQuality,
    visualNoise: 'size_variation_rotation' as VisualNoiseLevel,
  };
}
