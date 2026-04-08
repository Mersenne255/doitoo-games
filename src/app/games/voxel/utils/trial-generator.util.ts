import {
  DifficultyParams,
  Projection,
  ProjectionCell,
  Trial,
  ViewDirection,
  VOXEL_COLORS,
  VoxelColor,
} from '../models/game.models';
import { mulberry32, generateShape } from './shape-generator.util';
import { computeProjection, projectionsEqual } from './projection.util';
import { validateUniqueness } from './uniqueness-validator.util';

/**
 * Fisher-Yates shuffle using the provided RNG.
 */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deep-clones a projection grid.
 */
function cloneGrid(grid: ProjectionCell[][]): ProjectionCell[][] {
  return grid.map(row => [...row]);
}

/**
 * Generates a near-miss distractor by mutating exactly one cell of the correct projection.
 *
 * Mutation types:
 * - 'remove': pick a random filled cell, set to null
 * - 'add': find empty cells adjacent to filled cells, pick one, set to filled/color
 * - 'recolor' (colorMode only): pick a random filled cell, change its color
 *
 * Falls back between add/remove if the chosen mutation is not possible.
 */
export function generateNearMissDistractor(
  correctProjection: Projection,
  rng: () => number,
  colorMode: boolean,
): Projection {
  const grid = cloneGrid(correctProjection.grid);
  const { width, height } = correctProjection;

  // Collect filled and empty-adjacent-to-filled cells
  const filledCells: [number, number][] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row][col] !== null) {
        filledCells.push([row, col]);
      }
    }
  }

  const adjacentEmptyCells: [number, number][] = [];
  const emptySet = new Set<string>();
  for (const [r, c] of filledCells) {
    const neighbors: [number, number][] = [
      [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
    ];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < height && nc >= 0 && nc < width && grid[nr][nc] === null) {
        const key = `${nr},${nc}`;
        if (!emptySet.has(key)) {
          emptySet.add(key);
          adjacentEmptyCells.push([nr, nc]);
        }
      }
    }
  }

  // Determine available mutation types
  const mutationTypes: string[] = [];
  if (filledCells.length > 1) mutationTypes.push('remove');
  if (adjacentEmptyCells.length > 0) mutationTypes.push('add');
  if (colorMode && filledCells.length > 0) mutationTypes.push('recolor');

  // Fallback: if no mutations possible (shouldn't happen for valid projections), return clone
  if (mutationTypes.length === 0) {
    return { grid, width, height };
  }

  const mutationType = mutationTypes[Math.floor(rng() * mutationTypes.length)];

  if (mutationType === 'remove') {
    const [row, col] = filledCells[Math.floor(rng() * filledCells.length)];
    grid[row][col] = null;
  } else if (mutationType === 'add') {
    const [row, col] = adjacentEmptyCells[Math.floor(rng() * adjacentEmptyCells.length)];
    if (colorMode) {
      grid[row][col] = VOXEL_COLORS[Math.floor(rng() * VOXEL_COLORS.length)] as VoxelColor;
    } else {
      grid[row][col] = 'filled';
    }
  } else {
    // recolor (colorMode only)
    const [row, col] = filledCells[Math.floor(rng() * filledCells.length)];
    const currentColor = grid[row][col] as VoxelColor;
    const otherColors = VOXEL_COLORS.filter(c => c !== currentColor);
    grid[row][col] = otherColors[Math.floor(rng() * otherColors.length)] as VoxelColor;
  }

  return { grid, width, height };
}

/**
 * Generates a deterministic sequence of trials for a Voxel round.
 *
 * Algorithm:
 * 1. Initialize RNG with seed (mulberry32)
 * 2. Create direction cycle: shuffle enabled directions, cycle through them
 * 3. Track recent correct-answer positions to enforce max 2 consecutive same position
 * 4. For each trial: generate shape, validate uniqueness, compute projections,
 *    generate distractors, assign correct position
 *
 * Pure function — same inputs always produce the same output.
 */
