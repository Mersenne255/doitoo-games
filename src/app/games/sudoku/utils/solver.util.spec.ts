import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { solve, SolverResult } from './solver.util';

// ── Helper: validate Sudoku constraints on a filled grid ──
function validateSudokuConstraints(
  grid: number[][],
  boxRows: number,
  boxCols: number
): boolean {
  const gridSize = boxRows * boxCols;

  // Every row contains each digit 1–gridSize exactly once
  for (let r = 0; r < gridSize; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < gridSize; c++) {
      const v = grid[r][c];
      if (v < 1 || v > gridSize || seen.has(v)) return false;
      seen.add(v);
    }
  }

  // Every column contains each digit exactly once
  for (let c = 0; c < gridSize; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < gridSize; r++) {
      const v = grid[r][c];
      if (v < 1 || v > gridSize || seen.has(v)) return false;
      seen.add(v);
    }
  }

  // Every box contains each digit exactly once
  for (let br = 0; br < gridSize; br += boxRows) {
    for (let bc = 0; bc < gridSize; bc += boxCols) {
      const seen = new Set<number>();
      for (let r = br; r < br + boxRows; r++) {
        for (let c = bc; c < bc + boxCols; c++) {
          const v = grid[r][c];
          if (v < 1 || v > gridSize || seen.has(v)) return false;
          seen.add(v);
        }
      }
    }
  }

  return true;
}

// ── Known puzzles ──

// 4×4 puzzle (boxRows=2, boxCols=2) with unique solution
const puzzle4x4 = [
  [1, 2, 0, 0],
  [0, 0, 1, 2],
  [2, 0, 4, 1],
  [4, 1, 2, 0],
];
const solution4x4 = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 3, 4, 1],
  [4, 1, 2, 3],
];

// 6×6 puzzle (boxRows=2, boxCols=3) with unique solution
const puzzle6x6 = [
  [0, 2, 0, 4, 0, 6],
  [4, 0, 6, 0, 2, 0],
  [0, 1, 0, 3, 0, 5],
  [3, 0, 5, 0, 1, 0],
  [0, 3, 0, 6, 0, 2],
  [6, 0, 2, 0, 3, 0],
];
const solution6x6 = [
  [1, 2, 3, 4, 5, 6],
  [4, 5, 6, 1, 2, 3],
  [2, 1, 4, 3, 6, 5],
  [3, 6, 5, 2, 1, 4],
  [5, 3, 1, 6, 4, 2],
  [6, 4, 2, 5, 3, 1],
];

// 9×9 puzzle (boxRows=3, boxCols=3) with unique solution
const puzzle9x9 = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];
const solution9x9 = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

// 4×4 grid with multiple solutions (rectangle removal pattern)
const puzzle4x4TwoSolutions = [
  [0, 2, 0, 4],
  [0, 4, 0, 2],
  [2, 3, 4, 1],
  [4, 1, 2, 3],
];

