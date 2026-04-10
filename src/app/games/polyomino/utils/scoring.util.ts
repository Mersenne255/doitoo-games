import { CompletionStatus, PuzzleResult, PuzzleResultParams } from '../models/game.models';

/** Completion: 100 if solved, 0 if timed_out/aborted, filledRatio×100 otherwise */
export function calculateCompletionScore(status: CompletionStatus, filledRatio: number): number {
  if (status === 'solved') return 100;
  if (status === 'timed_out' || status === 'aborted') return 0;
  return filledRatio * 100;
}

/** Time: max(0, 100 × (1 - solveTime / referenceTime)) */
export function calculateTimeScore(
  solveTimeSec: number,
  timeLimitSec: number | null,
  pieceCount: number
): number {
  const referenceTime = timeLimitSec ?? 120 * pieceCount;
  if (referenceTime <= 0) return 100;
  return Math.max(0, 100 * (1 - solveTimeSec / referenceTime));
}

/** Efficiency: min(100, (pieceCount / moveCount) × 100) */
export function calculateEfficiencyScore(pieceCount: number, moveCount: number): number {
  if (moveCount <= 0) return 100;
  return Math.min(100, (pieceCount / moveCount) * 100);
}

/** Difficulty bonus: difficulty × 0.5 (range 0–50) */
export function calculateDifficultyBonus(difficulty: number): number {
  return difficulty * 0.5;
}

/** Combined: max(0, min(100, 0.4×completion + 0.3×time + 0.2×efficiency + 0.1×difficultyBonus - hintsUsed×10)) */
export function calculateCombinedScore(
  completionScore: number,
  timeScore: number,
  efficiencyScore: number,
  difficultyBonus: number,
  hintsUsed: number
): number {
  const raw = 0.4 * completionScore + 0.3 * timeScore + 0.2 * efficiencyScore + 0.1 * difficultyBonus - hintsUsed * 10;
  return Math.max(0, Math.min(100, raw));
}

/** Calculate full puzzle result from params */
export function calculatePuzzleResult(params: PuzzleResultParams): PuzzleResult {
  const completionScore = calculateCompletionScore(params.status, params.filledRatio);
  const timeScore = calculateTimeScore(params.solveTimeSec, params.timeLimitSec, params.pieceCount);
  const efficiencyScore = calculateEfficiencyScore(params.pieceCount, params.moveCount);
  const difficultyBonus = calculateDifficultyBonus(params.difficulty);
  const combinedScore = calculateCombinedScore(completionScore, timeScore, efficiencyScore, difficultyBonus, params.hintsUsed);

  return {
    status: params.status,
    solveTimeSec: params.solveTimeSec,
    moveCount: params.moveCount,
    hintsUsed: params.hintsUsed,
    completionScore,
    timeScore,
    efficiencyScore,
    difficultyBonus,
    combinedScore,
    filledRatio: params.filledRatio,
  };
}
