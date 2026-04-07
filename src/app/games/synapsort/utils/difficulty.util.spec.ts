import { describe, it, expect } from 'vitest';
import { mapDifficultyToParams } from './difficulty.util';

describe('mapDifficultyToParams', () => {
  describe('Beginner tier (difficulty 1–5)', () => {
    it('difficulty 1 returns beginner start params', () => {
      const p = mapDifficultyToParams(1);
      expect(p.responseWindowMs).toBe(5000);
      expect(p.enabledRules).toEqual(['shape', 'color']);
      expect(p.switchThresholdMin).toBe(6);
      expect(p.switchThresholdMax).toBe(8);
      expect(p.pileCount).toBe(3);
      expect(p.distractorQuality).toBe('low');
      expect(p.visualNoise).toBe('none');
    });

    it('difficulty 5 returns beginner end params', () => {
      const p = mapDifficultyToParams(5);
      expect(p.responseWindowMs).toBe(4000);
      expect(p.enabledRules).toEqual(['shape', 'color']);
      expect(p.switchThresholdMin).toBe(6);
      expect(p.switchThresholdMax).toBe(8);
      expect(p.pileCount).toBe(3);
      expect(p.distractorQuality).toBe('low');
      expect(p.visualNoise).toBe('none');
    });

    it('difficulty 3 interpolates response window', () => {
      const p = mapDifficultyToParams(3);
      expect(p.responseWindowMs).toBe(4500);
    });
  });

  describe('Intermediate tier (difficulty 6–10)', () => {
    it('difficulty 6 returns intermediate start params', () => {
      const p = mapDifficultyToParams(6);
      expect(p.responseWindowMs).toBe(3500);
      expect(p.enabledRules).toEqual(['shape', 'color', 'count']);
      expect(p.switchThresholdMin).toBe(5);
      expect(p.switchThresholdMax).toBe(7);
      expect(p.pileCount).toBe(4);
      expect(p.distractorQuality).toBe('medium');
      expect(p.visualNoise).toBe('none');
    });

    it('difficulty 10 returns intermediate end params', () => {
      const p = mapDifficultyToParams(10);
      expect(p.responseWindowMs).toBe(2500);
    });
  });

  describe('Advanced tier (difficulty 11–15)', () => {
    it('difficulty 11 returns advanced start params', () => {
      const p = mapDifficultyToParams(11);
      expect(p.responseWindowMs).toBe(2200);
      expect(p.enabledRules).toEqual(['shape', 'color', 'count', 'compound']);
      expect(p.switchThresholdMin).toBe(4);
      expect(p.switchThresholdMax).toBe(6);
      expect(p.pileCount).toBe(4);
      expect(p.distractorQuality).toBe('high');
      expect(p.visualNoise).toBe('size_variation');
    });

    it('difficulty 15 returns advanced end params', () => {
      const p = mapDifficultyToParams(15);
      expect(p.responseWindowMs).toBe(1800);
    });
  });

  describe('Expert tier (difficulty 16–20)', () => {
    it('difficulty 16 returns expert start params', () => {
      const p = mapDifficultyToParams(16);
      expect(p.responseWindowMs).toBe(1700);
      expect(p.enabledRules).toEqual(['shape', 'color', 'count', 'compound']);
      expect(p.switchThresholdMin).toBe(3);
      expect(p.switchThresholdMax).toBe(4);
      expect(p.pileCount).toBe(4);
      expect(p.distractorQuality).toBe('maximum');
      expect(p.visualNoise).toBe('size_variation_rotation');
    });

    it('difficulty 20 returns expert end params', () => {
      const p = mapDifficultyToParams(20);
      expect(p.responseWindowMs).toBe(1500);
    });
  });

  describe('clamping', () => {
    it('clamps values below 1 to beginner start', () => {
      const p = mapDifficultyToParams(0);
      expect(p.responseWindowMs).toBe(5000);
      expect(p.pileCount).toBe(3);
    });

    it('clamps negative values to beginner start', () => {
      const p = mapDifficultyToParams(-5);
      expect(p.responseWindowMs).toBe(5000);
    });

    it('clamps values above 20 to expert end', () => {
      const p = mapDifficultyToParams(25);
      expect(p.responseWindowMs).toBe(1500);
      expect(p.distractorQuality).toBe('maximum');
    });
  });

  describe('monotonicity across all levels', () => {
    it('response window is non-increasing', () => {
      for (let d = 1; d < 20; d++) {
        const a = mapDifficultyToParams(d);
        const b = mapDifficultyToParams(d + 1);
        expect(b.responseWindowMs).toBeLessThanOrEqual(a.responseWindowMs);
      }
    });

    it('switch threshold max is non-increasing', () => {
      for (let d = 1; d < 20; d++) {
        const a = mapDifficultyToParams(d);
        const b = mapDifficultyToParams(d + 1);
        expect(b.switchThresholdMax).toBeLessThanOrEqual(a.switchThresholdMax);
      }
    });

    it('pile count is non-decreasing', () => {
      for (let d = 1; d < 20; d++) {
        const a = mapDifficultyToParams(d);
        const b = mapDifficultyToParams(d + 1);
        expect(b.pileCount).toBeGreaterThanOrEqual(a.pileCount);
      }
    });

    it('distractor quality is non-decreasing', () => {
      const order = ['low', 'medium', 'high', 'maximum'];
      for (let d = 1; d < 20; d++) {
        const a = mapDifficultyToParams(d);
        const b = mapDifficultyToParams(d + 1);
        expect(order.indexOf(b.distractorQuality)).toBeGreaterThanOrEqual(
          order.indexOf(a.distractorQuality)
        );
      }
    });
  });
});
