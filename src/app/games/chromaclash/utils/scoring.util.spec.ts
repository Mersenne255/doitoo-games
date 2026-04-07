import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateAccuracy,
  initialScoringState,
  processTrialResult,
} from './scoring.util';
import {
  ColorName,
  COLOR_NAMES,
  COLOR_DISPLAY_LABELS,
  ScoringState,
  TrialResult,
  Trial,
} from '../models/game.models';

/** Helper: build a minimal Trial for testing. */
function makeTrial(inkColor: ColorName = 'red'): Trial {
  return {
    word: COLOR_DISPLAY_LABELS[inkColor],
    inkColor,
    congruent: true,
    conflictType: 'classic_stroop',
    options: [inkColor],
  };
}

/** Helper: build a TrialResult from a boolean (correct/incorrect/timeout). */
function makeResult(correct: boolean, timedOut = false): TrialResult {
  const trial = makeTrial();
  if (timedOut) {
    return { trial, selectedColor: null, correct: false, responseTimeMs: null };
  }
  return {
    trial,
    selectedColor: correct ? trial.inkColor : 'blue',
    correct,
    responseTimeMs: 500,
  };
}

describe('scoring property-based tests', () => {
  /**
   * Property 4: accuracy = correct/total * 100, always in [0, 100].
   * **Validates: Requirements 9.1**
   */
  it('Property 4: accuracy is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (correct, total) => {
          fc.pre(correct <= total);
          const acc = calculateAccuracy(correct, total);
          expect(acc).toBeGreaterThanOrEqual(0);
          expect(acc).toBeLessThanOrEqual(100);
          // Verify formula: correct/total * 100
          expect(acc).toBeCloseTo((correct / total) * 100, 10);
        },
      ),
    );
  });

  /**
   * Property 5: Streak resets on incorrect, increments on correct, longestStreak tracks max.
   * **Validates: Requirements 9.3, 9.6, 9.7**
   */
  it('Property 5: streak tracking correctness', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
        (sequence) => {
          const responseWindowMs = 3000;
          let state = initialScoringState();

          for (const correct of sequence) {
            const result = makeResult(correct);
            state = processTrialResult(state, result, responseWindowMs);
          }

          // Compute expected streak values from the boolean sequence
          let expectedCurrent = 0;
          let expectedLongest = 0;
          for (const correct of sequence) {
            if (correct) {
              expectedCurrent++;
            } else {
              expectedCurrent = 0;
            }
            expectedLongest = Math.max(expectedLongest, expectedCurrent);
          }

          expect(state.currentStreak).toBe(expectedCurrent);
          expect(state.longestStreak).toBe(expectedLongest);
        },
      ),
    );
  });

  /**
   * Property 10: correctCount + incorrectCount + timedOutCount = total trial count.
   * **Validates: Requirements 9.4**
   */
  it('Property 10: correctCount + incorrectCount + timedOutCount = total', () => {
    // Arbitrary: 0 = correct, 1 = incorrect, 2 = timed out
    const outcomeArb = fc.integer({ min: 0, max: 2 });

    fc.assert(
      fc.property(
        fc.array(outcomeArb, { minLength: 1, maxLength: 100 }),
        (outcomes) => {
          const responseWindowMs = 3000;
          let state = initialScoringState();

          for (const outcome of outcomes) {
            let result: TrialResult;
            if (outcome === 0) {
              result = makeResult(true);
            } else if (outcome === 1) {
              result = makeResult(false);
            } else {
              result = makeResult(false, true); // timed out
            }
            state = processTrialResult(state, result, responseWindowMs);
          }

          expect(state.correctCount + state.incorrectCount + state.timedOutCount).toBe(
            outcomes.length,
          );
        },
      ),
    );
  });
});
