import { PuzzleResult, ScoringState, RoundResult, SudokuConfig } from '../models/game.models';

export function initialScoringState(): ScoringState {
  return {
    puzzlesSolved: 0,
    puzzlesTimedOut: 0,
    puzzlesGaveUp: 0,
    totalSolveTimeSec: 0,
    totalHintsUsed: 0,
    totalErrors: 0,
    currentNoHintStreak: 0,
    longestNoHintStreak: 0,
    puzzleCount: 0,
  };
}

export function processPuzzleResult(state: ScoringState, result: PuzzleResult): ScoringState {
  const next = { ...state, puzzleCount: state.puzzleCount + 1 };
  next.totalHintsUsed += result.hintsUsed;
  next.totalErrors += result.errorCount;
  next.totalSolveTimeSec += result.solveTimeSec;

  if (result.status === 'solved') {
    next.puzzlesSolved++;
    if (result.hintsUsed === 0) {
      next.currentNoHintStreak = state.currentNoHintStreak + 1;
      next.longestNoHintStreak = Math.max(next.longestNoHintStreak, next.currentNoHintStreak);
    } else {
      next.currentNoHintStreak = 0;
    }
  } else if (result.status === 'timed_out') {
    next.puzzlesTimedOut++;
    next.currentNoHintStreak = 0;
  } else {
    next.puzzlesGaveUp++;
    next.currentNoHintStreak = 0;
  }

  return next;
}

export function calculateRoundResult(state: ScoringState, config: SudokuConfig): RoundResult {
  return {
    puzzlesSolved: state.puzzlesSolved,
    totalPuzzles: state.puzzleCount,
    averageSolveTimeSec: state.puzzlesSolved > 0 ? state.totalSolveTimeSec / state.puzzlesSolved : 0,
    totalHintsUsed: state.totalHintsUsed,
    longestNoHintStreak: state.longestNoHintStreak,
    accuracy: state.puzzleCount > 0 ? (state.puzzlesSolved / state.puzzleCount) * 100 : 0,
    difficulty: config.difficulty,
    boxDimension: config.boxDimension,
    speedMode: config.speedMode,
  };
}
