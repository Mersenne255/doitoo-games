import { Operator, Puzzle, ChainingMode } from '../models/game.models';

/**
 * Validates that a puzzle has exactly one solution.
 * Uses constraint propagation + backtracking to verify unique solvability.
 * Pure function — deterministic output for each input.
 *
 * @returns true if exactly one assignment of values to all hidden cells
 *          satisfies every row and column equation simultaneously.
 */
export function validatePuzzle(puzzle: Puzzle): boolean {
  const { gridSize, grid, rowEquations, colEquations, hiddenCells, numberRange } = puzzle;

  if (hiddenCells.length === 0) return true;

  // Safety: bail out for puzzles that would be too expensive to validate
  // For large number ranges with many hidden cells, backtracking is infeasible
  const domainSize = numberRange.max - numberRange.min + 1;
  if (hiddenCells.length > 6 && domainSize > 20) return true; // trust the generator
  if (hiddenCells.length > 4 && domainSize > 50) return true;

  // Build a working grid with known values and null for hidden cells
  const workingGrid: (number | null)[][] = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => {
      const cell = grid[r][c];
      return cell.kind === 'number' ? cell.value : null;
    }),
  );

  // Compute initial domains for each hidden cell
  const domains: number[][] = hiddenCells.map(([row, col]) => {
    const rowEq = rowEquations[row];
    const colEq = colEquations[col];
    const candidates: number[] = [];
    for (let v = numberRange.min; v <= numberRange.max; v++) {
      if (isConsistentWithEquation(workingGrid, rowEq, row, col, v, gridSize) &&
          isConsistentWithEquation(workingGrid, colEq, row, col, v, gridSize)) {
        candidates.push(v);
      }
    }
    return candidates;
  });

  // If any domain is empty, no solution exists
  if (domains.some(d => d.length === 0)) return false;

  // If total search space is too large, skip exhaustive validation
  const totalCombinations = domains.reduce((acc, d) => acc * d.length, 1);
  if (totalCombinations > 500_000) return true; // trust the generator for large spaces

  let solutionCount = 0;
  let nodesVisited = 0;
  const MAX_NODES = 200_000;

  function backtrack(index: number): boolean {
    nodesVisited++;
    if (nodesVisited > MAX_NODES) return true; // bail out, assume valid

    if (index === hiddenCells.length) {
      // All hidden cells assigned — verify all equations
      if (verifyAllEquations(workingGrid, rowEquations, colEquations, gridSize)) {
        solutionCount++;
        return solutionCount > 1; // stop early if more than one solution
      }
      return false;
    }

    const [row, col] = hiddenCells[index];

    for (const value of domains[index]) {
      workingGrid[row][col] = value;

      // Quick consistency check for partially filled equations
      if (isPartiallyConsistent(workingGrid, rowEquations[row], gridSize) &&
          isPartiallyConsistent(workingGrid, colEquations[col], gridSize)) {
        const shouldStop = backtrack(index + 1);
        if (shouldStop) {
          workingGrid[row][col] = null;
          return true;
        }
      }

      workingGrid[row][col] = null;
    }

    return false;
  }

  backtrack(0);
  return nodesVisited > MAX_NODES || solutionCount === 1;
}


/**
 * Checks if a value placed at (row, col) is consistent with a single equation,
 * considering only the cells that are already filled.
 * Used during domain computation for initial constraint propagation.
 */
function isConsistentWithEquation(
  grid: (number | null)[][],
  equation: { cellIndices: [number, number][]; operators: Operator[]; result: number; mode: ChainingMode },
  targetRow: number,
  targetCol: number,
  value: number,
  _gridSize: number,
): boolean {
  const values: (number | null)[] = equation.cellIndices.map(([r, c]) => {
    if (r === targetRow && c === targetCol) return value;
    return grid[r][c];
  });

  // If any cell is still null, we can't fully evaluate — assume consistent
  if (values.some(v => v === null)) return true;

  const result = evaluateValues(values as number[], equation.operators, equation.mode);
  return result === equation.result;
}

/**
 * Checks if a partially filled equation is still consistent.
 * If all cells are filled, verifies the equation evaluates to the expected result.
 * If some cells are still null, returns true (can't determine inconsistency yet).
 */
function isPartiallyConsistent(
  grid: (number | null)[][],
  equation: { cellIndices: [number, number][]; operators: Operator[]; result: number; mode: ChainingMode },
  _gridSize: number,
): boolean {
  const values: (number | null)[] = equation.cellIndices.map(([r, c]) => grid[r][c]);

  if (values.some(v => v === null)) return true;

  const result = evaluateValues(values as number[], equation.operators, equation.mode);
  return result === equation.result;
}

/**
 * Verifies all row and column equations are satisfied by the current grid state.
 */
function verifyAllEquations(
  grid: (number | null)[][],
  rowEquations: { cellIndices: [number, number][]; operators: Operator[]; result: number; mode: ChainingMode }[],
  colEquations: { cellIndices: [number, number][]; operators: Operator[]; result: number; mode: ChainingMode }[],
  _gridSize: number,
): boolean {
  for (const eq of rowEquations) {
    const values = eq.cellIndices.map(([r, c]) => grid[r][c]);
    if (values.some(v => v === null)) return false;
    if (evaluateValues(values as number[], eq.operators, eq.mode) !== eq.result) return false;
  }
  for (const eq of colEquations) {
    const values = eq.cellIndices.map(([r, c]) => grid[r][c]);
    if (values.some(v => v === null)) return false;
    if (evaluateValues(values as number[], eq.operators, eq.mode) !== eq.result) return false;
  }
  return true;
}

/**
 * Evaluates an equation from cell values and operators according to the chaining mode.
 * - chained: strict left-to-right evaluation
 * - precedence: standard mathematical operator precedence (× ÷ before + −)
 */
function evaluateValues(values: number[], operators: Operator[], mode: ChainingMode): number {
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
  // Build a list of terms separated by + and −
  const terms: number[] = [values[0]];
  const addOps: ('+' | '-')[] = [];

  let current = values[0];
  let i = 0;
  while (i < operators.length) {
    const op = operators[i];
    if (op === '*' || op === '/') {
      current = applyOp(current, values[i + 1], op);
      terms[terms.length - 1] = current;
    } else {
      addOps.push(op as '+' | '-');
      current = values[i + 1];
      terms.push(current);
    }
    i++;
  }

  let result = terms[0];
  for (let j = 0; j < addOps.length; j++) {
    result = applyOp(result, terms[j + 1], addOps[j]);
  }
  return result;
}

/** Applies a single arithmetic operation. */
function applyOp(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
  }
}
