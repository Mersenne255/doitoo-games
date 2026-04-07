import {
  DifficultyParams,
  DistractorSimilarity,
  VisualNoiseLevel,
} from '../models/game.models';

/**
 * Linearly interpolates between `start` and `end` based on position within a tier.
 * @param t Normalized position within the tier (0 = first level, 1 = last level)
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Maps a difficulty level (1–20) to tier-based gameplay parameters
 * with linear interpolation within each tier.
 * Input is clamped to [1, 20].
 */
export function mapDifficultyToParams(difficulty: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(20, Math.round(difficulty)));

  // Determine tier and normalized position within tier (0–1)
  let t: number;

  if (clamped <= 5) {
    t = (clamped - 1) / 4; // 1→0, 5→1
    return {
      fieldSize: Math.round(lerp(6, 8, t)),
      responseWindowMs: Math.round(lerp(5000, 4000, t)),
      popOutRatio: 1.0,
      distractorSimilarity: 'low' as DistractorSimilarity,
      visualNoise: 'none' as VisualNoiseLevel,
      ruleSwitchInterval: 0,
    };
  }

  if (clamped <= 10) {
    t = (clamped - 6) / 4; // 6→0, 10→1
    return {
      fieldSize: Math.round(lerp(8, 12, t)),
      responseWindowMs: Math.round(lerp(3500, 2500, t)),
      popOutRatio: Math.round(lerp(0.70, 0.50, t) * 100) / 100,
      distractorSimilarity: 'medium' as DistractorSimilarity,
      visualNoise: 'size_variation' as VisualNoiseLevel,
      ruleSwitchInterval: 0,
    };
  }

  if (clamped <= 15) {
    t = (clamped - 11) / 4; // 11→0, 15→1
    return {
      fieldSize: Math.round(lerp(12, 16, t)),
      responseWindowMs: Math.round(lerp(2200, 1500, t)),
      popOutRatio: Math.round(lerp(0.40, 0.20, t) * 100) / 100,
      distractorSimilarity: 'high' as DistractorSimilarity,
      visualNoise: 'size_rotation' as VisualNoiseLevel,
      ruleSwitchInterval: Math.round(lerp(8, 5, t)),
    };
  }

  // Tier 4: 16–20
  t = (clamped - 16) / 4; // 16→0, 20→1
  return {
    fieldSize: Math.round(lerp(16, 22, t)),
    responseWindowMs: Math.round(lerp(1200, 800, t)),
    popOutRatio: Math.round(lerp(0.10, 0.0, t) * 100) / 100,
    distractorSimilarity: 'maximum' as DistractorSimilarity,
    visualNoise: 'full' as VisualNoiseLevel,
    ruleSwitchInterval: Math.round(lerp(4, 3, t)),
  };
}
