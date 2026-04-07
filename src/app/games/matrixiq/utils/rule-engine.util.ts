import {
  CellContent,
  ConstantRuleParams,
  CycleRuleParams,
  DimensionValue,
  DistributionRuleParams,
  PatternDimension,
  PatternRule,
  ProgressionRuleParams,
  ShapeLayer,
  XORRuleParams,
} from '../models/game.models';

// ── Default shape layer used when creating empty cells ──
const DEFAULT_LAYER: ShapeLayer = {
  shape: 'circle',
  size: 'medium',
  rotation: 0,
  fill: 'solid',
  color: 'white',
};

/**
 * Creates a cell with default values and the specified number of layers.
 */
export function createEmptyCell(layerCount: number): CellContent {
  return {
    layers: Array.from({ length: Math.max(1, layerCount) }, () => ({ ...DEFAULT_LAYER })),
  };
}

/**
 * Extracts a dimension value from a cell.
 * For 'count', returns the number of layers (ignoring layerIndex).
 * For other dimensions, reads from the specified layer.
 */
export function getDimensionValue(
  cell: CellContent,
  dimension: PatternDimension,
  layerIndex: number,
): DimensionValue {
  if (dimension === 'count') {
    return cell.layers.length;
  }
  const layer = cell.layers[layerIndex];
  if (!layer) return DEFAULT_LAYER[dimension];
  return layer[dimension];
}

/**
 * Returns a new cell with the dimension value set.
 * For 'count', adjusts the layers array length (adding default layers or trimming).
 * For other dimensions, sets the value on the specified layer.
 */
export function setDimensionValue(
  cell: CellContent,
  dimension: PatternDimension,
  layerIndex: number,
  value: DimensionValue,
): CellContent {
  if (dimension === 'count') {
    const targetCount = value as number;
    const currentLayers = [...cell.layers];
    if (targetCount > currentLayers.length) {
      while (currentLayers.length < targetCount) {
        currentLayers.push({ ...DEFAULT_LAYER });
      }
    } else if (targetCount < currentLayers.length) {
      currentLayers.length = Math.max(1, targetCount);
    }
    return { layers: currentLayers };
  }

  const newLayers = cell.layers.map((l) => ({ ...l }));
  // Ensure the layer exists
  while (newLayers.length <= layerIndex) {
    newLayers.push({ ...DEFAULT_LAYER });
  }
  (newLayers[layerIndex] as Record<string, unknown>)[dimension] = value;
  return { layers: newLayers };
}


// ── Core cell value computation ──

/**
 * Resolves group index and position index from row/col based on rule direction.
 * Row-wise: group = row, position = col
 * Column-wise: group = col, position = row
 */
function resolveGroupAndPosition(
  rule: PatternRule,
  row: number,
  col: number,
): [group: number, position: number] {
  return rule.direction === 'row-wise' ? [row, col] : [col, row];
}

/**
 * Computes what value a rule dictates for a specific cell at [row, col].
 */
export function computeCellValue(
  rule: PatternRule,
  row: number,
  col: number,
  _grid: CellContent[][],
): DimensionValue {
  const [group, position] = resolveGroupAndPosition(rule, row, col);
  const params = rule.params;

  switch (params.kind) {
    case 'constant':
      return computeConstant(params, group);
    case 'progression':
      return computeProgression(params, position);
    case 'cycle':
      return computeCycle(params, group, position);
    case 'distribution':
      return computeDistribution(params, group, position);
    case 'xor':
      return computeXOR(params, group, position, rule, _grid);
  }
}

function computeConstant(params: ConstantRuleParams, group: number): DimensionValue {
  return params.values[group];
}

function computeProgression(params: ProgressionRuleParams, position: number): DimensionValue {
  return params.sequence[position];
}

function computeCycle(params: CycleRuleParams, group: number, position: number): DimensionValue {
  const idx = (params.offsets[group] + position) % params.cycleValues.length;
  return params.cycleValues[idx];
}

function computeDistribution(
  params: DistributionRuleParams,
  group: number,
  position: number,
): DimensionValue {
  return params.valueSet[params.permutations[group][position]];
}

