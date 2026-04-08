import { DifficultyParams, Operator, SpeedMode } from '../models/game.models';

/**
 * Linearly interpolates between `start` and `end` based on normalized position `t` in [0, 1].
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Maps a difficulty level (1–20) and speed mode to tier-based puzzle generation parameters.
 * Pure function — deterministic output for each input pair.
 * Input difficulty is clamped to [1, 20].
 *
 * Tiers:
 *   1–5  (beginner):     3×3, 1–9,  + only,       2–3 hidden, chained, no segments
 *   6–10 (intermediate): 3×3, 1–19, +/−,          3–4 hidden, chained, no segments
 *   11–15 (advanced):    4×4, 1–49, +/−/×,        5–8 hidden, precedence, no segments
 *   16–20 (expert):      5×5, 1–99, +/−/×/÷,     10–15 hidden, precedence, segments
 *
 * Response window:
 *   relaxed  → null (unlimited)
 *   standard → linear 120 000 ms (level 1) → 45 000 ms (level 20)
 *   intense  → linear 60 000 ms (level 1) → 20 000 ms (level 20)
 */
export function mapDifficultyToParams(difficulty: number, speedMode: SpeedMode): DifficultyParams {
  const clamped = Math.max(1, Math.min(20, Math.round(difficulty)));

  const responseWindowMs = computeResponseWindow(clamped, speedMode);

  if (clamped <= 5) {
    const t = (clamped - 1) / 4; // 1→0, 5→1
    return {
      gridSize: 3,
      numberRange: { min: 1, max: 9 },
      operatorSet: ['+'] as Operator[],
      hiddenCount: Math.round(lerp(2, 3, t)),
      chainingMode: 'chained',
      responseWindowMs,
      useSegments: false,
    };
  }

  if (clamped <= 10) {
    const t = (clamped - 6) / 4; // 6→0, 10→1
    return {
      gridSize: 3,
      numberRange: { min: 1, max: 19 },
      operatorSet: ['+', '-'] as Operator[],
      hiddenCount: Math.round(lerp(3, 4, t)),
      chainingMode: 'chained',
      responseWindowMs,
      useSegments: false,
    };
  }

  if (clamped <= 15) {
    const t = (clamped - 11) / 4; // 11→0, 15→1
    return {
      gridSize: 4,
      numberRange: { min: 1, max: 49 },
      operatorSet: ['+', '-', '*'] as Operator[],
      hiddenCount: Math.round(lerp(5, 8, t)),
      chainingMode: 'precedence',
      responseWindowMs,
      useSegments: false,
    };
  }

  // Tier 4: 16–20 (expert)
  const t = (clamped - 16) / 4; // 16→0, 20→1
  return {
    gridSize: 5,
    numberRange: { min: 1, max: 99 },
    operatorSet: ['+', '-', '*', '/'] as Operator[],
    hiddenCount: Math.round(lerp(10, 15, t)),
    chainingMode: 'precedence',
    responseWindowMs,
    useSegments: true,
  };
}

/**
 * Computes the response window in milliseconds for a given difficulty and speed mode.
 * Relaxed → null (unlimited).
 * Standard → linear interpolation from 120 000 ms (level 1) to 45 000 ms (level 20).
 * Intense  → linear interpolation from 60 000 ms (level 1) to 20 000 ms (level 20).
 */
function computeResponseWindow(difficulty: number, speedMode: SpeedMode): number | null {
  if (speedMode === 'relaxed') return null;

  const t = (difficulty - 1) / 19; // 1→0, 20→1

  if (speedMode === 'standard') {
    return Math.round(lerp(120_000, 45_000, t));
  }

  // intense
  return Math.round(lerp(60_000, 20_000, t));
}
