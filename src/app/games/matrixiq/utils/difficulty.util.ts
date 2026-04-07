import {
  DifficultyParams,
  DistractorSophistication,
  RuleType,
  SpeedMode,
} from '../models/game.models';

/**
 * Linearly interpolates between `min` and `max` based on `t` in [0, 1].
 * Result is rounded to the nearest integer.
 */
function lerp(min: number, max: number, t: number): number {
  return Math.round(min + (max - min) * t);
}

interface TierDef {
  minDifficulty: number;
  maxDifficulty: number;
  ruleCountRange: [number, number];
  allowedRuleTypes: RuleType[];
  dimensionCountRange: [number, number];
  optionCountRange: [number, number];
  distractorSophistication: DistractorSophistication;
  layerCountRange: [number, number];
}

const TIERS: TierDef[] = [
  {
    minDifficulty: 1,
    maxDifficulty: 10,
    ruleCountRange: [1, 1],
    allowedRuleTypes: ['constant', 'progression'],
    dimensionCountRange: [1, 1],
    optionCountRange: [4, 4],
    distractorSophistication: 'naive',
    layerCountRange: [1, 1],
  },
  {
    minDifficulty: 11,
    maxDifficulty: 25,
    ruleCountRange: [1, 2],
    allowedRuleTypes: ['constant', 'progression', 'cycle'],
    dimensionCountRange: [1, 2],
    optionCountRange: [4, 5],
    distractorSophistication: 'partial',
    layerCountRange: [1, 1],
  },
  {
    minDifficulty: 26,
    maxDifficulty: 45,
    ruleCountRange: [2, 3],
    allowedRuleTypes: ['constant', 'progression', 'cycle', 'distribution'],
    dimensionCountRange: [2, 3],
    optionCountRange: [5, 6],
    distractorSophistication: 'all-but-one',
    layerCountRange: [1, 1],
  },
  {
    minDifficulty: 46,
    maxDifficulty: 65,
    ruleCountRange: [3, 4],
    allowedRuleTypes: ['constant', 'progression', 'cycle', 'distribution', 'xor'],
    dimensionCountRange: [3, 4],
    optionCountRange: [6, 6],
    distractorSophistication: 'all-but-one-subtle',
    layerCountRange: [1, 1],
  },
  {
    minDifficulty: 66,
    maxDifficulty: 85,
    ruleCountRange: [4, 5],
    allowedRuleTypes: ['constant', 'progression', 'cycle', 'distribution', 'xor'],
    dimensionCountRange: [4, 5],
    optionCountRange: [6, 8],
    distractorSophistication: 'one-rule-each',
    layerCountRange: [2, 3],
  },
  {
    minDifficulty: 86,
    maxDifficulty: 100,
    ruleCountRange: [5, 6],
    allowedRuleTypes: ['constant', 'progression', 'cycle', 'distribution', 'xor'],
    dimensionCountRange: [5, 6],
    optionCountRange: [8, 8],
    distractorSophistication: 'one-rule-each-max-similarity',
    layerCountRange: [3, 4],
  },
];

/**
 * Computes the response window in milliseconds based on speed mode and difficulty.
 * - Relaxed: null (no timer)
 * - Standard: 60000ms at level 1, linearly decreasing to 20000ms at level 100
 * - Intense: 30000ms at level 1, linearly decreasing to 10000ms at level 100
 */
function computeResponseWindow(
  difficulty: number,
  speedMode: SpeedMode,
): number | null {
  if (speedMode === 'relaxed') return null;

  const t = (difficulty - 1) / 99;

  if (speedMode === 'standard') {
    return Math.round(60000 - t * (60000 - 20000));
  }

  // intense
  return Math.round(30000 - t * (30000 - 10000));
}

/**
 * Maps a difficulty level (1–100) and speed mode to puzzle generation parameters
 * using 6-tier interpolation. Input is clamped to [1, 100].
 *
 * Within each tier, numeric values (ruleCount, dimensionCount, optionCount,
 * layerCount) interpolate linearly based on position within the tier.
 */
export function mapDifficultyToParams(
  difficulty: number,
  speedMode: SpeedMode,
): DifficultyParams {
  const clamped = Math.max(1, Math.min(100, Math.round(difficulty)));

  const tier = TIERS.find(
    (t) => clamped >= t.minDifficulty && clamped <= t.maxDifficulty,
  )!;

  const range = tier.maxDifficulty - tier.minDifficulty;
  const t = range === 0 ? 0 : (clamped - tier.minDifficulty) / range;

  return {
    ruleCount: lerp(tier.ruleCountRange[0], tier.ruleCountRange[1], t),
    allowedRuleTypes: tier.allowedRuleTypes,
    dimensionCount: lerp(tier.dimensionCountRange[0], tier.dimensionCountRange[1], t),
    optionCount: lerp(tier.optionCountRange[0], tier.optionCountRange[1], t),
    distractorSophistication: tier.distractorSophistication,
    layerCount: lerp(tier.layerCountRange[0], tier.layerCountRange[1], t),
    responseWindowMs: computeResponseWindow(clamped, speedMode),
  };
}
