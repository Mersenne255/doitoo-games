import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generatePuzzle, generateRound } from './puzzle-generator.util';
import { solve } from './solver.util';
import { explain } from './explainer.util';
import { DifficultyParams, TECHNIQUE_ORDER, TechniqueName } from '../models/game.models';

const params4x4: DifficultyParams = {
  boxDimension: [2, 2],
  givenCountRange: { min: 7, max: 10 },
  techniqueCeiling: 'naked_single',
};

function countGivens(grid: number[][]): number {
  let count = 0;
  for (const row of grid) for (const v of row) if (v !== 0) count++;
  return count;
}

function techniqueIndex(t: TechniqueName): number {
  return TECHNIQUE_ORDER.indexOf(t);
}

describe('puzzle-generator', () => {
  /**
   * Feature: sudoku-game, Property 6: determinism
   * Same seed + same params → identical puzzle.
   */
  it('Property 6: deterministic output for same inputs', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), (seed) => {
        const a = generatePuzzle(2, 2, params4x4, seed);
        const b = generatePuzzle(2, 2, params4x4, seed);
        expect(a.grid).toEqual(b.grid);
        expect(a.solution).toEqual(b.solution);
      }),
      { numRuns: 3 },
    );
  });

  /**
   * Feature: sudoku-game, Property 7: unique solvability
   * Solver returns 'unique' with matching solution.
   */
  it('Property 7: generated puzzles have unique solutions', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), (seed) => {
        const puzzle = generatePuzzle(2, 2, params4x4, seed);
        const result = solve(puzzle.grid, 2, 2);
        expect(result.status).toBe('unique');
        if (result.status === 'unique') {
          expect(result.solution).toEqual(puzzle.solution);
        }
      }),
      { numRuns: 3 },
    );
  });

  /**
   * Feature: sudoku-game, Property 9: given count in range
   */
  it('Property 9: given count falls within difficulty range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), (seed) => {
        const puzzle = generatePuzzle(2, 2, params4x4, seed);
        const givens = countGivens(puzzle.grid);
        expect(givens).toBeGreaterThanOrEqual(params4x4.givenCountRange.min);
        expect(givens).toBeLessThanOrEqual(params4x4.givenCountRange.max);
      }),
      { numRuns: 3 },
    );
  });

  /**
   * Feature: sudoku-game, Property 10: technique ceiling respected
   */
  it('Property 10: no technique exceeds ceiling (excluding backtrack_guess)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), (seed) => {
        const puzzle = generatePuzzle(2, 2, params4x4, seed);
        const steps = explain(puzzle.grid, 2, 2);
        const ceilingIdx = techniqueIndex(params4x4.techniqueCeiling);
        const backtrackIdx = techniqueIndex('backtrack_guess');
        for (const step of steps) {
          const idx = techniqueIndex(step.technique);
          if (idx !== backtrackIdx) {
            expect(idx).toBeLessThanOrEqual(ceilingIdx);
          }
        }
      }),
      { numRuns: 3 },
    );
  });

  /**
   * Feature: sudoku-game, Property 21: distinct puzzles in round
   */
  it('Property 21: no two puzzles in a round have identical grids', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), (seed) => {
        const puzzles = generateRound(3, 2, 2, params4x4, seed);
        expect(puzzles.length).toBe(3);
        for (let i = 0; i < puzzles.length; i++) {
          for (let j = i + 1; j < puzzles.length; j++) {
            expect(JSON.stringify(puzzles[i].grid)).not.toBe(JSON.stringify(puzzles[j].grid));
          }
        }
      }),
      { numRuns: 3 },
    );
  });
});
