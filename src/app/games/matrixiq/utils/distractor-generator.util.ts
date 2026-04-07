import {
  CellContent,
  COLORS,
  DistractorSophistication,
  DimensionValue,
  FILLS,
  PatternDimension,
  PatternRule,
  ROTATIONS,
  SHAPE_TYPES,
  ShapeLayer,
  SIZES,
} from '../models/game.models';
import { pickRandom } from './prng.util';
import {
  checkAllRulesSatisfied,
  getDimensionValue,
  setDimensionValue,
} from './rule-engine.util';

// ── Dimension value palettes ──

const DIMENSION_VALUES: Record<PatternDimension, readonly DimensionValue[]> = {
  shape: SHAPE_TYPES,
  size: SIZES,
  rotation: ROTATIONS,
  fill: FILLS,
  color: COLORS,
  count: [1, 2, 3, 4],
};

/**
 * Dimensions ordered from visually subtle to obvious.
 * rotation and size changes are harder to spot; shape and color are obvious.
 */
const SUBTLE_DIMENSIONS: PatternDimension[] = ['rotation', 'size', 'fill', 'count', 'color', 'shape'];

// ── Deep equality helpers ──

function layersEqual(a: ShapeLayer, b: ShapeLayer): boolean {
  return (
    a.shape === b.shape &&
    a.size === b.size &&
    a.rotation === b.rotation &&
    a.fill === b.fill &&
    a.color === b.color
  );
}

function cellsEqual(a: CellContent, b: CellContent): boolean {
  if (a.layers.length !== b.layers.length) return false;
  return a.layers.every((layer, i) => layersEqual(layer, b.layers[i]));
}

// ── Value picking helpers ──

/** Pick a value different from `current` for the given dimension. */
function pickWrongValue(
  dimension: PatternDimension,
  current: DimensionValue,
  rng: () => number,
): DimensionValue {
  const palette = DIMENSION_VALUES[dimension];
  const candidates = palette.filter((v) => v !== current);
  return pickRandom(candidates, rng);
}

/** Pick a value adjacent (similar) to `current` in the dimension's value array. */
function pickSimilarValue(
  dimension: PatternDimension,
  current: DimensionValue,
  rng: () => number,
): DimensionValue {
  const palette = DIMENSION_VALUES[dimension];
  const idx = palette.indexOf(current as never);
  if (idx === -1) return pickWrongValue(dimension, current, rng);

  const neighbors: DimensionValue[] = [];
  if (idx > 0) neighbors.push(palette[idx - 1]);
  if (idx < palette.length - 1) neighbors.push(palette[idx + 1]);

  if (neighbors.length === 0) return pickWrongValue(dimension, current, rng);
  return pickRandom(neighbors, rng);
}

/** Clone a CellContent deeply. */
function cloneCell(cell: CellContent): CellContent {
  return { layers: cell.layers.map((l) => ({ ...l })) };
}

/**
 * Place a candidate cell at [2,2] in the grid and check if all rules are satisfied.
 */
function satisfiesAllRules(
  candidate: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
): boolean {
  const testGrid = grid.map((row, r) =>
    row.map((cell, c) => (r === 2 && c === 2 ? candidate : cell)),
  );
  return checkAllRulesSatisfied(rules, testGrid);
}

/**
 * Check if a candidate is unique among existing distractors and differs from the correct answer.
 */
function isUnique(
  candidate: CellContent,
  correctAnswer: CellContent,
  existing: CellContent[],
): boolean {
  if (cellsEqual(candidate, correctAnswer)) return false;
  return !existing.some((d) => cellsEqual(d, candidate));
}

// ── Sophistication-level generators ──

/**
 * Naive: randomize 1–3 dimensions to random values.
 */
function generateNaive(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  rng: () => number,
): CellContent[] {
  const results: CellContent[] = [];
  const governedDims = rules.map((r) => ({ dimension: r.dimension, layerIndex: r.layerIndex }));
  let attempts = 0;

  while (results.length < count && attempts < count * 20) {
    attempts++;
    let candidate = cloneCell(correctAnswer);
    const numDims = Math.min(governedDims.length, Math.floor(rng() * 3) + 1);

    // Pick random governed dimensions to randomize
    const shuffled = [...governedDims].sort(() => rng() - 0.5);
    for (let i = 0; i < numDims; i++) {
      const { dimension, layerIndex } = shuffled[i];
      const currentVal = getDimensionValue(candidate, dimension, layerIndex);
      const newVal = pickWrongValue(dimension, currentVal, rng);
      candidate = setDimensionValue(candidate, dimension, layerIndex, newVal);
    }

    if (
      isUnique(candidate, correctAnswer, results) &&
      !satisfiesAllRules(candidate, rules, grid)
    ) {
      results.push(candidate);
    }
  }

  return results;
}

/**
 * Partial: satisfies at least one rule but violates at least one other.
 * Modify 1–2 dimensions to break their rules.
 */
function generatePartial(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  rng: () => number,
): CellContent[] {
  const results: CellContent[] = [];
  let attempts = 0;

  while (results.length < count && attempts < count * 30) {
    attempts++;
    let candidate = cloneCell(correctAnswer);

    // Pick 1–2 rules to violate
    const numToViolate = Math.min(rules.length, Math.floor(rng() * 2) + 1);
    const shuffledRules = [...rules].sort(() => rng() - 0.5);
    const toViolate = shuffledRules.slice(0, numToViolate);

    for (const rule of toViolate) {
      const currentVal = getDimensionValue(candidate, rule.dimension, rule.layerIndex);
      const newVal = pickWrongValue(rule.dimension, currentVal, rng);
      candidate = setDimensionValue(candidate, rule.dimension, rule.layerIndex, newVal);
    }

    if (
      isUnique(candidate, correctAnswer, results) &&
      !satisfiesAllRules(candidate, rules, grid)
    ) {
      results.push(candidate);
    }
  }

  return results;
}

