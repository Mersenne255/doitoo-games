import { describe, it, expect } from 'vitest';
import { getDifficultyParams, validateConfig } from './difficulty.util';
import { PatternixConfig } from '../models/game.models';

describe('getDifficultyParams', () => {
  it('should return sequenceLength 3, ruleCount 1, distractorCount 3 at difficulty 1', () => {
    const params = getDifficultyParams(1);
    expect(params).toEqual({ sequenceLength: 3, ruleCount: 1, distractorCount: 3 });
  });

  it('should return sequenceLength 6, ruleCount 3, distractorCount 5 at difficulty 20', () => {
    const params = getDifficultyParams(20);
    expect(params).toEqual({ sequenceLength: 6, ruleCount: 3, distractorCount: 5 });
  });

  it('should return ruleCount 1 for difficulties 1–5', () => {
    for (let d = 1; d <= 5; d++) {
      expect(getDifficultyParams(d).ruleCount).toBe(1);
    }
  });

  it('should return ruleCount 2 for difficulties 6–12', () => {
    for (let d = 6; d <= 12; d++) {
      expect(getDifficultyParams(d).ruleCount).toBe(2);
    }
  });

  it('should return ruleCount 3 for difficulties 13–20', () => {
    for (let d = 13; d <= 20; d++) {
      expect(getDifficultyParams(d).ruleCount).toBe(3);
    }
  });

  it('should clamp difficulty below 1 to 1', () => {
    expect(getDifficultyParams(0)).toEqual(getDifficultyParams(1));
    expect(getDifficultyParams(-5)).toEqual(getDifficultyParams(1));
  });

  it('should clamp difficulty above 20 to 20', () => {
    expect(getDifficultyParams(21)).toEqual(getDifficultyParams(20));
    expect(getDifficultyParams(100)).toEqual(getDifficultyParams(20));
  });

  it('should produce monotonically non-decreasing sequenceLength', () => {
    for (let d = 2; d <= 20; d++) {
      expect(getDifficultyParams(d).sequenceLength)
        .toBeGreaterThanOrEqual(getDifficultyParams(d - 1).sequenceLength);
    }
  });

  it('should produce monotonically non-decreasing distractorCount', () => {
    for (let d = 2; d <= 20; d++) {
      expect(getDifficultyParams(d).distractorCount)
        .toBeGreaterThanOrEqual(getDifficultyParams(d - 1).distractorCount);
    }
  });

  it('should produce monotonically non-decreasing ruleCount', () => {
    for (let d = 2; d <= 20; d++) {
      expect(getDifficultyParams(d).ruleCount)
        .toBeGreaterThanOrEqual(getDifficultyParams(d - 1).ruleCount);
    }
  });
});

describe('validateConfig', () => {
  it('should return a valid config unchanged', () => {
    const config: PatternixConfig = {
      difficulty: 10,
      puzzleCount: 20,
      timeLimitSec: 30,
      timedMode: true,
    };
    expect(validateConfig(config)).toEqual(config);
  });

  it('should clamp difficulty to [1, 20]', () => {
    expect(validateConfig({ difficulty: 0, puzzleCount: 10, timeLimitSec: 30, timedMode: true }).difficulty).toBe(1);
    expect(validateConfig({ difficulty: 25, puzzleCount: 10, timeLimitSec: 30, timedMode: true }).difficulty).toBe(20);
  });

  it('should clamp puzzleCount to [5, 50]', () => {
    expect(validateConfig({ difficulty: 1, puzzleCount: 1, timeLimitSec: 30, timedMode: true }).puzzleCount).toBe(5);
    expect(validateConfig({ difficulty: 1, puzzleCount: 100, timeLimitSec: 30, timedMode: true }).puzzleCount).toBe(50);
  });

  it('should clamp timeLimitSec to [5, 60]', () => {
    expect(validateConfig({ difficulty: 1, puzzleCount: 10, timeLimitSec: 1, timedMode: true }).timeLimitSec).toBe(5);
    expect(validateConfig({ difficulty: 1, puzzleCount: 10, timeLimitSec: 120, timedMode: true }).timeLimitSec).toBe(60);
  });

  it('should preserve timedMode boolean', () => {
    expect(validateConfig({ difficulty: 1, puzzleCount: 10, timeLimitSec: 30, timedMode: false }).timedMode).toBe(false);
    expect(validateConfig({ difficulty: 1, puzzleCount: 10, timeLimitSec: 30, timedMode: true }).timedMode).toBe(true);
  });

  it('should round fractional values before clamping', () => {
    const result = validateConfig({ difficulty: 10.7, puzzleCount: 25.3, timeLimitSec: 30.9, timedMode: true });
    expect(result.difficulty).toBe(11);
    expect(result.puzzleCount).toBe(25);
    expect(result.timeLimitSec).toBe(31);
  });
});