export function generateTrials(
  trialCount: number,
  params: DifficultyParams,
  colorMode: boolean,
  seed: number,
): Trial[] {
  const rng = mulberry32(seed);
  const trials: Trial[] = [];

  // Direction cycling: shuffle enabled directions, cycle through before repeating
  let directionCycle: ViewDirection[] = [];
  let directionIndex = 0;

  function nextDirection(): ViewDirection {
    if (directionIndex >= directionCycle.length) {
      directionCycle = shuffle(params.enabledDirections, rng);
      directionIndex = 0;
    }
    return directionCycle[directionIndex++];
  }

  // Track recent correct-answer positions for max-2-consecutive rule
  const recentPositions: number[] = [];

  for (let i = 0; i < trialCount; i++) {
    const askedDirection = nextDirection();

    // Pick random complexity within range
    const { min: cMin, max: cMax } = params.complexityRange;
    const complexity = cMin + Math.floor(rng() * (cMax - cMin + 1));

    // Generate shape with uniqueness validation (up to 10 attempts)
    let trialSeed = seed + i * 1000;
    let shape = generateShape(trialSeed, complexity, params.symmetric);
    let attempts = 0;

    while (!validateUniqueness(shape, askedDirection, colorMode) && attempts < 10) {
      attempts++;
      trialSeed += 97; // increment seed offset
      shape = generateShape(trialSeed, complexity, params.symmetric);
    }

    // Compute correct projection
    const correctProjection = computeProjection(shape, askedDirection, colorMode);

    // Generate 3 distractors
    const nearMissCount = Math.round(3 * params.nearMissRatio);
    const wrongAngleCount = 3 - nearMissCount;

    const distractors: Projection[] = [];

    // Generate near-miss distractors
    for (let nm = 0; nm < nearMissCount; nm++) {
      let distractor = generateNearMissDistractor(correctProjection, rng, colorMode);
      // Ensure distinct from correct and all existing distractors
      let retries = 0;
      while (retries < 10 && isDuplicate(distractor, correctProjection, distractors, colorMode)) {
        distractor = generateNearMissDistractor(correctProjection, rng, colorMode);
        retries++;
      }
      distractors.push(distractor);
    }

    // Generate wrong-angle distractors from other directions' projections
    const otherDirections = params.enabledDirections.filter(d => d !== askedDirection);
    const shuffledOtherDirs = shuffle(otherDirections, rng);
    let dirIdx = 0;

    for (let wa = 0; wa < wrongAngleCount; wa++) {
      let distractor: Projection | null = null;
      let retries = 0;

      while (retries < otherDirections.length + 5) {
        const dir = shuffledOtherDirs[dirIdx % shuffledOtherDirs.length];
        dirIdx++;
        const candidate = computeProjection(shape, dir, colorMode);

        if (!isDuplicate(candidate, correctProjection, distractors, colorMode)) {
          distractor = candidate;
          break;
        }
        retries++;
      }

      // If all wrong-angle attempts produce duplicates, fall back to near-miss
      if (!distractor) {
        distractor = generateNearMissDistractor(correctProjection, rng, colorMode);
        let fallbackRetries = 0;
        while (fallbackRetries < 10 && isDuplicate(distractor, correctProjection, distractors, colorMode)) {
          distractor = generateNearMissDistractor(correctProjection, rng, colorMode);
          fallbackRetries++;
        }
      }

      distractors.push(distractor);
    }

    // Assign correct projection to a random position (0-3), respecting max-2-consecutive rule
    let correctIndex = Math.floor(rng() * 4);

    if (recentPositions.length >= 2) {
      const last = recentPositions[recentPositions.length - 1];
      const secondLast = recentPositions[recentPositions.length - 2];
      if (last === secondLast && correctIndex === last) {
        // Pick a different position
        const alternatives = [0, 1, 2, 3].filter(p => p !== last);
        correctIndex = alternatives[Math.floor(rng() * alternatives.length)];
      }
    }
    recentPositions.push(correctIndex);

    // Build options array: place correct at correctIndex, distractors fill the rest
    const options: Projection[] = [];
    let dIdx = 0;
    for (let pos = 0; pos < 4; pos++) {
      if (pos === correctIndex) {
        options.push(correctProjection);
      } else {
        options.push(distractors[dIdx++]);
      }
    }

    trials.push({
      shape,
      askedDirection,
      correctProjection,
      options,
      correctIndex,
      seed: trialSeed,
    });
  }

  return trials;
}

/**
 * Checks if a candidate projection is a duplicate of the correct projection
 * or any existing distractor.
 */
function isDuplicate(
  candidate: Projection,
  correct: Projection,
  existing: Projection[],
  colorMode: boolean,
): boolean {
  if (projectionsEqual(candidate, correct, colorMode)) {
    return true;
  }
  return existing.some(d => projectionsEqual(candidate, d, colorMode));
}