/**
 * XOR rule: the third cell is derived from the first two.
 * For positions 0 and 1, we read from the grid (or from the valueSet directly
 * since the grid should already have those values set).
 * For position 2, we derive from positions 0 and 1.
 */
function computeXOR(
  params: XORRuleParams,
  group: number,
  position: number,
  rule: PatternRule,
  grid: CellContent[][],
): DimensionValue {
  // For positions 0 and 1, read from the grid
  if (position < 2) {
    const [row, col] = rule.direction === 'row-wise'
      ? [group, position]
      : [position, group];
    return getDimensionValue(grid[row][col], rule.dimension, rule.layerIndex);
  }

  // Position 2: derive from positions 0 and 1
  const [row0, col0] = rule.direction === 'row-wise'
    ? [group, 0]
    : [0, group];
  const [row1, col1] = rule.direction === 'row-wise'
    ? [group, 1]
    : [1, group];

  const val0 = getDimensionValue(grid[row0][col0], rule.dimension, rule.layerIndex);
  const val1 = getDimensionValue(grid[row1][col1], rule.dimension, rule.layerIndex);

  return deriveXORValue(val0, val1, params.valueSet);
}

/**
 * XOR derivation: given two values and a 3-element valueSet:
 * - If both are the same: return the third distinct value (valueSet[2])
 * - If different: return the value from valueSet that is neither val0 nor val1
 */
function deriveXORValue(
  val0: DimensionValue,
  val1: DimensionValue,
  valueSet: DimensionValue[],
): DimensionValue {
  if (val0 === val1) {
    // Both same → return the third value (the one that isn't val0)
    // Find the value in valueSet that differs from val0
    const third = valueSet.find((v) => v !== val0);
    return third ?? valueSet[2];
  }
  // Different → return the one that is neither
  const remaining = valueSet.find((v) => v !== val0 && v !== val1);
  return remaining ?? valueSet[2];
}


// ── Rule application ──

/**
 * Applies a rule to fill in the governed dimension for all cells in the grid.
 * Returns a new grid (does not mutate the input).
 */
export function applyRule(rule: PatternRule, grid: CellContent[][]): CellContent[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ layers: cell.layers.map((l) => ({ ...l })) })));

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const value = computeCellValue(rule, row, col, newGrid);
      newGrid[row][col] = setDimensionValue(newGrid[row][col], rule.dimension, rule.layerIndex, value);
    }
  }

  return newGrid;
}

// ── Rule checking ──

/**
 * Verifies all 9 cells in the grid satisfy the given rule.
 */
export function checkRuleSatisfied(rule: PatternRule, grid: CellContent[][]): boolean {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const expected = computeCellValue(rule, row, col, grid);
      const actual = getDimensionValue(grid[row][col], rule.dimension, rule.layerIndex);
      if (actual !== expected) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Returns true only if every rule in the array is satisfied by the grid.
 */
export function checkAllRulesSatisfied(rules: PatternRule[], grid: CellContent[][]): boolean {
  return rules.every((rule) => checkRuleSatisfied(rule, grid));
}

// ── Missing cell inference ──

/**
 * Given 8 visible cells and the active rules, computes the unique CellContent
 * at position [2,2] that satisfies all rules.
 *
 * Starts with the existing cell at [2,2] (or an empty cell) and applies each
 * rule's computed value for that position.
 */
export function inferMissingCell(rules: PatternRule[], grid: CellContent[][]): CellContent {
  // Determine layer count from existing cells
  const maxLayers = Math.max(
    ...grid.flat().map((c) => c.layers.length),
    1,
  );
  let cell = grid[2][2] ?? createEmptyCell(maxLayers);

  // Ensure cell has enough layers
  if (cell.layers.length < maxLayers) {
    const layers = [...cell.layers.map((l) => ({ ...l }))];
    while (layers.length < maxLayers) {
      layers.push({ ...DEFAULT_LAYER });
    }
    cell = { layers };
  } else {
    cell = { layers: cell.layers.map((l) => ({ ...l })) };
  }

  for (const rule of rules) {
    const value = computeCellValue(rule, 2, 2, grid);
    cell = setDimensionValue(cell, rule.dimension, rule.layerIndex, value);
  }

  return cell;
}
