import { describe, it, expect } from 'vitest';
import { mapDifficultyToParams } from './difficulty.util';

describe('mapDifficultyToParams', () => {
  describe('Tier 1 (difficulty 1–5)', () => {
    it.each([1, 2, 3, 4, 5])('difficulty %i returns tier 1 params', (d) => {
      const params = mapDifficultyToParams(d);
      expect(params.responseWindowMs).toBe(3000);
      expect(params.congruentRatio).toBe(0.40);
      expect(params.conflictTypes).toEqual(['classic_stroop']);
      expect(params.optionsCount).toBe(3);
      expect(params.visualNoise).toBe('none');
    });
  });

  describe('Tier 2 (difficulty 6–10)', () => {
    it.each([6, 7, 8, 9, 10])('difficulty %i returns tier 2 params', (d) => {
      const params = mapDifficultyToParams(d);
      expect(params.responseWindowMs).toBe(2000);
      expect(params.congruentRatio).toBe(0.30);
      expect(params.conflictTypes).toEqual(['classic_stroop', 'semantic_interference']);
      expect(params.optionsCount).toBe(4);
      expect(params.visualNoise).toBe('size_variation');
    });
  });

  describe('Tier 3 (difficulty 11–15)', () => {
    it.each([11, 12, 13, 14, 15])('difficulty %i returns tier 3 params', (d) => {
      const params = mapDifficultyToParams(d);
      expect(params.responseWindowMs).toBe(1200);
      expect(params.congruentRatio).toBe(0.20);
      expect(params.conflictTypes).toEqual(['classic_stroop', 'semantic_interference', 'response_competition']);
      expect(params.optionsCount).toBe(5);
      expect(params.visualNoise).toBe('size_rotation');
    });
  });

  describe('Tier 4 (difficulty 16–20)', () => {
    it.each([16, 17, 18, 19, 20])('difficulty %i returns tier 4 params', (d) => {
      const params = mapDifficultyToParams(d);
      expect(params.responseWindowMs).toBe(800);
      expect(params.congruentRatio).toBe(0.10);
      expect(params.conflictTypes).toEqual(['classic_stroop', 'semantic_interference', 'response_competition']);
      expect(params.optionsCount).toBe(6);
      expect(params.visualNoise).toBe('size_rotation_pulse');
    });
  });

  describe('clamping', () => {
    it('clamps values below 1 to tier 1', () => {
      const params = mapDifficultyToParams(0);
      expect(params.responseWindowMs).toBe(3000);
      expect(params.optionsCount).toBe(3);
    });

    it('clamps negative values to tier 1', () => {
      const params = mapDifficultyToParams(-5);
      expect(params.responseWindowMs).toBe(3000);
      expect(params.optionsCount).toBe(3);
    });

    it('clamps values above 20 to tier 4', () => {
      const params = mapDifficultyToParams(25);
      expect(params.responseWindowMs).toBe(800);
      expect(params.optionsCount).toBe(6);
    });
  });
});

import * as fc from 'fast-check';

describe('difficulty monotonicity property-based tests', () => {
  /**
   * Property 3: Higher difficulty always produces equal or harder params on every axis.
   * For all a < b in [1, 20]:
   *   pb.responseWindowMs ≤ pa.responseWindowMs
   *   pb.congruentRatio ≤ pa.congruentRatio
   *   pb.optionsCount ≥ pa.optionsCount
   * **Validates: Requirements 5.3**
   */
  it('Property 3: difficulty monotonicity — harder difficulty means harder params', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 19 }),
        fc.integer({ min: 2, max: 20 }),
        (a, b) => {
          fc.pre(a < b);
          const pa = mapDifficultyToParams(a);
          const pb = mapDifficultyToParams(b);

          expect(pb.responseWindowMs).toBeLessThanOrEqual(pa.responseWindowMs);
          expect(pb.congruentRatio).toBeLessThanOrEqual(pa.congruentRatio);
          expect(pb.optionsCount).toBeGreaterThanOrEqual(pa.optionsCount);
        },
      ),
    );
  });
});
