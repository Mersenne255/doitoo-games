import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mapDifficultyToParams, getTimeLimitSec, getHintLimit } from './difficulty.util';
import { TECHNIQUE_ORDER, TechniqueName } from '../models/game.models';

function techIdx(t: TechniqueName): number {
  return TECHNIQUE_ORDER.indexOf(t);
}

describe('difficulty mapping — unit tests', () => {
  it('level 1 → beginner tier (2,2)', () => {
    const p = mapDifficultyToParams(1);
    expect(p.boxDimension).toEqual([2, 2]);
    expect(p.techniqueCeiling).toBe('naked_single');
    expect(p.givenCountRange.min).toBeGreaterThanOrEqual(7);
    expect(p.givenCountRange.max).toBeLessThanOrEqual(10);
  });

  it('level 50 → intermediate tier (3,3)', () => {
    const p = mapDifficultyToParams(50);
    expect(p.boxDimension).toEqual([3, 3]);
    expect(p.techniqueCeiling).toBe('naked_pair');
  });

  it('level 100 → expert tier (3,3)', () => {
    const p = mapDifficultyToParams(100);
    expect(p.boxDimension).toEqual([3, 3]);
    expect(p.techniqueCeiling).toBe('backtrack_guess');
    expect(p.givenCountRange.min).toBeGreaterThanOrEqual(17);
    expect(p.givenCountRange.max).toBeLessThanOrEqual(22);
  });
});

describe('difficulty mapping — property tests', () => {
  /** Property 2: monotonicity — within same grid size, harder = fewer givens */
  it('Property 2: higher difficulty → equal or harder technique ceiling', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (a) => {
          const pa = mapDifficultyToParams(a);
          const pb = mapDifficultyToParams(a + 1);
          // Technique ceiling should be monotonically non-decreasing
          expect(techIdx(pb.techniqueCeiling)).toBeGreaterThanOrEqual(techIdx(pa.techniqueCeiling));
          // Within the same grid size, givens should be non-increasing
          const gsA = pa.boxDimension[0] * pa.boxDimension[1];
          const gsB = pb.boxDimension[0] * pb.boxDimension[1];
          if (gsA === gsB) {
            expect(pb.givenCountRange.max).toBeLessThanOrEqual(pa.givenCountRange.max);
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  /** Property 3: tier bounds */
  it('Property 3: params within tier bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (d) => {
        const p = mapDifficultyToParams(d);
        if (d <= 15) {
          expect(p.boxDimension).toEqual([2, 2]);
          expect(p.givenCountRange.min).toBeGreaterThanOrEqual(7);
          expect(p.givenCountRange.max).toBeLessThanOrEqual(10);
          expect(p.techniqueCeiling).toBe('naked_single');
        } else if (d <= 35) {
          expect(p.boxDimension).toEqual([2, 3]);
          expect(p.givenCountRange.min).toBeGreaterThanOrEqual(17);
          expect(p.givenCountRange.max).toBeLessThanOrEqual(24);
        } else if (d <= 60) {
          expect(p.boxDimension).toEqual([3, 3]);
          expect(p.givenCountRange.min).toBeGreaterThanOrEqual(28);
          expect(p.givenCountRange.max).toBeLessThanOrEqual(36);
        } else if (d <= 80) {
          expect(p.boxDimension).toEqual([3, 3]);
          expect(p.givenCountRange.min).toBeGreaterThanOrEqual(23);
          expect(p.givenCountRange.max).toBeLessThanOrEqual(27);
        } else {
          expect(p.boxDimension).toEqual([3, 3]);
          expect(p.givenCountRange.min).toBeGreaterThanOrEqual(17);
          expect(p.givenCountRange.max).toBeLessThanOrEqual(22);
        }
      }),
      { numRuns: 10 },
    );
  });

  /** Property 4: box dimension override */
  it('Property 4: override box dimension is respected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom<[number, number]>([2, 2], [2, 3], [3, 3]),
        (d, boxDim) => {
          const p = mapDifficultyToParams(d, boxDim);
          expect(p.boxDimension).toEqual(boxDim);
        },
      ),
      { numRuns: 10 },
    );
  });

  /** Property 5: speed mode time limits */
  it('Property 5: speed mode time limit formulas', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.constantFrom(4, 6, 9),
        (d, gs) => {
          expect(getTimeLimitSec(d, gs, 'relaxed')).toBeNull();
          const std = getTimeLimitSec(d, gs, 'standard')!;
          expect(std).toBeCloseTo(gs * gs * (3 - d / 100), 5);
          const intense = getTimeLimitSec(d, gs, 'intense')!;
          expect(intense).toBeCloseTo(gs * gs * (1.5 - d * 0.75 / 100), 5);
        },
      ),
      { numRuns: 10 },
    );
  });
});

describe('hint limits', () => {
  it('relaxed → unlimited, standard → 3, intense → 0', () => {
    expect(getHintLimit('relaxed')).toBeNull();
    expect(getHintLimit('standard')).toBe(3);
    expect(getHintLimit('intense')).toBe(0);
  });
});
