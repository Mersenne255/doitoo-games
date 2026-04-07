import {
  CellContent,
  COLORS,
  DebugOverrides,
  DIMENSIONS,
  DifficultyParams,
  DimensionValue,
  FILLS,
  PatternDimension,
  PatternRule,
  Puzzle,
  ROTATIONS,
  RuleDirection,
  RuleType,
  SHAPE_TYPES,
  SIZES,
} from '../models/game.models';
import { mulberry32, pickN, pickRandom, shuffle } from './prng.util';
import { applyRule, createEmptyCell, setDimensionValue } from './rule-engine.util';
import { generateDistractors } from './distractor-generator.util';
import { validatePuzzle } from './puzzle-validator.util';

// ── Dimension value palettes ──

const DIMENSION_PALETTES: Record<PatternDimension, readonly DimensionValue[]> = {
  shape: SHAPE_TYPES,
  size: SIZES,
  rotation: ROTATIONS,
  fill: FILLS,
  color: COLORS,
  count: [1, 2, 3, 4],
};

/**
 * Returns the available values for a dimension.
 */
function getValuesForDimension(dimension: PatternDimension): readonly DimensionValue[] {
  return DIMENSION_PALETTES[dimension];
}

/**
 * All 6 permutations of [0, 1, 2].
 */
const ALL_PERMUTATIONS: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Generates 3 distinct permutations of [0, 1, 2] using the RNG.
 */
function generatePermutations(rng: () => number): [number, number, number][] {
  const picked = pickN(ALL_PERMUTATIONS, 3, rng);
  return picked as [number, number, number][];
}

/**
 * Generates type-specific parameters for a rule type + dimension combination.
 */
function generateRuleParams(
  ruleType: RuleType,
  dimension: PatternDimension,
  rng: () => number,
): PatternRule['params'] {
  const palette = getValuesForDimension(dimension);

  switch (ruleType) {
    case 'constant': {
      // Pick 3 values from the palette (one per group/row/column)
      if (dimension === 'count') {
        const vals = pickN([1, 2, 3, 4] as DimensionValue[], 3, rng);
        return { kind: 'constant', values: vals };
      }
      const values = pickN(palette, 3, rng);
      return { kind: 'constant', values };
    }

    case 'progression': {
      // Pick a 3-element ordered sequence
      if (dimension === 'size') {
        return { kind: 'progression', sequence: ['small', 'medium', 'large'] };
      }
      if (dimension === 'count') {
        return { kind: 'progression', sequence: [1, 2, 3] };
      }
      if (dimension === 'rotation') {
        // Use 90° increments only — 45° is too subtle
        const start = pickRandom([0, 90, 180, 270] as const, rng);
        const sequence: DimensionValue[] = [
          start,
          ((start + 90) % 360) as DimensionValue,
          ((start + 180) % 360) as DimensionValue,
        ];
        return { kind: 'progression', sequence };
      }
      // For shape, fill, color: pick 3 values ordered by index in their array
      const indices = pickN(
        Array.from({ length: palette.length }, (_, i) => i),
        3,
        rng,
      ).sort((a, b) => a - b);
      const sequence = indices.map((i) => palette[i]);
      return { kind: 'progression', sequence };
    }

    case 'cycle': {
      // Pick 3 values and 3 offsets (a permutation of [0,1,2])
      const cycleValues = pickN(palette, 3, rng);
      const offsets = pickRandom(ALL_PERMUTATIONS, rng) as [number, number, number];
      return { kind: 'cycle', cycleValues, offsets };
    }

    case 'distribution': {
      // Pick 3 distinct values and 3 distinct permutations of [0,1,2]
      const valueSet = pickN(palette, 3, rng);
      const permutations = generatePermutations(rng);
      return { kind: 'distribution', valueSet, permutations };
    }

    case 'xor': {
      // Pick 3 distinct values from the dimension's palette
      const valueSet = pickN(palette, 3, rng);
      return { kind: 'xor', valueSet };
    }
  }
}

/**
 * Dimensions that produce the most visually obvious differences, ordered by impact.
 * rotation and count are excluded — rotation needs an asymmetric shape to be visible,
 * and count changes layer count which is confusing at low difficulty.
 */
const HIGH_IMPACT_DIMENSIONS: PatternDimension[] = ['shape', 'color', 'fill', 'size'];

/** Shapes that look clearly different when rotated (strongly asymmetric) */
const ASYMMETRIC_SHAPES: DimensionValue[] = ['arrow', 'triangle', 'cross', 'star', 'pentagon'];

/**
 * Sets non-governed dimensions to sensible consistent values across the
 * entire grid so the puzzle looks clean. Only the governed dimensions vary.
 */
