import { describe, it, expect } from 'vitest';
import {
  calculateAccuracy,
  calculateRoundResult,
  initialScoringState,
  processTrialResult,
} from './scoring.util';
import {
  ColorName,
  ScoringState,
  TrialResult,
  Trial,
  PhantomLinkConfig,
} from '../models/game.models';

/** Helper: build a minimal Trial for testing. */
function makeTrial(overrides: Partial<Trial> = {}): Trial {
  return {
    symbol: 'triangle',
    correctColor: 'red',
    phantomColor: null,
    isPostChange: false,
    options: ['red', 'blue', 'green', 'yellow'],
    ...overrides,
  };
}

/** Helper: build a TrialResult. */
function makeResult(opts: {
  correct?: boolean;
  timedOut?: boolean;
  isPhantomError?: boolean;
  isPostChange?: boolean;
  responseTimeMs?: number;
  selectedColor?: ColorName | null;
}): TrialResult {
  const {
    correct = false,
    timedOut = false,
    isPhantomError = false,
    isPostChange = false,
    responseTimeMs = 500,
    selectedColor,
  } = opts;

  const trial = makeTrial({ isPostChange });

  if (timedOut) {
    return {
      trial,
      selectedColor: null,
      correct: false,
      isPhantomError: false,
      responseTimeMs: null,
    };
  }

  return {
    trial,
    selectedColor: selectedColor ?? (correct ? trial.correctColor : 'blue'),
    correct,
    isPhantomError,
    responseTimeMs,
  };
}

const DEFAULT_WINDOW = 3000;

describe('initialScoringState', () => {
  it('returns all zeroed fields including phantom-specific ones', () => {
    const state = initialScoringState();
    expect(state).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      correctCount: 0,
      incorrectCount: 0,
      timedOutCount: 0,
      phantomErrorCount: 0,
      postChangeTrialCount: 0,
      postChangeCorrectCount: 0,
      totalResponseTimeMs: 0,
      respondedCount: 0,
      totalScore: 0,
    });
  });
});

describe('processTrialResult', () => {
  it('awards 100 base points for correct response (no speed bonus)', () => {
    const state = processTrialResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 2000 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(100);
    expect(state.correctCount).toBe(1);
  });

  it('awards speed bonus (+50) when responseTimeMs < responseWindowMs/2', () => {
    const state = processTrialResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 100 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(150);
  });

  it('does not award speed bonus when responseTimeMs >= responseWindowMs/2', () => {
    const state = processTrialResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 1500 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(100);
  });

  it('increments streak on correct, resets on incorrect', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    state = processTrialResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(2);
    expect(state.longestStreak).toBe(2);

    state = processTrialResult(state, makeResult({ correct: false }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(2);
  });

  it('resets streak on timeout', () => {
    let state = initialScoringState();
    state = processTrialResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    state = processTrialResult(state, makeResult({ timedOut: true }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(0);
    expect(state.timedOutCount).toBe(1);
  });

  it('awards 0 points for incorrect response', () => {
    const state = processTrialResult(
      initialScoringState(),
      makeResult({ correct: false }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(0);
    expect(state.incorrectCount).toBe(1);
  });

  it('tracks phantom errors', () => {
    const state = processTrialResult(
      initialScoringState(),
      makeResult({ correct: false, isPhantomError: true }),
      DEFAULT_WINDOW,
    );
    expect(state.phantomErrorCount).toBe(1);
  });

  it('tracks post-change trials and post-change correct', () => {
    let state = initialScoringState();
    state = processTrialResult(
      state,
      makeResult({ correct: true, isPostChange: true }),
      DEFAULT_WINDOW,
    );
    expect(state.postChangeTrialCount).toBe(1);
    expect(state.postChangeCorrectCount).toBe(1);

    state = processTrialResult(
      state,
      makeResult({ correct: false, isPostChange: true }),
      DEFAULT_WINDOW,
    );
    expect(state.postChangeTrialCount).toBe(2);
    expect(state.postChangeCorrectCount).toBe(1);
  });

  it('tracks response time for responded trials only', () => {
    let state = initialScoringState();
    state = processTrialResult(
      state,
      makeResult({ correct: true, responseTimeMs: 200 }),
      DEFAULT_WINDOW,
    );
    state = processTrialResult(state, makeResult({ timedOut: true }), DEFAULT_WINDOW);
    state = processTrialResult(
      state,
      makeResult({ correct: false, responseTimeMs: 300 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalResponseTimeMs).toBe(500);
    expect(state.respondedCount).toBe(2);
  });
});

describe('calculateRoundResult', () => {
  const config: PhantomLinkConfig = {
    symbolCount: 3,
  };

  it('computes phantom resistance rate correctly', () => {
    const state: ScoringState = {
      ...initialScoringState(),
      correctCount: 10,
      postChangeTrialCount: 4,
      postChangeCorrectCount: 3,
    };
    const result = calculateRoundResult(state, config);
    expect(result.phantomResistanceRate).toBe(75);
  });

  it('returns 0 phantom resistance rate when no post-change trials', () => {
    const result = calculateRoundResult(initialScoringState(), config);
    expect(result.phantomResistanceRate).toBe(0);
  });

  it('includes config fields in result', () => {
    const result = calculateRoundResult(initialScoringState(), config);
    expect(result.symbolCount).toBe(3);
  });

  it('computes average response time', () => {
    const state: ScoringState = {
      ...initialScoringState(),
      totalResponseTimeMs: 1000,
      respondedCount: 4,
    };
    const result = calculateRoundResult(state, config);
    expect(result.averageResponseTimeMs).toBe(250);
  });

  it('returns 0 average response time when no responses', () => {
    const result = calculateRoundResult(initialScoringState(), config);
    expect(result.averageResponseTimeMs).toBe(0);
  });
});

describe('calculateAccuracy', () => {
  it('returns 0 when total is 0', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('returns 100 when all correct', () => {
    expect(calculateAccuracy(10, 10)).toBe(100);
  });

  it('returns 50 for half correct', () => {
    expect(calculateAccuracy(5, 10)).toBe(50);
  });

  it('clamps to [0, 100]', () => {
    expect(calculateAccuracy(-1, 10)).toBe(0);
    expect(calculateAccuracy(11, 10)).toBe(100);
  });
});
