import { describe, it, expect } from 'vitest';
import { mapDifficultyToParams } from './difficulty.util';

describe('mapDifficultyToParams', () => {
  describe('clamping', () => {
    it('should clamp difficulty below 1 to 1', () => {
      const params = mapDifficultyToParams(0);
      expect(params).toEqual(mapDifficultyToParams(1));
    });

    it('should clamp difficulty above 100 to 100', () => {
      const params = mapDifficultyToParams(150);
      expect(params).toEqual(mapDifficultyToParams(100));
    });

    it('should round fractional difficulty', () => {
      const params = mapDifficultyToParams(25.7);
      expect(params).toEqual(mapDifficultyToParams(26));
    });
  });

  describe('beginner tier (1–25)', () => {
    it('should return null memorization time at level 1', () => {
      const params = mapDifficultyToParams(1);
      expect(params.memorizationTimeSec).toBeNull();
    });

    it('should return 15s memorization time at level 25', () => {
      const params = mapDifficultyToParams(25);
      expect(params.memorizationTimeSec).toBe(15);
    });

    it('should return complexity range 3–4', () => {
      const params = mapDifficultyToParams(10);
      expect(params.complexityRange).toEqual({ min: 3, max: 4 });
    });

    it('should enable only front and right directions', () => {
      const params = mapDifficultyToParams(10);
      expect(params.enabledDirections).toEqual(['front', 'right']);
    });

    it('should have 0 near-miss ratio', () => {
      const params = mapDifficultyToParams(10);
      expect(params.nearMissRatio).toBe(0);
    });

    it('should have null response window', () => {
      const params = mapDifficultyToParams(10);
      expect(params.responseWindowMs).toBeNull();
    });

    it('should require symmetric shapes', () => {
      const params = mapDifficultyToParams(10);
      expect(params.symmetric).toBe(true);
    });
  });

  describe('intermediate tier (26–50)', () => {
    it('should return 12s memorization time at level 26', () => {
      const params = mapDifficultyToParams(26);
      expect(params.memorizationTimeSec).toBe(12);
    });

    it('should return 8s memorization time at level 50', () => {
      const params = mapDifficultyToParams(50);
      expect(params.memorizationTimeSec).toBe(8);
    });

    it('should return complexity range 4–6', () => {
      const params = mapDifficultyToParams(38);
      expect(params.complexityRange).toEqual({ min: 4, max: 6 });
    });

    it('should enable 4 directions', () => {
      const params = mapDifficultyToParams(38);
      expect(params.enabledDirections).toEqual(['front', 'right', 'back', 'left']);
    });

    it('should have 0.3 near-miss ratio at level 26', () => {
      const params = mapDifficultyToParams(26);
      expect(params.nearMissRatio).toBeCloseTo(0.3);
    });

    it('should have 0.5 near-miss ratio at level 50', () => {
      const params = mapDifficultyToParams(50);
      expect(params.nearMissRatio).toBeCloseTo(0.5);
    });

    it('should have 15000ms response window at level 26', () => {
      const params = mapDifficultyToParams(26);
      expect(params.responseWindowMs).toBe(15000);
    });

    it('should have 10000ms response window at level 50', () => {
      const params = mapDifficultyToParams(50);
      expect(params.responseWindowMs).toBe(10000);
    });

    it('should not require symmetric shapes', () => {
      const params = mapDifficultyToParams(38);
      expect(params.symmetric).toBe(false);
    });
  });

  describe('advanced tier (51–75)', () => {
    it('should return 7s memorization time at level 51', () => {
      const params = mapDifficultyToParams(51);
      expect(params.memorizationTimeSec).toBe(7);
    });

    it('should return 5s memorization time at level 75', () => {
      const params = mapDifficultyToParams(75);
      expect(params.memorizationTimeSec).toBe(5);
    });

    it('should return complexity range 6–9', () => {
      const params = mapDifficultyToParams(63);
      expect(params.complexityRange).toEqual({ min: 6, max: 9 });
    });

    it('should enable all 6 directions', () => {
      const params = mapDifficultyToParams(63);
      expect(params.enabledDirections).toEqual(['front', 'back', 'left', 'right', 'top', 'bottom']);
    });

    it('should have 0.6 near-miss ratio at level 51', () => {
      const params = mapDifficultyToParams(51);
      expect(params.nearMissRatio).toBeCloseTo(0.6);
    });

    it('should have 0.8 near-miss ratio at level 75', () => {
      const params = mapDifficultyToParams(75);
      expect(params.nearMissRatio).toBeCloseTo(0.8);
    });

    it('should have 10000ms response window at level 51', () => {
      const params = mapDifficultyToParams(51);
      expect(params.responseWindowMs).toBe(10000);
    });

    it('should have 6000ms response window at level 75', () => {
      const params = mapDifficultyToParams(75);
      expect(params.responseWindowMs).toBe(6000);
    });

    it('should not require symmetric shapes', () => {
      const params = mapDifficultyToParams(63);
      expect(params.symmetric).toBe(false);
    });
  });

  describe('expert tier (76–100)', () => {
    it('should return 5s memorization time at level 76', () => {
      const params = mapDifficultyToParams(76);
      expect(params.memorizationTimeSec).toBe(5);
    });

    it('should return 3s memorization time at level 100', () => {
      const params = mapDifficultyToParams(100);
      expect(params.memorizationTimeSec).toBe(3);
    });

    it('should return complexity range 8–12', () => {
      const params = mapDifficultyToParams(88);
      expect(params.complexityRange).toEqual({ min: 8, max: 12 });
    });

    it('should enable all 6 directions', () => {
      const params = mapDifficultyToParams(88);
      expect(params.enabledDirections).toEqual(['front', 'back', 'left', 'right', 'top', 'bottom']);
    });

    it('should have 1.0 near-miss ratio', () => {
      const params = mapDifficultyToParams(88);
      expect(params.nearMissRatio).toBe(1.0);
    });

    it('should have 6000ms response window at level 76', () => {
      const params = mapDifficultyToParams(76);
      expect(params.responseWindowMs).toBe(6000);
    });

    it('should have 4000ms response window at level 100', () => {
      const params = mapDifficultyToParams(100);
      expect(params.responseWindowMs).toBe(4000);
    });

    it('should not require symmetric shapes', () => {
      const params = mapDifficultyToParams(88);
      expect(params.symmetric).toBe(false);
    });
  });

  describe('monotonicity', () => {
    it('should produce monotonically harder params as difficulty increases', () => {
      for (let d = 1; d < 100; d++) {
        const a = mapDifficultyToParams(d);
        const b = mapDifficultyToParams(d + 1);

        expect(b.complexityRange.min).toBeGreaterThanOrEqual(a.complexityRange.min);
        expect(b.complexityRange.max).toBeGreaterThanOrEqual(a.complexityRange.max);
        expect(b.enabledDirections.length).toBeGreaterThanOrEqual(a.enabledDirections.length);
        expect(b.nearMissRatio).toBeGreaterThanOrEqual(a.nearMissRatio);

        // Memorization time: null = infinity, so null >= any number
        if (a.memorizationTimeSec !== null && b.memorizationTimeSec !== null) {
          expect(b.memorizationTimeSec).toBeLessThanOrEqual(a.memorizationTimeSec);
        } else if (a.memorizationTimeSec === null) {
          // null (infinity) is the "easiest" — b can be anything
        } else {
          // a is finite, b is null — this would violate monotonicity
          fail(`Level ${d + 1} has null memorization but level ${d} has ${a.memorizationTimeSec}`);
        }

        // Response window: null = infinity, so null >= any number
        if (a.responseWindowMs !== null && b.responseWindowMs !== null) {
          expect(b.responseWindowMs).toBeLessThanOrEqual(a.responseWindowMs);
        } else if (a.responseWindowMs === null) {
          // null (infinity) is the "easiest" — b can be anything
        } else {
          fail(`Level ${d + 1} has null response window but level ${d} has ${a.responseWindowMs}`);
        }
      }
    });
  });

  describe('pure function', () => {
    it('should return identical results for the same input', () => {
      for (const d of [1, 13, 25, 26, 38, 50, 51, 63, 75, 76, 88, 100]) {
        expect(mapDifficultyToParams(d)).toEqual(mapDifficultyToParams(d));
      }
    });
  });
});
