/**
 * Tuning knobs for puzzle generation compactness.
 * Adjust these to control how "blobby" the generated board shapes are.
 */
export const GENERATOR_CONFIG = {
  /**
   * Max bounding box = sqrt(totalCells) × this multiplier.
   * Lower = tighter blob, higher = more sprawling.
   * Range: 1.0 (extremely tight) to 2.0 (very loose).
   */
  maxDimMultiplier: 1.05,

  /**
   * When picking a placement, choose from the top N% of candidates
   * sorted by contact score (shared edges with blob).
   * Lower = always picks the most compact option (less variety).
   * Higher = more variety but potentially less compact.
   * Range: 0.01 (always best) to 1.0 (fully random).
   */
  topCandidateRatio: 0.02,

  /**
   * Max retries when assembling pieces fails (e.g. too tight constraints).
   */
  maxRetries: 10,
} as const;