/**
 * All-but-one: satisfies all rules except exactly one.
 * Modify exactly one dimension to violate its rule.
 */
function generateAllButOne(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  rng: () => number,
): CellContent[] {
  const results: CellContent[] = [];
  let attempts = 0;

  while (results.length < count && attempts < count * 30) {
    attempts++;
    // Pick one rule to violate
    const ruleToViolate = pickRandom(rules, rng);
    let candidate = cloneCell(correctAnswer);

    const currentVal = getDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex);
    const newVal = pickWrongValue(ruleToViolate.dimension, currentVal, rng);
    candidate = setDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex, newVal);

    if (
      isUnique(candidate, correctAnswer, results) &&
      !satisfiesAllRules(candidate, rules, grid)
    ) {
      results.push(candidate);
    }
  }

  return results;
}

/**
 * All-but-one-subtle: same as all-but-one, but prefer violating visually subtle dimensions.
 * At least one distractor should violate a subtle dimension (rotation, size).
 */
function generateAllButOneSubtle(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  rng: () => number,
): CellContent[] {
  const results: CellContent[] = [];

  // Sort rules by subtlety (most subtle first)
  const sortedRules = [...rules].sort((a, b) => {
    const aIdx = SUBTLE_DIMENSIONS.indexOf(a.dimension);
    const bIdx = SUBTLE_DIMENSIONS.indexOf(b.dimension);
    return aIdx - bIdx;
  });

  // First distractor must violate the most subtle dimension available
  let subtleGenerated = false;
  let attempts = 0;

  while (results.length < count && attempts < count * 30) {
    attempts++;
    // If we haven't generated a subtle one yet, force the most subtle rule
    const ruleToViolate =
      !subtleGenerated ? sortedRules[0] : pickRandom(sortedRules, rng);

    let candidate = cloneCell(correctAnswer);
    const currentVal = getDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex);
    const newVal = pickWrongValue(ruleToViolate.dimension, currentVal, rng);
    candidate = setDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex, newVal);

    if (
      isUnique(candidate, correctAnswer, results) &&
      !satisfiesAllRules(candidate, rules, grid)
    ) {
      if (!subtleGenerated && ruleToViolate === sortedRules[0]) {
        subtleGenerated = true;
      }
      results.push(candidate);
    }
  }

  return results;
}

/**
 * One-rule-each: each distractor violates exactly one different rule.
 * First N distractors each violate a unique rule, remaining violate hardest-to-spot rules.
 */
function generateOneRuleEach(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  rng: () => number,
  useSimilarValues: boolean,
): CellContent[] {
  const results: CellContent[] = [];

  // Sort rules by subtlety for the "remaining" distractors
  const rulesBySubtlety = [...rules].sort((a, b) => {
    const aIdx = SUBTLE_DIMENSIONS.indexOf(a.dimension);
    const bIdx = SUBTLE_DIMENSIONS.indexOf(b.dimension);
    return aIdx - bIdx;
  });

  // Build the assignment: first N get unique rules, rest get hardest-to-spot
  const ruleAssignments: PatternRule[] = [];
  for (let i = 0; i < count; i++) {
    if (i < rules.length) {
      ruleAssignments.push(rules[i]);
    } else {
      // Cycle through the most subtle rules
      ruleAssignments.push(rulesBySubtlety[i % rulesBySubtlety.length]);
    }
  }

  for (const ruleToViolate of ruleAssignments) {
    let found = false;
    let attempts = 0;

    while (!found && attempts < 30) {
      attempts++;
      let candidate = cloneCell(correctAnswer);
      const currentVal = getDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex);

      const newVal = useSimilarValues
        ? pickSimilarValue(ruleToViolate.dimension, currentVal, rng)
        : pickWrongValue(ruleToViolate.dimension, currentVal, rng);

      candidate = setDimensionValue(candidate, ruleToViolate.dimension, ruleToViolate.layerIndex, newVal);

      if (
        isUnique(candidate, correctAnswer, results) &&
        !satisfiesAllRules(candidate, rules, grid)
      ) {
        results.push(candidate);
        found = true;
      }
    }
  }

  return results;
}

// ── Main entry point ──

/**
 * Generates distractors at the specified sophistication level.
 *
 * Guarantees:
 * - No distractor equals the correct answer (deep equality on layers)
 * - No two distractors are identical
 * - No distractor accidentally satisfies all rules
 */
export function generateDistractors(
  correctAnswer: CellContent,
  rules: PatternRule[],
  grid: CellContent[][],
  count: number,
  sophistication: DistractorSophistication,
  rng: () => number,
): CellContent[] {
  if (count <= 0 || rules.length === 0) return [];

  let distractors: CellContent[];

  switch (sophistication) {
    case 'naive':
      distractors = generateNaive(correctAnswer, rules, grid, count, rng);
      break;
    case 'partial':
      distractors = generatePartial(correctAnswer, rules, grid, count, rng);
      break;
    case 'all-but-one':
      distractors = generateAllButOne(correctAnswer, rules, grid, count, rng);
      break;
    case 'all-but-one-subtle':
      distractors = generateAllButOneSubtle(correctAnswer, rules, grid, count, rng);
      break;
    case 'one-rule-each':
      distractors = generateOneRuleEach(correctAnswer, rules, grid, count, rng, false);
      break;
    case 'one-rule-each-max-similarity':
      distractors = generateOneRuleEach(correctAnswer, rules, grid, count, rng, true);
      break;
  }

  return distractors;
}
