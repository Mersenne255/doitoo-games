import {
  ChainingMode,
  DifficultyParams,
  Equation,
  GridCell,
  HiddenCell,
  NumberCell,
  Operator,
  Puzzle,
} from '../models/game.models';
import { validatePuzzle } from './puzzle-validator.util';

/**
 * Seeded PRNG (mulberry32). Returns a function that produces values in [0, 1).
 * Deterministic for a given seed.
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Evaluates an equation given cell values and operators according to the chaining mode.
 * Pure function.
 *
 * - chained: strict left-to-right evaluation (e.g. 2 + 3 × 4 = (2+3)×4 = 20)
 * - precedence: standard math precedence (e.g. 2 + 3 × 4 = 2+(3×4) = 14)
 */
export function evaluateEquation(values: number[], operators: Operator[], mode: ChainingMode): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  if (mode === 'chained') {
    let result = values[0];
    for (let i = 0; i < operators.length; i++) {
      result = applyOp(result, values[i + 1], operators[i]);
    }
    return result;
  }

  // Precedence mode: handle × and ÷ first, then + and −
  const terms: number[] = [values[0]];
  const addOps: ('+' | '-')[] = [];

  let current = values[0];
  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    if (op === '*' || op === '/') {
      current = applyOp(current, values[i + 1], op);
      terms[terms.length - 1] = current;
    } else {
      addOps.push(op as '+' | '-');
      current = values[i + 1];
      terms.push(current);
    }
  }

  let result = terms[0];
  for (let j = 0; j < addOps.length; j++) {
    result = applyOp(result, terms[j + 1], addOps[j]);
  }
  return result;
}

/**
 * Generates a complete puzzle from a seed and difficulty parameters.
 * Pure function — deterministic output for the same inputs.
 *
 * Algorithm:
 * 1. Generate a complete solution grid with random integers in the configured number range
 * 2. Select operators for each adjacent cell pair (rows and columns)
 * 3. Ensure division safety (no zero divisors, integer quotients only)
 * 4. Compute result values for each row and column equation
 * 5. Select hidden cells
 * 6. Validate unique solvability; retry with seed offset up to 10 attempts
 */
export function generatePuzzle(seed: number, params: DifficultyParams): Puzzle {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentSeed = seed + attempt;
    const rng = mulberry32(currentSeed);

    const { gridSize, numberRange, operatorSet, hiddenCount, chainingMode } = params;

    // 1. Generate solution grid
    const solution = generateSolutionGrid(rng, gridSize, numberRange);

    // 2. Select operators for rows and columns
    const rowOperators = generateRowOperators(rng, gridSize, operatorSet, solution);
    const colOperators = generateColOperators(rng, gridSize, operatorSet, solution);

    // 3. Compute result values
    const rowEquations = buildRowEquations(solution, rowOperators, gridSize, chainingMode);
    const colEquations = buildColEquations(solution, colOperators, gridSize, chainingMode);

    // 4. Select hidden cells
    const hiddenCells = selectHiddenCells(rng, gridSize, hiddenCount);

    // 5. Build the grid with number and hidden cells
    const grid = buildGrid(solution, hiddenCells);

    const puzzle: Puzzle = {
      gridSize,
      grid,
      rowEquations,
      colEquations,
      solution,
      hiddenCells,
      seed: currentSeed,
      chainingMode,
      numberRange,
    };

    // 6. Validate: results must be within readable range AND unique solvability
    const maxResult = rowEquations.concat(colEquations).reduce(
      (mx, eq) => Math.max(mx, Math.abs(eq.result)), 0,
    );
    if (maxResult > MAX_RESULT) continue; // reject, try next seed

    if (validatePuzzle(puzzle)) {
      return puzzle;
    }
  }

  // If all attempts fail, return the last attempt (should be extremely rare for valid params)
  // This fallback ensures the function always returns a Puzzle
  const rng = mulberry32(seed + maxAttempts);
  const { gridSize, numberRange, operatorSet, hiddenCount, chainingMode } = params;
  const solution = generateSolutionGrid(rng, gridSize, numberRange);
  const rowOperators = generateRowOperators(rng, gridSize, operatorSet, solution);
  const colOperators = generateColOperators(rng, gridSize, operatorSet, solution);
  const rowEquations = buildRowEquations(solution, rowOperators, gridSize, chainingMode);
  const colEquations = buildColEquations(solution, colOperators, gridSize, chainingMode);
  const hiddenCells = selectHiddenCells(rng, gridSize, hiddenCount);
  const grid = buildGrid(solution, hiddenCells);

  return {
    gridSize,
    grid,
    rowEquations,
    colEquations,
    solution,
    hiddenCells,
    seed: seed + maxAttempts,
    chainingMode,
    numberRange,
  };
}

// ── Internal helpers ──

function applyOp(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
  }
}

