import { DifficultyParams, ViewDirection } from '../models/game.models';

/** Linear interpolation: t in [0,1] maps from start to end. */
function lerp(t: number, start: number, end: number): number {
  return start + t * (end - start);
}

/**
 * Maps a difficulty level (1–100) to tier-based gameplay parameters.
 * Uses linear interpolation within each tier for smooth scaling.
 * Input is clamped to [1, 100].
 *
 * Tiers:
 *   1–25  (beginner):     complexity 3–4, memorization null→15s, front+right, 0% near-miss, no response window, symmetric
 *   26–50 (intermediate): complexity 4–6, memorization 12→8s, 4 directions, 30–50% near-miss, response 15000→10000ms
 *   51–75 (advanced):     complexity 6–9, memorization 7→5s, all 6 directions, 60–80% near-miss, response 10000→6000ms
 *   76–100 (expert):      complexity 8–12, memorization 5→3s, all 6 directions, 100% near-miss, response 6000→4000ms
 */
export function mapDifficultyToParams(difficulty: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(100, Math.round(difficulty)));

  // Beginner: 1–25
  if (clamped <= 25) {
    // Level 1 = null (unlimited), levels 2–25 linearly decrease to 15
    const memorizationTimeSec = clamped === 1
      ? null
      : Math.round(lerp((clamped - 2) / 23, 30, 15));

    return {
      complexityRange: { min: 3, max: 4 },
      memorizationTimeSec,
      enabledDirections: ['front', 'right'] as ViewDirection[],
      nearMissRatio: 0,
      responseWindowMs: null,
      symmetric: true,
    };
  }

  // Intermediate: 26–50
  if (clamped <= 50) {
    const t = (clamped - 26) / 24; // 0 at level 26, 1 at level 50
    return {
      complexityRange: { min: 4, max: 6 },
      memorizationTimeSec: Math.round(lerp(t, 12, 8)),
      enabledDirections: ['front', 'right', 'back', 'left'] as ViewDirection[],
      nearMissRatio: lerp(t, 0.3, 0.5),
      responseWindowMs: Math.round(lerp(t, 15000, 10000)),
      symmetric: false,
    };
  }

  // Advanced: 51–75
  if (clamped <= 75) {
    const t = (clamped - 51) / 24; // 0 at level 51, 1 at level 75
    return {
      complexityRange: { min: 6, max: 9 },
      memorizationTimeSec: Math.round(lerp(t, 7, 5)),
      enabledDirections: ['front', 'back', 'left', 'right', 'top', 'bottom'] as ViewDirection[],
      nearMissRatio: lerp(t, 0.6, 0.8),
      responseWindowMs: Math.round(lerp(t, 10000, 6000)),
      symmetric: false,
    };
  }

  // Expert: 76–100
  const t = (clamped - 76) / 24; // 0 at level 76, 1 at level 100
  return {
    complexityRange: { min: 8, max: 12 },
    memorizationTimeSec: Math.round(lerp(t, 5, 3)),
    enabledDirections: ['front', 'back', 'left', 'right', 'top', 'bottom'] as ViewDirection[],
    nearMissRatio: 1.0,
    responseWindowMs: Math.round(lerp(t, 6000, 4000)),
    symmetric: false,
  };
}