// Invalid 4×4 grid: duplicate 1 in row 0
const invalidGrid4x4 = [
  [1, 1, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

// ── Unit Tests ──

describe('solve — unit tests', () => {
  it('solves a 4×4 puzzle with unique solution', () => {
    const result = solve(puzzle4x4, 2, 2);
    expect(result.status).toBe('unique');
    expect((result as { status: 'unique'; solution: number[][] }).solution).toEqual(solution4x4);
  });

  it('solves a 6×6 puzzle with unique solution', () => {
    const result = solve(puzzle6x6, 2, 3);
    expect(result.status).toBe('unique');
    expect((result as { status: 'unique'; solution: number[][] }).solution).toEqual(solution6x6);
  });

  it('solves a 9×9 puzzle with unique solution', () => {
    const result = solve(puzzle9x9, 3, 3);
    expect(result.status).toBe('unique');
    expect((result as { status: 'unique'; solution: number[][] }).solution).toEqual(solution9x9);
  });

  it('returns "multiple" for an empty 4×4 grid', () => {
    const emptyGrid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    const result = solve(emptyGrid, 2, 2);
    expect(result.status).toBe('multiple');
  });

  it('returns "none" for an invalid grid (duplicate in row)', () => {
    const result = solve(invalidGrid4x4, 2, 2);
    expect(result.status).toBe('none');
  });

  it('returns "multiple" for a grid with exactly 2 solutions', () => {
    const result = solve(puzzle4x4TwoSolutions, 2, 2);
    expect(result.status).toBe('multiple');
  });
});

// ── Property-Based Tests ──

describe('solve — property-based tests', () => {
  /**
   * Feature: sudoku-game, Property 8: solution constraints
   *
   * For any solution returned by the solver, every row contains each digit
   * 1–gridSize exactly once, every column contains each digit exactly once,
   * and every box contains each digit exactly once.
   *
   * **Validates: Requirements 7.4, 9.8**
   */
  it('Property 8: solutions satisfy Sudoku constraints', () => {
    // Test with known puzzles of all three box dimensions
    const puzzles: { grid: number[][]; boxRows: number; boxCols: number }[] = [
      { grid: puzzle4x4, boxRows: 2, boxCols: 2 },
      { grid: puzzle6x6, boxRows: 2, boxCols: 3 },
      { grid: puzzle9x9, boxRows: 3, boxCols: 3 },
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: puzzles.length - 1 }),
        (idx) => {
          const { grid, boxRows, boxCols } = puzzles[idx];
          const result = solve(grid, boxRows, boxCols);

          if (result.status === 'unique') {
            expect(validateSudokuConstraints(result.solution, boxRows, boxCols)).toBe(true);
          }
          // If not unique, no solution to validate — property trivially holds
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Feature: sudoku-game, Property 8: solution constraints (generated 4×4 puzzles)
   *
   * For randomly generated 4×4 puzzles that have a unique solution,
   * the solution satisfies all Sudoku constraints.
   *
   * **Validates: Requirements 7.4, 9.8**
   */
  it('Property 8: generated 4×4 solutions satisfy Sudoku constraints', () => {
    // Generate random 4×4 puzzles by starting from a known solution and removing cells
    const baseSolution = solution4x4;

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 4, maxLength: 10 }),
        (cellsToRemove) => {
          // Create a puzzle by removing cells from the known solution
          const grid = baseSolution.map(row => [...row]);
          const uniqueCells = [...new Set(cellsToRemove)];
          for (const cellIdx of uniqueCells) {
            const r = Math.floor(cellIdx / 4);
            const c = cellIdx % 4;
            grid[r][c] = 0;
          }

          const result = solve(grid, 2, 2);
          if (result.status === 'unique') {
            expect(validateSudokuConstraints(result.solution, 2, 2)).toBe(true);
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Feature: sudoku-game, Property 11: solver correctness
   *
   * For any puzzle with a known solution, the solver should return 'unique'
   * and the solution should match.
   *
   * Since the puzzle generator isn't built yet, we test with hand-crafted
   * puzzles derived from known solutions using seeded cell removal.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 11: solver returns correct unique solution for known puzzles', () => {
    // Use seeds to deterministically select which cells to remove from a known solution
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (seed) => {
          // Simple seeded PRNG for cell selection
          let s = seed;
          const next = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s;
          };

          // Start from the known 4×4 solution
          const grid = solution4x4.map(row => [...row]);

          // Remove 2–6 cells based on seed
          const removeCount = 2 + (next() % 5);
          const removed = new Set<number>();
          for (let i = 0; i < removeCount; i++) {
            const cellIdx = next() % 16;
            removed.add(cellIdx);
          }

          for (const cellIdx of removed) {
            const r = Math.floor(cellIdx / 4);
            const c = cellIdx % 4;
            grid[r][c] = 0;
          }

          const result = solve(grid, 2, 2);

          // The puzzle derived from a valid solution should be solvable
          expect(result.status).not.toBe('none');

          if (result.status === 'unique') {
            // The solution must match the original
            expect(result.solution).toEqual(solution4x4);
          }
          // 'multiple' is acceptable if too many cells were removed
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Feature: sudoku-game, Property 11: solver correctness (6×6 and 9×9)
   *
   * For known 6×6 and 9×9 puzzles, the solver returns 'unique' with the
   * correct solution.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 11: solver correctness for 6×6 and 9×9 known puzzles', () => {
    const knownPuzzles = [
      { grid: puzzle6x6, solution: solution6x6, boxRows: 2, boxCols: 3 },
      { grid: puzzle9x9, solution: solution9x9, boxRows: 3, boxCols: 3 },
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: knownPuzzles.length - 1 }),
        (idx) => {
          const { grid, solution, boxRows, boxCols } = knownPuzzles[idx];
          const result = solve(grid, boxRows, boxCols);

          expect(result.status).toBe('unique');
          expect((result as { status: 'unique'; solution: number[][] }).solution).toEqual(solution);
        }
      ),
      { numRuns: 5 }
    );
  });
});
