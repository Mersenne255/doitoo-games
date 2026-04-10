import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { initialScoringState, processPuzzleResult, calculateRoundResult } from './scoring.util';
import { PuzzleResult, CompletionStatus, DEFAULT_CONFIG } from '../models/game.models';

describe('scoring', () => {
  it('initial state is zeroed', () => {
    const s = initialScoringState();
    expect(s.puzzlesSolved).toBe(0);
    expect(s.puzzleCount).toBe(0);
  });

  it('solved puzzle increments solved count and streak', () => {
    let s = initialScoringState();
    s = processPuzzleResult(s, { status: 'solved', solveTimeSec: 30, hintsUsed: 0, errorCount: 0 });
    expect(s.puzzlesSolved).toBe(1);
    expect(s.currentNoHintStreak).toBe(1);
    expect(s.longestNoHintStreak).toBe(1);
  });

  it('timed_out breaks streak', () => {
    let s = initialScoringState();
    s = processPuzzleResult(s, { status: 'solved', solveTimeSec: 10, hintsUsed: 0, errorCount: 0 });
    s = processPuzzleResult(s, { status: 'timed_out', solveTimeSec: 60, hintsUsed: 0, errorCount: 0 });
    expect(s.currentNoHintStreak).toBe(0);
    expect(s.longestNoHintStreak).toBe(1);
  });

  it('gave_up breaks streak', () => {
    let s = initialScoringState();
    s = processPuzzleResult(s, { status: 'gave_up', solveTimeSec: 0, hintsUsed: 0, errorCount: 0 });
    expect(s.puzzlesGaveUp).toBe(1);
    expect(s.currentNoHintStreak).toBe(0);
  });

  it('round result accuracy = solved/total × 100', () => {
    let s = initialScoringState();
    s = processPuzzleResult(s, { status: 'solved', solveTimeSec: 10, hintsUsed: 0, errorCount: 0 });
    s = processPuzzleResult(s, { status: 'gave_up', solveTimeSec: 0, hintsUsed: 0, errorCount: 0 });
    const r = calculateRoundResult(s, DEFAULT_CONFIG);
    expect(r.accuracy).toBe(50);
    expect(r.totalPuzzles).toBe(2);
  });

  /** Property 19: scoring accumulation */
  it('Property 19: accumulation is correct', () => {
    const statusArb = fc.constantFrom<CompletionStatus>('solved', 'timed_out', 'gave_up');
    const resultArb = fc.record({
      status: statusArb,
      solveTimeSec: fc.integer({ min: 0, max: 300 }),
      hintsUsed: fc.integer({ min: 0, max: 5 }),
      errorCount: fc.integer({ min: 0, max: 20 }),
    }) as fc.Arbitrary<PuzzleResult>;

    fc.assert(
      fc.property(fc.array(resultArb, { minLength: 1, maxLength: 5 }), (results) => {
        let s = initialScoringState();
        for (const r of results) s = processPuzzleResult(s, r);
        const solved = results.filter(r => r.status === 'solved').length;
        expect(s.puzzlesSolved).toBe(solved);
        expect(s.totalHintsUsed).toBe(results.reduce((a, r) => a + r.hintsUsed, 0));
        expect(s.puzzleCount).toBe(results.length);
        const round = calculateRoundResult(s, DEFAULT_CONFIG);
        expect(round.accuracy).toBeCloseTo(solved / results.length * 100, 5);
      }),
      { numRuns: 10 },
    );
  });
});
