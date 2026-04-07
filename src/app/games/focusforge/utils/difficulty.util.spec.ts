import { describe, it, expect } from 'vitest';
import { mapDifficultyToParams } from './difficulty.util';

describe('mapDifficultyToParams', () => {
  describe('clamping', () => {
    it('clamps values below 1 to tier 1 start', () => {
      const params = mapDifficultyToParams(0);
      expect(params.fieldSize).toBe(6);
      expect(params.responseWindowMs).toBe(5000);
      expect(params.popOutRatio).toBe(1.0);
    });

    it('clamps negative values to tier 1 start', () => {
      const params = mapDifficultyToParams(-5);
      expect(params.fieldSize).toBe(6);
      expect(params.responseWindowMs).toBe(5000);
    });

    it('clamps values above 20 to tier 4 end', () => {
      const params = mapDifficultyToParams(25);
      expect(params.fieldSize).toBe(22);
      expect(params.responseWindowMs).toBe(800);
      expect(params.popOutRatio).toBe(0.0);
    });
  });

  describe('Tier 1 (difficulty 1–5)', () => {
    it('difficulty 1 returns tier 1 start values', () => {
      const p = mapDifficultyToParams(1);
      expect(p.fieldSize).toBe(6);
      expect(p.responseWindowMs).toBe(5000);
      expect(p.popOutRatio).toBe(1.0);
      expect(p.distractorSimilarity).toBe('low');
      expect(p.visualNoise).toBe('none');
      expect(p.ruleSwitchInterval).toBe(0);
    });

    it('difficulty 5 returns tier 1 end values', () => {
      const p = mapDifficultyToParams(5);
      expect(p.fieldSize).toBe(8);
      expect(p.responseWindowMs).toBe(4000);
      expect(p.popOutRatio).toBe(1.0);
      expect(p.distractorSimilarity).toBe('low');
      expect(p.visualNoise).toBe('none');
      expect(p.ruleSwitchInterval).toBe(0);
    });

    it('difficulty 3 interpolates within tier 1', () => {
      const p = mapDifficultyToParams(3);
      expect(p.fieldSize).toBe(7); // lerp(6,8,0.5) = 7
      expect(p.responseWindowMs).toBe(4500); // lerp(5000,4000,0.5) = 4500
    });
  });

  describe('Tier 2 (difficulty 6–10)', () => {
    it('difficulty 6 returns tier 2 start values', () => {
      const p = mapDifficultyToParams(6);
      expect(p.fieldSize).toBe(8);
      expect(p.responseWindowMs).toBe(3500);
      expect(p.popOutRatio).toBe(0.70);
      expect(p.distractorSimilarity).toBe('medium');
      expect(p.visualNoise).toBe('size_variation');
      expect(p.ruleSwitchInterval).toBe(0);
    });

    it('difficulty 10 returns tier 2 end values', () => {
      const p = mapDifficultyToParams(10);
      expect(p.fieldSize).toBe(12);
      expect(p.responseWindowMs).toBe(2500);
      expect(p.popOutRatio).toBe(0.50);
      expect(p.distractorSimilarity).toBe('medium');
      expect(p.visualNoise).toBe('size_variation');
      expect(p.ruleSwitchInterval).toBe(0);
    });
  });

  describe('Tier 3 (difficulty 11–15)', () => {
    it('difficulty 11 returns tier 3 start values', () => {
      const p = mapDifficultyToParams(11);
      expect(p.fieldSize).toBe(12);
      expect(p.responseWindowMs).toBe(2200);
      expect(p.popOutRatio).toBe(0.40);
      expect(p.distractorSimilarity).toBe('high');
      expect(p.visualNoise).toBe('size_rotation');
      expect(p.ruleSwitchInterval).toBe(8);
    });

    it('difficulty 15 returns tier 3 end values', () => {
      const p = mapDifficultyToParams(15);
      expect(p.fieldSize).toBe(16);
      expect(p.responseWindowMs).toBe(1500);
      expect(p.popOutRatio).toBe(0.20);
      expect(p.distractorSimilarity).toBe('high');
      expect(p.visualNoise).toBe('size_rotation');
      expect(p.ruleSwitchInterval).toBe(5);
    });
  });

  describe('Tier 4 (difficulty 16–20)', () => {
    it('difficulty 16 returns tier 4 start values', () => {
      const p = mapDifficultyToParams(16);
      expect(p.fieldSize).toBe(16);
      expect(p.responseWindowMs).toBe(1200);
      expect(p.popOutRatio).toBe(0.10);
      expect(p.distractorSimilarity).toBe('maximum');
      expect(p.visualNoise).toBe('full');
      expect(p.ruleSwitchInterval).toBe(4);
    });

    it('difficulty 20 returns tier 4 end values', () => {
      const p = mapDifficultyToParams(20);
      expect(p.fieldSize).toBe(22);
      expect(p.responseWindowMs).toBe(800);
      expect(p.popOutRatio).toBe(0.0);
      expect(p.distractorSimilarity).toBe('maximum');
      expect(p.visualNoise).toBe('full');
      expect(p.ruleSwitchInterval).toBe(3);
    });
  });

  describe('tier boundary transitions', () => {
    it('difficulty 5→6 transitions from tier 1 to tier 2', () => {
      const p5 = mapDifficultyToParams(5);
      const p6 = mapDifficultyToParams(6);
      expect(p5.distractorSimilarity).toBe('low');
      expect(p6.distractorSimilarity).toBe('medium');
      expect(p6.responseWindowMs).toBeLessThanOrEqual(p5.responseWindowMs);
      expect(p6.fieldSize).toBeGreaterThanOrEqual(p5.fieldSize);
    });

    it('difficulty 10→11 transitions from tier 2 to tier 3', () => {
      const p10 = mapDifficultyToParams(10);
      const p11 = mapDifficultyToParams(11);
      expect(p10.distractorSimilarity).toBe('medium');
      expect(p11.distractorSimilarity).toBe('high');
      expect(p11.responseWindowMs).toBeLessThanOrEqual(p10.responseWindowMs);
      expect(p11.fieldSize).toBeGreaterThanOrEqual(p10.fieldSize);
    });

    it('difficulty 15→16 transitions from tier 3 to tier 4', () => {
      const p15 = mapDifficultyToParams(15);
      const p16 = mapDifficultyToParams(16);
      expect(p15.distractorSimilarity).toBe('high');
      expect(p16.distractorSimilarity).toBe('maximum');
      expect(p16.responseWindowMs).toBeLessThanOrEqual(p15.responseWindowMs);
      expect(p16.fieldSize).toBeGreaterThanOrEqual(p15.fieldSize);
    });
  });
});
