/**
 * All tunable constants for track layout generation in one place.
 * Tweak these to adjust how the board looks and feels.
 */
export const TRACK_GENERATION_DEFAULTS = {
  /** Size of one grid cell in pixels. Smaller = denser grid, larger = more spread out. */
  cellSizePx: 70,

  /** Minimum trunk length (cells from spawn to first junction). */
  trunkLenMin: 2,
  /** Maximum trunk length (cells from spawn to first junction). */
  trunkLenMax: 4,

  /** Minimum branch walk length (cells between junctions). */
  branchLenMin: 1,
  /** Maximum branch walk length (cells between junctions). */
  branchLenMax: 5,

  /** Maximum recursion depth for branching. Prevents infinite nesting. */
  maxBranchDepth: 100,

  /** Number of retry attempts when generation fails (overlap, poor distribution, etc). */
  maxRetries: 10,

  /** Time budget in ms to try generating at a given station count before reducing by 1. */
  retryTimeBudgetMs: 1000,

  /** Probability (0–1) of creating a 3-way junction when allowThreeWayJunctions is true. */
  threeWayProbability: 0.3,

  /** Minimum spatial coverage ratio for layouts with 4+ stations (0–1). */
  spatialCoverageDefault: 0.6,
  /** Relaxed spatial coverage ratio for layouts with ≤3 stations (0–1). */
  spatialCoverageSmall: 0.5,

  /** Number of grid cells to reserve in the top-left corner (for HUD numbers). */
  reservedTopLeftCols: 1,
  reservedTopLeftRows: 1,
  /** Number of grid cells to reserve in the top-right corner (for cancel button). */
  reservedTopRightCols: 1,
  reservedTopRightRows: 1,

  /** Available shape types for stations. */
  shapeTypes: ['circle', 'square', 'triangle', 'diamond', 'hexagon'] as const,

  /** Color palette for stations. */
  colorPalette: [
    '#ff0000', '#008e0d', '#000cff', '#ffcc00',
    '#f000ff',
  ] as const,

  /** Runner (shape) speed in pixels per second for each difficulty level. */
  speed: {
    slow: 30,
    medium: 60,
    fast: 100,
  } as const,
};

export type TrackGenerationDefaults = typeof TRACK_GENERATION_DEFAULTS;
