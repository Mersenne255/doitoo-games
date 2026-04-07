import { describe, it, expect } from 'vitest';
import {
  calculateAccuracy,
  calculateRoundResult,
  initialScoringState,
  processSortResult,
} from './scoring.util';
import {
  ScoringState,
  SortResult,
  SortAttempt,
  SynapSortConfig,
  Card,
  ConflictType,
} from '../models/game.models';

/** Helper: build a minimal SortAttempt for testing. */
function makeSortAttempt(overrides: Partial<SortAttempt> = {}): SortAttempt {
  return {
    card: { shape: 'circle', color: 'red', count: 1 } as Card,
    correctPileByRule: { shape: 0, color: 1, count: 2, compound: 0 } as Record<ConflictType, number>,
    isAmbiguous: false,
    isPostSwitch: false,
    ...overrides,
  };
}

/** Helper: build a SortResult. */
function makeResult(opts: {
  correct?: boolean;
  timedOut?: boolean;
  isPerseverativeError?: boolean;
  responseTimeMs?: number;
  selectedPileIndex?: number | null;
}): SortResult {
  const {
    correct = false,
    timedOut = false,
    isPerseverativeError = false,
    responseTimeMs = 500,
    selectedPileIndex,
  } = opts;

  const sortAttempt = makeSortAttempt();

  if (timedOut) {
    return {
      sortAttempt,
      selectedPileIndex: null,
      correct: false,
      isPerseverativeError: false,
      responseTimeMs: null,
    };
  }

  return {
    sortAttempt,
    selectedPileIndex: selectedPileIndex ?? (correct ? 0 : 1),
    correct,
    isPerseverativeError,
    responseTimeMs,
  };
}

const DEFAULT_WINDOW = 3000;

describe('initialScoringState', () => {
  it('returns all zeroed fields including synapsort-specific ones', () => {
    const state = initialScoringState();
    expect(state).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      correctCount: 0,
      incorrectCount: 0,
      timedOutCount: 0,
      perseverativeErrorCount: 0,
      rulesDiscoveredCount: 0,
      postSwitchSortCount: 0,
      postSwitchCorrectCount: 0,
      consecutiveCorrectForSwitch: 0,
      totalResponseTimeMs: 0,
      respondedCount: 0,
      totalScore: 0,
    });
  });
});

describe('processSortResult', () => {
  it('awards 100 base points for correct response (no speed bonus)', () => {
    const state = processSortResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 2000 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(100);
    expect(state.correctCount).toBe(1);
  });

  it('awards speed bonus (+50) when responseTimeMs < responseWindowMs/2', () => {
    const state = processSortResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 100 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(150);
  });

  it('does not award speed bonus when responseTimeMs >= responseWindowMs/2', () => {
    const state = processSortResult(
      initialScoringState(),
      makeResult({ correct: true, responseTimeMs: 1500 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(100);
  });

  it('increments streak on correct, resets on incorrect', () => {
    let state = initialScoringState();
    state = processSortResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    state = processSortResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(2);
    expect(state.longestStreak).toBe(2);

    state = processSortResult(state, makeResult({ correct: false }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(2);
  });

  it('resets streak on timeout', () => {
    let state = initialScoringState();
    state = processSortResult(state, makeResult({ correct: true }), DEFAULT_WINDOW);
    state = processSortResult(state, makeResult({ timedOut: true }), DEFAULT_WINDOW);
    expect(state.currentStreak).toBe(0);
    expect(state.timedOutCount).toBe(1);
  });

  it('awards 0 points for incorrect response', () => {
    const state = processSortResult(
      initialScoringState(),
      makeResult({ correct: false }),
      DEFAULT_WINDOW,
    );
    expect(state.totalScore).toBe(0);
    expect(state.incorrectCount).toBe(1);
  });

  it('tracks perseverative errors', () => {
    const state = processSortResult(
      initialScoringState(),
      makeResult({ correct: false, isPerseverativeError: true }),
      DEFAULT_WINDOW,
    );
    expect(state.perseverativeErrorCount).toBe(1);
  });

  it('tracks response time for responded results only', () => {
    let state = initialScoringState();
    state = processSortResult(
      state,
      makeResult({ correct: true, responseTimeMs: 200 }),
      DEFAULT_WINDOW,
    );
    state = processSortResult(state, makeResult({ timedOut: true }), DEFAULT_WINDOW);
    state = processSortResult(
      state,
      makeResult({ correct: false, responseTimeMs: 300 }),
      DEFAULT_WINDOW,
    );
    expect(state.totalResponseTimeMs).toBe(500);
    expect(state.respondedCount).toBe(2);
  });
});

describe('calculateRoundResult', () => {
  const config: SynapSortConfig = {
    difficulty: 5,
    cardCount: 25,
    speedMode: 'standard',
  };

  it('computes accuracy correctly', () => {
    const state: ScoringState = {
      ...initialScoringState(),
      correctCount: 8,
      incorrectCount: 2,
    };
    const result = calculateRoundResult(state, config);
    expect(result.accuracy).toBe(80);
  });

  it('returns 0 accuracy when no trials', () => {
    const result = calculateRoundResult(initialScoringState(), config);
    expect(result.accuracy).toBe(0);
  });

  it('includes config fields in result', () => {
    const result = calculateRoundResult(initialScoringState(), config);
    expect(result.difficulty).toBe(5);
    expect(result.cardCount).toBe(25);
    expect(result.speedMode).toBe('standard');
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

  it('includes perseverative error and rules discovered counts', () => {
    const state: ScoringState = {
      ...initialScoringState(),
      perseverativeErrorCount: 3,
      rulesDiscoveredCount: 2,
    };
    const result = calculateRoundResult(state, config);
    expect(result.perseverativeErrorCount).toBe(3);
    expect(result.rulesDiscoveredCount).toBe(2);
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
