import {
  BoxDimension,
  DifficultyParams,
  SpeedMode,
  TechniqueName,
} from '../models/game.models';

// ── Tier Definition ──

interface Tier {
  minLevel: number;
  maxLevel: number;
  boxDimension: BoxDimension;
  givensStart: number; // givens at start of tier (max givens, easiest)
  givensEnd: number;   // givens at end of tier (min givens, hardest)
  techniqueCeiling: TechniqueName;
}

const TIERS: Tier[] = [
  { minLevel: 1,  maxLevel: 15,  boxDimension: [2, 2], givensStart: 10, givensEnd: 7,  techniqueCeiling: 'naked_single' },
  { minLevel: 16, maxLevel: 35,  boxDimension: [2, 3], givensStart: 24, givensEnd: 17, techniqueCeiling: 'hidden_single' },
  { minLevel: 36, maxLevel: 60,  boxDimension: [3, 3], givensStart: 36, givensEnd: 28, techniqueCeiling: 'naked_pair' },
  { minLevel: 61, maxLevel: 80,  boxDimension: [3, 3], givensStart: 27, givensEnd: 23, techniqueCeiling: 'box_line_reduction' },
  { minLevel: 81, maxLevel: 100, boxDimension: [3, 3], givensStart: 22, givensEnd: 17, techniqueCeiling: 'backtrack_guess' },
];

function getTier(difficulty: number): Tier {
  const clamped = Math.max(1, Math.min(100, difficulty));
  for (const tier of TIERS) {
    if (clamped >= tier.minLevel && clamped <= tier.maxLevel) {
      return tier;
    }
  }
  return TIERS[TIERS.length - 1];
}

function gridSizeFromBox(box: BoxDimension): number {
  return box[0] * box[1];
}

/**
 * Linearly interpolate the given count within a tier.
 * At the start of the tier → givensStart (more givens, easier).
 * At the end of the tier → givensEnd (fewer givens, harder).
 */
function interpolateGivens(difficulty: number, tier: Tier): number {
  if (tier.maxLevel === tier.minLevel) return tier.givensStart;
  const t = (difficulty - tier.minLevel) / (tier.maxLevel - tier.minLevel);
  return Math.round(tier.givensStart + t * (tier.givensEnd - tier.givensStart));
}

// ── Public API ──

/**
 * Map a difficulty level (1–100) to puzzle generation parameters.
 *
 * When overrideBoxDim is provided, the box dimension is replaced and
 * the given count is scaled proportionally to the override grid size.
 */
export function mapDifficultyToParams(
  difficulty: number,
  overrideBoxDim?: BoxDimension,
): DifficultyParams {
  const clamped = Math.max(1, Math.min(100, difficulty));
  const tier = getTier(clamped);
  const interpolated = interpolateGivens(clamped, tier);

  if (overrideBoxDim) {
    const tierGridSize = gridSizeFromBox(tier.boxDimension);
    const overrideGridSize = gridSizeFromBox(overrideBoxDim);
    const totalCellsTier = tierGridSize * tierGridSize;
    const totalCellsOverride = overrideGridSize * overrideGridSize;

    // Scale givens proportionally to grid size
    const scaled = Math.round(interpolated * totalCellsOverride / totalCellsTier);

    return {
      boxDimension: overrideBoxDim,
      givenCountRange: { min: scaled, max: scaled },
      techniqueCeiling: tier.techniqueCeiling,
    };
  }

  return {
    boxDimension: tier.boxDimension,
    givenCountRange: { min: interpolated, max: interpolated },
    techniqueCeiling: tier.techniqueCeiling,
  };
}


/**
 * Calculate the time limit in seconds for a given difficulty, grid size, and speed mode.
 * Returns null for relaxed mode (no time limit).
 *
 * Formulas:
 * - relaxed:  null (unlimited)
 * - standard: gridSize² × (3 − difficulty/100)
 * - intense:  gridSize² × (1.5 − difficulty × 0.75 / 100)
 */
export function getTimeLimitSec(
  difficulty: number,
  gridSize: number,
  speedMode: SpeedMode,
): number | null {
  const clamped = Math.max(1, Math.min(100, difficulty));

  switch (speedMode) {
    case 'relaxed':
      return null;
    case 'standard':
      return gridSize * gridSize * (3 - clamped / 100);
    case 'intense':
      return gridSize * gridSize * (1.5 - clamped * 0.75 / 100);
  }
}

/**
 * Get the hint limit for a speed mode.
 * Returns null for unlimited hints (relaxed mode).
 */
export function getHintLimit(speedMode: SpeedMode): number | null {
  switch (speedMode) {
    case 'relaxed':
      return null;
    case 'standard':
      return 3;
    case 'intense':
      return 0;
  }
}
