import {
  DimensionValue,
  ExplanationData,
  ExplanationEntry,
  PatternDimension,
  PatternRule,
  Puzzle,
  RuleDirection,
} from '../models/game.models';

// ── Rotating highlight colors for rule overlays ──
const HIGHLIGHT_COLORS = [
  'rgba(99, 102, 241, 0.25)',   // indigo
  'rgba(34, 197, 94, 0.25)',    // green
  'rgba(234, 179, 8, 0.25)',    // yellow
  'rgba(239, 68, 68, 0.25)',    // red
  'rgba(168, 85, 247, 0.25)',   // purple
  'rgba(6, 182, 212, 0.25)',    // cyan
] as const;

// ── Dimension display names ──
const DIMENSION_LABELS: Record<PatternDimension, string> = {
  shape: 'Shape type',
  size: 'Size',
  rotation: 'Rotation',
  fill: 'Fill style',
  color: 'Color',
  count: 'Shape count',
};

const DIMENSION_LABELS_LOWER: Record<PatternDimension, string> = {
  shape: 'shape type',
  size: 'size',
  rotation: 'rotation',
  fill: 'fill style',
  color: 'color',
  count: 'shape count',
};

/**
 * Formats a single dimension value as a human-readable string.
 */
function formatValue(value: DimensionValue): string {
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value);
}

/**
 * Formats a list of values as a progression string: "a → b → c"
 */
function formatProgression(values: DimensionValue[]): string {
  return values.map(formatValue).join(' → ');
}

/**
 * Formats a list of values as a comma-separated list: "a, b, and c"
 */
function formatList(values: DimensionValue[]): string {
  const strs = values.map(formatValue);
  if (strs.length <= 1) return strs[0] ?? '';
  if (strs.length === 2) return `${strs[0]} and ${strs[1]}`;
  return `${strs.slice(0, -1).join(', ')}, and ${strs[strs.length - 1]}`;
}

/**
 * Converts a single PatternRule into a plain-language description string.
 * Uses template strings with dimension names, rule type descriptions, and parameter values.
 */
export function describeRule(rule: PatternRule): string {
  const dim = DIMENSION_LABELS[rule.dimension];
  const dimLower = DIMENSION_LABELS_LOWER[rule.dimension];
  const params = rule.params;

  switch (params.kind) {
    case 'constant':
      return rule.direction === 'row-wise'
        ? `${dim} is the same across each row`
        : `${dim} is the same down each column`;

    case 'progression':
      return rule.direction === 'row-wise'
        ? `${dim} progresses ${formatProgression(params.sequence)} across each row`
        : `${dim} progresses ${formatProgression(params.sequence)} down each column`;

    case 'cycle':
      return rule.direction === 'row-wise'
        ? `${dim} cycles through ${formatProgression(params.cycleValues)} across each row`
        : `${dim} cycles through ${formatProgression(params.cycleValues)} down each column`;

    case 'distribution':
      return rule.direction === 'row-wise'
        ? `Each row contains one of each ${dimLower}: ${formatList(params.valueSet)}`
        : `Each column contains one of each ${dimLower}: ${formatList(params.valueSet)}`;

    case 'xor':
      return rule.direction === 'row-wise'
        ? `${dim} in the third column is derived from the first two columns`
        : `${dim} in the third row is derived from the first two rows`;
  }
}

/**
 * Returns all cell positions to highlight for a given rule direction.
 * Row-wise: all cells in all 3 rows (the entire grid, grouped by row).
 * Column-wise: all cells in all 3 columns (the entire grid, grouped by column).
 */
function getHighlightCells(direction: RuleDirection): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push([r, c]);
    }
  }
  return cells;
}

/**
 * Produces structured explanation data from a puzzle.
 * One entry per active rule, each with a human-readable description,
 * direction, highlight cells, and a rotating highlight color.
 */
export function generateExplanation(puzzle: Puzzle): ExplanationData {
  const entries: ExplanationEntry[] = puzzle.rules.map((rule, index) => ({
    description: describeRule(rule),
    direction: rule.direction,
    highlightCells: getHighlightCells(rule.direction),
    highlightColor: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
  }));

  return { entries };
}
