import { ConflictType, DifficultyParams, VisualNoiseLevel } from '../models/game.models';

/**
 * Maps a difficulty level (1–20) to tier-based gameplay parameters.
 * Input is clamped to [1, 20].
 */
export function mapDifficultyToParams(difficulty: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(20, Math.round(difficulty)));

  if (clamped <= 5) {
    return {
      responseWindowMs: 3000,
      congruentRatio: 0.40,
      conflictTypes: ['classic_stroop'] as ConflictType[],
      optionsCount: 3,
      visualNoise: 'none' as VisualNoiseLevel,
    };
  }

  if (clamped <= 10) {
    return {
      responseWindowMs: 2000,
      congruentRatio: 0.30,
      conflictTypes: ['classic_stroop', 'semantic_interference'] as ConflictType[],
      optionsCount: 4,
      visualNoise: 'size_variation' as VisualNoiseLevel,
    };
  }

  if (clamped <= 15) {
    return {
      responseWindowMs: 1200,
      congruentRatio: 0.20,
      conflictTypes: ['classic_stroop', 'semantic_interference', 'response_competition'] as ConflictType[],
      optionsCount: 5,
      visualNoise: 'size_rotation' as VisualNoiseLevel,
    };
  }

  return {
    responseWindowMs: 800,
    congruentRatio: 0.10,
    conflictTypes: ['classic_stroop', 'semantic_interference', 'response_competition'] as ConflictType[],
    optionsCount: 6,
    visualNoise: 'size_rotation_pulse' as VisualNoiseLevel,
  };
}
