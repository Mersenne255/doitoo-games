import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTrials } from './trial-generator.util';
import { mapDifficultyToParams } from './difficulty.util';
import { COLOR_NAMES, COLOR_DISPLAY_LABELS } from '../models/game.models';

const seedArb = fc.integer();
const difficultyArb = fc.integer({ min: 1, max: 20 });
const trialCountArb = fc.integer({ min: 10, max: 50 });

describe('trial-generator property-based tests', () => {
  /**
   * Property 1: Every generated trial has exactly one correct answer (inkColor) among options.
   * **Validates: Requirements 6.3**
   */
  it('Property 1: every trial has exactly one correct answer among options', () => {
    fc.assert(
      fc.property(trialCountArb, difficultyArb, seedArb, (trialCount, difficulty, seed) => {
        const params = mapDifficultyToParams(difficulty);
        const trials = generateTrials(trialCount, params, seed);

        expect(trials.length).toBe(trialCount);
        for (const trial of trials) {
          const correctCount = trial.options.filter(o => o === trial.inkColor).length;
          expect(correctCount).toBe(1);
        }
      }),
    );
  });

  /**
   * Property 2: Congruent ratio matches configured ratio within ±15% tolerance for rounds ≥ 20 trials.
   * **Validates: Requirements 6.4**
   */
  it('Property 2: congruent ratio within ±15% tolerance for rounds >= 20', () => {
    const largeTrialCountArb = fc.integer({ min: 20, max: 50 });

    fc.assert(
      fc.property(largeTrialCountArb, difficultyArb, seedArb, (trialCount, difficulty, seed) => {
        const params = mapDifficultyToParams(difficulty);
        const trials = generateTrials(trialCount, params, seed);
        const actualRatio = trials.filter(t => t.congruent).length / trials.length;

        expect(Math.abs(actualRatio - params.congruentRatio)).toBeLessThanOrEqual(0.15);
      }),
    );
  });

  /**
   * Property 7: All incongruent trials have word ≠ COLOR_DISPLAY_LABELS[inkColor]
   * (for classic_stroop and semantic_interference conflict types).
   * **Validates: Requirements 6.8**
   */
  it('Property 7: incongruent trials have word ≠ ink color display label', () => {
    fc.assert(
      fc.property(trialCountArb, difficultyArb, seedArb, (trialCount, difficulty, seed) => {
        const params = mapDifficultyToParams(difficulty);
        const trials = generateTrials(trialCount, params, seed);

        for (const trial of trials) {
          if (
            !trial.congruent &&
            (trial.conflictType === 'classic_stroop' || trial.conflictType === 'semantic_interference')
          ) {
            expect(trial.word).not.toBe(COLOR_DISPLAY_LABELS[trial.inkColor]);
          }
        }
      }),
    );
  });

  /**
   * Property 8: All trial colors come from the defined COLOR_NAMES palette.
   * **Validates: Requirements 6.7**
   */
  it('Property 8: all trial colors come from COLOR_NAMES palette', () => {
    const palette = [...COLOR_NAMES] as string[];

    fc.assert(
      fc.property(trialCountArb, difficultyArb, seedArb, (trialCount, difficulty, seed) => {
        const params = mapDifficultyToParams(difficulty);
        const trials = generateTrials(trialCount, params, seed);

        for (const trial of trials) {
          expect(palette).toContain(trial.inkColor);
          for (const option of trial.options) {
            expect(palette).toContain(option);
          }
        }
      }),
    );
  });

  /**
   * Property 9: Trial generation is deterministic — same inputs produce same output.
   * **Validates: Requirements 6.2**
   */
  it('Property 9: trial generation is deterministic', () => {
    fc.assert(
      fc.property(trialCountArb, difficultyArb, seedArb, (trialCount, difficulty, seed) => {
        const params = mapDifficultyToParams(difficulty);
        const a = generateTrials(trialCount, params, seed);
        const b = generateTrials(trialCount, params, seed);

        expect(a).toEqual(b);
      }),
    );
  });
});