function randomizeBackgroundDimensions(
  grid: CellContent[][],
  governedDimensions: PatternDimension[],
  layerCount: number,
  rng: () => number,
): CellContent[][] {
  const nonGoverned = DIMENSIONS.filter(d => !governedDimensions.includes(d) && d !== 'count');
  let result = grid.map(row => row.map(cell => ({ layers: cell.layers.map(l => ({ ...l })) })));

  for (const dim of nonGoverned) {
    let value: DimensionValue;
    switch (dim) {
      case 'size':
        value = 'medium';
        break;
      case 'fill':
        // Use empty (outline) for rotation puzzles so the shape direction is clear
        value = governedDimensions.includes('rotation') ? 'empty' : 'solid';
        break;
      case 'rotation':
        value = 0;
        break;
      case 'shape':
        // If rotation is governed, pick an asymmetric shape so rotation is visible
        if (governedDimensions.includes('rotation')) {
          value = pickRandom(ASYMMETRIC_SHAPES, rng);
        } else {
          value = pickRandom(DIMENSION_PALETTES[dim], rng);
        }
        break;
      case 'color':
        // Avoid red — pick from a curated set of visible colors on dark bg
        value = pickRandom(['blue', 'green', 'cyan', 'purple', 'yellow'] as DimensionValue[], rng);
        break;
      default: {
        const palette = DIMENSION_PALETTES[dim];
        value = pickRandom(palette, rng);
        break;
      }
    }
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        for (let layer = 0; layer < Math.min(layerCount, result[row][col].layers.length); layer++) {
          result[row][col] = setDimensionValue(result[row][col], dim, layer, value);
        }
      }
    }
  }

  return result;
}

/**
 * Generates a single puzzle from a seed, difficulty level, and difficulty params.
 *
 * Algorithm:
 * 1. Initialize RNG from seed
 * 2. Select dimensions and rule types
 * 3. Assign directions ensuring diversity
 * 4. Generate rule parameters
 * 5. Handle multi-layer assignment
 * 6. Build grid, extract answer, generate distractors
 * 7. Validate and retry if needed
 */
export function generatePuzzle(
  seed: number,
  difficulty: number,
  params: DifficultyParams,
  debugOverrides?: DebugOverrides | null,
): Puzzle {
  void difficulty;
  const overrideRuleCount = debugOverrides?.ruleCount ?? null;
  let currentRuleCount = Math.min(overrideRuleCount ?? params.ruleCount, DIMENSIONS.length);

  // Outer retry loop: reduce ruleCount on total failure
  while (currentRuleCount >= 1) {
    // Inner retry loop: increment seed offset
    for (let attempt = 0; attempt < 10; attempt++) {
      const rng = mulberry32(seed + attempt);

      // Step 2: Select dimensions — use override if provided, else prefer high-impact
      let selectedDimensions: PatternDimension[];
      if (debugOverrides?.dimension) {
        // Force the specified dimension, fill remaining with random
        selectedDimensions = [debugOverrides.dimension];
        if (currentRuleCount > 1) {
          const remaining = DIMENSIONS.filter(d => d !== debugOverrides.dimension);
          selectedDimensions.push(...pickN(remaining, currentRuleCount - 1, rng));
        }
      } else if (currentRuleCount <= 2) {
        const preferred = HIGH_IMPACT_DIMENSIONS.filter(d => DIMENSIONS.includes(d));
        selectedDimensions = preferred.slice(0, currentRuleCount);
      } else {
        selectedDimensions = pickN(DIMENSIONS, currentRuleCount, rng);
      }

      // Step 3: Select rule types — use override if provided
      const ruleTypes: RuleType[] = selectedDimensions.map((_, i) => {
        if (i === 0 && debugOverrides?.ruleType) {
          return debugOverrides.ruleType;
        }
        if (currentRuleCount === 1 && params.allowedRuleTypes.length > 1) {
          const nonConstant = params.allowedRuleTypes.filter(t => t !== 'constant');
          if (nonConstant.length > 0) return pickRandom(nonConstant, rng);
        }
        return pickRandom(params.allowedRuleTypes, rng);
      });

      // Step 4: Assign directions with diversity — use override if provided
      let directions: RuleDirection[];
      if (debugOverrides?.direction) {
        directions = selectedDimensions.map(() => debugOverrides.direction!);
      } else {
        directions = assignDirections(currentRuleCount, rng);
      }

      // Step 5: Generate rule parameters
      const rules: PatternRule[] = selectedDimensions.map((dimension, i) => {
        const ruleParams = generateRuleParams(ruleTypes[i], dimension, rng);

        // Step 6: Assign layer indices for multi-layer
        let layerIndex = 0;
        if (params.layerCount > 1 && dimension !== 'count') {
          // Distribute rules across layers; count always uses layer 0
          layerIndex = i % params.layerCount;
        }

        return {
          type: ruleTypes[i],
          dimension,
          direction: directions[i],
          layerIndex,
          params: ruleParams,
        };
      });

      // Step 7: Build the 3×3 grid
      let grid: CellContent[][] = Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => createEmptyCell(params.layerCount)),
      );

      for (const rule of rules) {
        grid = applyRule(rule, grid);
      }

      // Randomize non-governed dimensions for visual variety
      grid = randomizeBackgroundDimensions(
        grid,
        selectedDimensions as PatternDimension[],
        params.layerCount,
        rng,
      );

      // Re-apply rules to ensure governed dimensions are correct after randomization
      for (const rule of rules) {
        grid = applyRule(rule, grid);
      }

      // Step 8: Extract correct answer
      const correctAnswer = deepCloneCell(grid[2][2]);

      // Step 9: Generate distractors
      const distractors = generateDistractors(
        correctAnswer,
        rules,
        grid,
        params.optionCount - 1,
        params.distractorSophistication,
        rng,
      );

      // Step 10: Combine and shuffle options
      const allOptions = [correctAnswer, ...distractors];
      const shuffledOptions = shuffle(allOptions, rng);

      // Step 11: Find correctIndex
      const correctIndex = shuffledOptions.findIndex((opt) =>
        cellsDeepEqual(opt, correctAnswer),
      );

      const puzzle: Puzzle = {
        grid,
        correctAnswer,
        correctIndex,
        options: shuffledOptions,
        rules,
        seed: seed + attempt,
      };

      // Step 12: Validate
      if (validatePuzzle(puzzle)) {
        return puzzle;
      }
    }

    // All 10 retries failed — reduce rule count and try again
    currentRuleCount--;
  }

  // Absolute fallback: generate a trivial single-rule puzzle
  return generateFallbackPuzzle(seed, params);
}