function generateSolutionGrid(
  rng: () => number,
  gridSize: number,
  numberRange: { min: number; max: number },
): number[][] {
  const { min, max } = numberRange;
  const range = max - min + 1;
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => Math.floor(rng() * range) + min),
  );
}

/**
 * Generates operators for each row, ensuring division safety.
 * Returns a 2D array: rowOperators[row][opIndex].
 */
function generateRowOperators(
  rng: () => number,
  gridSize: number,
  operatorSet: Operator[],
  solution: number[][],
): Operator[][] {
  return Array.from({ length: gridSize }, (_, row) => {
    const ops: Operator[] = [];
    for (let col = 0; col < gridSize - 1; col++) {
      ops.push(pickSafeOperator(rng, operatorSet, solution[row][col], solution[row][col + 1]));
    }
    return ops;
  });
}

/**
 * Generates operators for each column, ensuring division safety.
 * Returns a 2D array: colOperators[col][opIndex].
 */
function generateColOperators(
  rng: () => number,
  gridSize: number,
  operatorSet: Operator[],
  solution: number[][],
): Operator[][] {
  return Array.from({ length: gridSize }, (_, col) => {
    const ops: Operator[] = [];
    for (let row = 0; row < gridSize - 1; row++) {
      ops.push(pickSafeOperator(rng, operatorSet, solution[row][col], solution[row + 1][col]));
    }
    return ops;
  });
}

/**
 * Maximum absolute value for any equation result.
 * Keeps displayed numbers readable on screen.
 */
const MAX_RESULT = 999;

/**
 * Picks a random operator from the set, ensuring:
 * - Division safety: no zero divisor, integer quotient only
 * - Multiplication sanity: only when at least one operand ≤ 12 AND product ≤ MAX_RESULT
 * Falls back to +/- if the chosen operator would produce extreme values.
 */
function pickSafeOperator(
  rng: () => number,
  operatorSet: Operator[],
  leftValue: number,
  rightValue: number,
): Operator {
  const op = operatorSet[Math.floor(rng() * operatorSet.length)];

  if (op === '/') {
    if (rightValue === 0 || leftValue % rightValue !== 0) {
      return pickAdditiveOp(rng, operatorSet);
    }
    return op;
  }

  if (op === '*') {
    const product = leftValue * rightValue;
    // Only allow multiplication when both operands are small enough
    // and the product stays within readable range
    if (Math.min(Math.abs(leftValue), Math.abs(rightValue)) > 12 || Math.abs(product) > MAX_RESULT) {
      return pickAdditiveOp(rng, operatorSet);
    }
    return op;
  }

  return op;
}

/** Falls back to + or - from the operator set, or just + as ultimate fallback. */
function pickAdditiveOp(rng: () => number, operatorSet: Operator[]): Operator {
  const safeOps = operatorSet.filter(o => o === '+' || o === '-');
  if (safeOps.length === 0) return '+';
  return safeOps[Math.floor(rng() * safeOps.length)];
}

function buildRowEquations(
  solution: number[][],
  rowOperators: Operator[][],
  gridSize: number,
  chainingMode: ChainingMode,
): Equation[] {
  return Array.from({ length: gridSize }, (_, row) => {
    const cellIndices: [number, number][] = Array.from({ length: gridSize }, (_, col) => [row, col] as [number, number]);
    const values = solution[row];
    const operators = rowOperators[row];
    const result = evaluateEquation(values, operators, chainingMode);
    return { cellIndices, operators, result, mode: chainingMode };
  });
}

function buildColEquations(
  solution: number[][],
  colOperators: Operator[][],
  gridSize: number,
  chainingMode: ChainingMode,
): Equation[] {
  return Array.from({ length: gridSize }, (_, col) => {
    const cellIndices: [number, number][] = Array.from({ length: gridSize }, (_, row) => [row, col] as [number, number]);
    const values = Array.from({ length: gridSize }, (_, row) => solution[row][col]);
    const operators = colOperators[col];
    const result = evaluateEquation(values, operators, chainingMode);
    return { cellIndices, operators, result, mode: chainingMode };
  });
}

/**
 * Selects `count` unique cell positions to hide using Fisher-Yates shuffle.
 */
function selectHiddenCells(
  rng: () => number,
  gridSize: number,
  count: number,
): [number, number][] {
  const allCells: [number, number][] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push([r, c]);
    }
  }

  // Fisher-Yates shuffle
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }

  return allCells.slice(0, Math.min(count, allCells.length));
}

function buildGrid(solution: number[][], hiddenCells: [number, number][]): GridCell[][] {
  const hiddenSet = new Set(hiddenCells.map(([r, c]) => `${r},${c}`));
  return solution.map((row, r) =>
    row.map((value, c) => {
      if (hiddenSet.has(`${r},${c}`)) {
        return { kind: 'hidden', solutionValue: value } as HiddenCell;
      }
      return { kind: 'number', value } as NumberCell;
    }),
  );
}
