import { describe, it, expect } from 'vitest';
import {
  initialScoringState,
  updateScoringState,
  calculateRoundResult,
} from './scoring.util';
import { PuzzleResult, ScoringState } from '../models/game.models';

// ── initialScoringState ──

describe('initialScoringState', () => {
  it('should return empty results and zero streaks', () => {
    const state = initialScoringState();
    expect(state).toEqual({
      results: [],
      currentStreak: 0,
      longestStreak: 0,
    });
  });
});

// ── updateScoringState ──

describe('updateScoringState', () => {
  it('should append a result and increment streak on correct', () => {
    const state = initialScoringState();
    const result: PuzzleResult = { outcome: 'correct', responseTimeMs: 500 };
    const next = updateScoringState(state, result);

    expect(next.results).toHaveLength(1);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
  });

  it('should reset current streak on incorrect', () => {
    const state: ScoringState = {
      results: [{ outcome: 'correct', responseTimeMs: 300 }],
      currentStreak: 1,
      longestStreak: 1,
    };
    const next = updateScoringState(state, {
      outcome: 'incorrect',
      responseTimeMs: 400,
    });

    expect(next.currentStreak).toBe(0);
    expect(next.longestStreak).toBe(1); // preserved
  });

  it('should reset current streak on unanswered', () => {
    const state: ScoringState = {
      results: [{ outcome: 'correct', responseTimeMs: 200 }],
      currentStreak: 1,
      longestStreak: 1,
    };
    const next = updateScoringState(state, {
      outcome: 'unanswered',
      responseTimeMs: null,
    });

    expect(next.currentStreak).toBe(0);
    expect(next.longestStreak).toBe(1);
  });

  it('should track longest streak across multiple updates', () => {
    let state = initialScoringState();
    // 3 correct, 1 incorrect, 2 correct
    state = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });
    state = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });
    state = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });
    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(3);

    state = updateScoringState(state, { outcome: 'incorrect', responseTimeMs: 100 });
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(3);

    state = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });
    state = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });
    expect(state.currentStreak).toBe(2);
    expect(state.longestStreak).toBe(3); // still 3
  });

  it('should not mutate the original state', () => {
    const state = initialScoringState();
    const next = updateScoringState(state, { outcome: 'correct', responseTimeMs: 100 });

    expect(state.results).toHaveLength(0);
    expect(state.currentStreak).toBe(0);
    expect(next).not.toBe(state);
  });
});

// ── calculateRoundResult ──

describe('calculateRoundResult', () => {
  it('should handle empty results', () => {
    const result = calculateRoundResult([], 5);

    expect(result).toEqual({
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      accuracy: 0,
      averageResponseTimeMs: 0,
      longestStreak: 0,
      difficulty: 5,
      totalPuzzles: 0,
    });
  });

  it('should compute all correct', () => {
    const results: PuzzleResult[] = [
      { outcome: 'correct', responseTimeMs: 1000 },
      { outcome: 'correct', responseTimeMs: 2000 },
      { outcome: 'correct', responseTimeMs: 3000 },
    ];
    const result = calculateRoundResult(results, 3);

    expect(result.correctCount).toBe(3);
    expect(result.incorrectCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.accuracy).toBe(100);
    expect(result.averageResponseTimeMs).toBe(2000);
    expect(result.longestStreak).toBe(3);
    expect(result.difficulty).toBe(3);
    expect(result.totalPuzzles).toBe(3);
  });

  it('should compute all incorrect', () => {
    const results: PuzzleResult[] = [
      { outcome: 'incorrect', responseTimeMs: 500 },
      { outcome: 'incorrect', responseTimeMs: 700 },
    ];
    const result = calculateRoundResult(results, 10);

    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(2);
    expect(result.unansweredCount).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.averageResponseTimeMs).toBe(600);
    expect(result.longestStreak).toBe(0);
    expect(result.totalPuzzles).toBe(2);
  });

  it('should compute all unanswered', () => {
    const results: PuzzleResult[] = [
      { outcome: 'unanswered', responseTimeMs: null },
      { outcome: 'unanswered', responseTimeMs: null },
      { outcome: 'unanswered', responseTimeMs: null },
    ];
    const result = calculateRoundResult(results, 1);

    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(0);
    expect(result.unansweredCount).toBe(3);
    expect(result.accuracy).toBe(0);
    expect(result.averageResponseTimeMs).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalPuzzles).toBe(3);
  });

  it('should compute mixed outcomes correctly', () => {
    const results: PuzzleResult[] = [
      { outcome: 'correct', responseTimeMs: 1000 },
      { outcome: 'correct', responseTimeMs: 2000 },
      { outcome: 'incorrect', responseTimeMs: 1500 },
      { outcome: 'unanswered', responseTimeMs: null },
      { outcome: 'correct', responseTimeMs: 800 },
    ];
    const result = calculateRoundResult(results, 7);

    expect(result.correctCount).toBe(3);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.accuracy).toBe(60); // 3/5 * 100
    expect(result.averageResponseTimeMs).toBe(1325); // (1000+2000+1500+800)/4
    expect(result.longestStreak).toBe(2); // first two correct
    expect(result.difficulty).toBe(7);
    expect(result.totalPuzzles).toBe(5);
  });

  it('should pass through the difficulty value', () => {
    const result = calculateRoundResult([], 20);
    expect(result.difficulty).toBe(20);
  });

  it('should only average non-null response times', () => {
    const results: PuzzleResult[] = [
      { outcome: 'correct', responseTimeMs: 1000 },
      { outcome: 'unanswered', responseTimeMs: null },
      { outcome: 'incorrect', responseTimeMs: 3000 },
    ];
    const result = calculateRoundResult(results, 2);

    // average of 1000 and 3000 only
    expect(result.averageResponseTimeMs).toBe(2000);
  });

  it('should compute longest streak in the middle of results', () => {
    const results: PuzzleResult[] = [
      { outcome: 'incorrect', responseTimeMs: 100 },
      { outcome: 'correct', responseTimeMs: 200 },
      { outcome: 'correct', responseTimeMs: 300 },
      { outcome: 'correct', responseTimeMs: 400 },
      { outcome: 'incorrect', responseTimeMs: 500 },
    ];
    const result = calculateRoundResult(results, 4);

    expect(result.longestStreak).toBe(3);
  });

  it('should compute longest streak at the end of results', () => {
    const results: PuzzleResult[] = [
      { outcome: 'incorrect', responseTimeMs: 100 },
      { outcome: 'correct', responseTimeMs: 200 },
      { outcome: 'correct', responseTimeMs: 300 },
    ];
    const result = calculateRoundResult(results, 4);

    expect(result.longestStreak).toBe(2);
  });
});