/**
 * Generates a session of puzzles using sequential seed offsets.
 */
export function generateSession(
  baseSeed: number,
  difficulty: number,
  params: DifficultyParams,
  puzzleCount: number,
  debugOverrides?: DebugOverrides | null,
): Puzzle[] {
  const puzzles: Puzzle[] = [];
  for (let i = 0; i < puzzleCount; i++) {
    puzzles.push(generatePuzzle(baseSeed + i * 1000, difficulty, params, debugOverrides));
  }
  return puzzles;
}

// ── Helper functions ──

/**
 * Assigns directions ensuring diversity when ruleCount >= 2.
 * At least one row-wise and one column-wise when possible.
 */
function assignDirections(ruleCount: number, rng: () => number): RuleDirection[] {
  if (ruleCount === 1) {
    return [pickRandom(['row-wise', 'column-wise'] as const, rng)];
  }

  // Ensure at least one of each direction
  const directions: RuleDirection[] = ['row-wise', 'column-wise'];

  // Fill remaining with random directions
  for (let i = 2; i < ruleCount; i++) {
    directions.push(pickRandom(['row-wise', 'column-wise'] as const, rng));
  }

  // Shuffle to randomize which rule gets which direction
  return shuffle(directions, rng);
}

/**
 * Deep clone a CellContent.
 */
function deepCloneCell(cell: CellContent): CellContent {
  return {
    layers: cell.layers.map((l) => ({ ...l })),
  };
}

/**
 * Deep equality check for two CellContent objects.
 */
function cellsDeepEqual(a: CellContent, b: CellContent): boolean {
  if (a.layers.length !== b.layers.length) return false;
  return a.layers.every(
    (layer, i) =>
      layer.shape === b.layers[i].shape &&
      layer.size === b.layers[i].size &&
      layer.rotation === b.layers[i].rotation &&
      layer.fill === b.layers[i].fill &&
      layer.color === b.layers[i].color,
  );
}

/**
 * Generates a trivial fallback puzzle with a single constant rule.
 * Used when all retry attempts with higher rule counts fail.
 */
function generateFallbackPuzzle(seed: number, params: DifficultyParams): Puzzle {
  const rng = mulberry32(seed + 100);

  const rule: PatternRule = {
    type: 'progression',
    dimension: 'shape',
    direction: 'row-wise',
    layerIndex: 0,
    params: { kind: 'progression', sequence: ['circle', 'square', 'triangle'] },
  };

  let grid: CellContent[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => createEmptyCell(params.layerCount)),
  );
  grid = applyRule(rule, grid);
  grid = randomizeBackgroundDimensions(grid, ['shape'], params.layerCount, rng);
  grid = applyRule(rule, grid);

  const correctAnswer = deepCloneCell(grid[2][2]);
  const distractors = generateDistractors(
    correctAnswer,
    [rule],
    grid,
    Math.max(params.optionCount - 1, 3),
    'naive',
    rng,
  );

  const allOptions = [correctAnswer, ...distractors];
  const shuffledOptions = shuffle(allOptions, rng);
  const correctIndex = shuffledOptions.findIndex((opt) =>
    cellsDeepEqual(opt, correctAnswer),
  );

  return {
    grid,
    correctAnswer,
    correctIndex,
    options: shuffledOptions,
    rules: [rule],
    seed,
  };
}
