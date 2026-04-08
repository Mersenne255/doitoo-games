import { describe, it, expect } from 'vitest';
import {
  calculateAccuracy,
  calculateRoundResult,
  initialScoringState,
  processTrialResult,
} from './scoring.util';
import {
  ScoringState,
  TrialResult,
  Trial,
  VoxelConfig,
  VoxelShape,
  Projection,
} from '../models/game.models';

/** Helper: build a minimal Trial for testing. */
function makeTrial(): Trial {
  const shape: VoxelShape = {
    voxels: [{ position: [0, 0, 0], color: '#6366f1' }],
    boundingBox: { min: [0, 0, 0], max: [0, 0, 0] },
  };
  const projection: Projection = { grid: [['filled']], width: 1, height: 1 };
  return {
    shape,
    askedDirection: 'front',
    correctProjection: projection,
    options: [projection, projection, projection, projection],
    correctIndex: 0,
    seed: 42,
  };
}

/** Helper: build a TrialResult. */
function makeResult(
  correct: boolean,
  timedOut = false,
  responseTimeMs = 500,
  memorizationTimeMs = 3000,
): TrialResult {
  const trial = makeTrial();
  if (timedOut) {
    return { trial, selectedIndex: null, correct: false, responseTimeMs: null, memorizationTimeMs };
  }
  return {
    trial,
    selectedIndex: correct ? 0 : 1,
    correct,
    responseTimeMs,
    memorizationTimeMs,
  };
}

const defaultConfig: VoxelConfig = {
  difficulty: 50,
  trialCount: 10,
  speedMode: 'standard',
  multiColorMode: false,
};

describe('initialScoringState', () => {
  it('should return all zeros', () => {
    const state = initialScoringState();
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.incorrectCount).toBe(0);
    expect(state.timedOutCount).toBe(0);
    expect(state.totalResponseTimeMs).toBe(0);
    expect(state.respondedCount).toBe(0);
    expect(state.totalMemorizationTimeMs).toBe(0);
    expect(state.trialCount).toBe(0);
    expect(state.totalScore).toBe(0);
  });
});

describe('processTrialResult', () => {
  it('should increment correctCount and streak on correct response', () => {
    const state = initialScoringState();
    const result = makeResult(true);
    const next = processTrialResult(state, result, 5000);
    expect(next.correctCount).toBe(1);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.trialCount).toBe(1);
  });

  it('should increment incorrectCount and reset streak on incorrect response', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true), 5000);
    state = processTrialResult(state, makeResult(false), 5000);
    expect(state.incorrectCount).toBe(1);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(1);
  });

  it('should increment timedOutCount and reset streak on timeout', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true), 5000);
    state = processTrialResult(state, makeResult(false, true), 5000);
    expect(state.timedOutCount).toBe(1);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(1);
  });

  it('should not count timed-out trials in respondedCount', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(false, true), 5000);
    expect(state.respondedCount).toBe(0);
    expect(state.trialCount).toBe(1);
  });

  it('should accumulate response time for responded trials', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true, false, 300), 5000);
    state = processTrialResult(state, makeResult(false, false, 700), 5000);
    expect(state.totalResponseTimeMs).toBe(1000);
    expect(state.respondedCount).toBe(2);
  });

  it('should accumulate memorization time for all trials', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true, false, 500, 2000), 5000);
    state = processTrialResult(state, makeResult(false, true, 0, 3000), 5000);
    expect(state.totalMemorizationTimeMs).toBe(5000);
  });

  it('should award speed bonus when response is under half the window', () => {
    let state = initialScoringState();
    // responseTimeMs=200 < responseWindowMs/2=2500
    state = processTrialResult(state, makeResult(true, false, 200), 5000);
    expect(state.totalScore).toBe(150); // 100 base + 50 speed bonus
  });

  it('should not award speed bonus when response is at or above half the window', () => {
    let state = initialScoringState();
    // responseTimeMs=2500 >= responseWindowMs/2=2500
    state = processTrialResult(state, makeResult(true, false, 2500), 5000);
    expect(state.totalScore).toBe(100); // 100 base only
  });

  it('should not award speed bonus when responseWindowMs is null (unlimited)', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true, false, 100), null);
    expect(state.totalScore).toBe(100); // 100 base only, no speed bonus
  });

  it('should award 0 points for incorrect responses', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(false), 5000);
    expect(state.totalScore).toBe(0);
  });

  it('should award 0 points for timed-out responses', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(false, true), 5000);
    expect(state.totalScore).toBe(0);
  });

  it('should track longestStreak across multiple streaks', () => {
    let state = initialScoringState();
    // Streak of 3
    state = processTrialResult(state, makeResult(true), 5000);
    state = processTrialResult(state, makeResult(true), 5000);
    state = processTrialResult(state, makeResult(true), 5000);
    // Break
    state = processTrialResult(state, makeResult(false), 5000);
    // Streak of 2
    state = processTrialResult(state, makeResult(true), 5000);
    state = processTrialResult(state, makeResult(true), 5000);
    expect(state.longestStreak).toBe(3);
    expect(state.currentStreak).toBe(2);
  });
});

describe('calculateRoundResult', () => {
  it('should compute accuracy, averages, and pass through config fields', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(true, false, 400, 2000), 5000);
    state = processTrialResult(state, makeResult(true, false, 600, 3000), 5000);
    state = processTrialResult(state, makeResult(false, false, 500, 4000), 5000);

    const result = calculateRoundResult(state, defaultConfig);
    expect(result.accuracy).toBeCloseTo(66.667, 1);
    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.timedOutCount).toBe(0);
    expect(result.averageResponseTimeMs).toBe(500); // (400+600+500)/3
    expect(result.averageMemorizationTimeSec).toBe(3); // (2000+3000+4000)/3/1000
    expect(result.longestStreak).toBe(2);
    expect(result.difficulty).toBe(50);
    expect(result.trialCount).toBe(10);
    expect(result.speedMode).toBe('standard');
    expect(result.multiColorMode).toBe(false);
  });

  it('should return 0 averages when no trials processed', () => {
    const state = initialScoringState();
    const result = calculateRoundResult(state, defaultConfig);
    expect(result.accuracy).toBe(0);
    expect(result.averageResponseTimeMs).toBe(0);
    expect(result.averageMemorizationTimeSec).toBe(0);
  });

  it('should return 0 average response time when only timeouts', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult(false, true, 0, 2000), 5000);
    state = processTrialResult(state, makeResult(false, true, 0, 3000), 5000);
    const result = calculateRoundResult(state, defaultConfig);
    expect(result.averageResponseTimeMs).toBe(0);
    expect(result.averageMemorizationTimeSec).toBe(2.5); // (2000+3000)/2/1000
  });
});

describe('calculateAccuracy', () => {
  it('should return 0 when total is 0', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('should return 100 when all correct', () => {
    expect(calculateAccuracy(5, 5)).toBe(100);
  });

  it('should return 50 when half correct', () => {
    expect(calculateAccuracy(5, 10)).toBe(50);
  });

  it('should clamp to [0, 100]', () => {
    expect(calculateAccuracy(0, 5)).toBe(0);
    expect(calculateAccuracy(5, 5)).toBe(100);
  });
});
