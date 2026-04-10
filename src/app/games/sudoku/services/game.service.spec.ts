import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { initPuzzleGrid, findConflicts } from './game.service';
import { generateRound } from '../utils/puzzle-generator.util';
import { CellState, Puzzle } from '../models/game.models';

// ── Helpers ──

function make4x4Solution(): number[][] {
  return [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 3, 4, 1],
    [4, 1, 2, 3],
  ];
}

function makePuzzle(): Puzzle {
  return {
    grid: [
      [1, 2, 0, 0],
      [0, 0, 1, 2],
      [2, 0, 4, 1],
      [4, 1, 2, 0],
    ],
    solution: make4x4Solution(),
    boxRows: 2,
    boxCols: 2,
  };
}

function makeFullGrid(solution: number[][]): CellState[][] {
  return solution.map(row =>
    row.map(v => ({ value: v, pencilMarks: new Set<number>(), isGiven: false })),
  );
}

describe('game service helpers', () => {
  /** Property 17: conflict detection */
  it('Property 17: detects row/col/box duplicates', () => {
    // Grid with duplicate 1 in row 0
    const grid: CellState[][] = [
      [{ value: 1, pencilMarks: new Set(), isGiven: false }, { value: 1, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }],
      [{ value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }],
      [{ value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }],
      [{ value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }, { value: 0, pencilMarks: new Set(), isGiven: false }],
    ];
    const conflicts = findConflicts(grid, 2, 2);
    expect(conflicts.has('0,0')).toBe(true);
    expect(conflicts.has('0,1')).toBe(true);
  });

  it('Property 17: no conflicts in valid grid', () => {
    const grid = makeFullGrid(make4x4Solution());
    const conflicts = findConflicts(grid, 2, 2);
    expect(conflicts.size).toBe(0);
  });

  it('Property 17: empty cells never flagged', () => {
    const grid: CellState[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => ({ value: 0, pencilMarks: new Set<number>(), isGiven: false })),
    );
    expect(findConflicts(grid, 2, 2).size).toBe(0);
  });

  /** Property 18: completion check */
  it('Property 18: valid complete grid passes', () => {
    const grid = makeFullGrid(make4x4Solution());
    const allFilled = grid.every(r => r.every(c => c.value !== 0));
    expect(allFilled).toBe(true);
    expect(findConflicts(grid, 2, 2).size).toBe(0);
  });

  it('Property 18: invalid complete grid has conflicts', () => {
    const sol = make4x4Solution();
    sol[0][0] = sol[0][1]; // introduce duplicate
    const grid = makeFullGrid(sol);
    expect(findConflicts(grid, 2, 2).size).toBeGreaterThan(0);
  });

  /** Property 20: round generation count */
  it('Property 20: generateRound produces correct puzzle count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 99999 }),
        (count, seed) => {
          const puzzles = generateRound(count, 2, 2, {
            boxDimension: [2, 2],
            givenCountRange: { min: 7, max: 10 },
            techniqueCeiling: 'naked_single',
          }, seed);
          expect(puzzles.length).toBe(count);
          for (const p of puzzles) {
            expect(p.boxRows).toBe(2);
            expect(p.boxCols).toBe(2);
          }
        },
      ),
      { numRuns: 3 },
    );
  });

  /** initPuzzleGrid */
  it('initPuzzleGrid creates correct grid from puzzle', () => {
    const puzzle = makePuzzle();
    const grid = initPuzzleGrid(puzzle);
    expect(grid.length).toBe(4);
    expect(grid[0][0].value).toBe(1);
    expect(grid[0][0].isGiven).toBe(true);
    expect(grid[0][2].value).toBe(0);
    expect(grid[0][2].isGiven).toBe(false);
  });
});
