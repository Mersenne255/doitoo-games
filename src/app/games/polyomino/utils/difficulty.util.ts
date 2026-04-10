import {
  DifficultyParams,
  PieceSizeRange,
} from '../models/game.models';

/**
 * Map difficulty level (1–100) to gameplay parameters.
 *
 * Piece complexity = size × distinctOrientations (computed per piece, not hardcoded).
 * Range: 4 (O-tetromino: 4×1) to 48 (asymmetric hexomino: 6×8).
 *
 * Difficulty controls:
 * - pieceCount: more pieces = harder (3 → 18)
 * - pieceSizeRange: larger pieces = harder (4 → 4-6)
 * - maxPieceComplexity: caps which pieces are in the pool (8 → 48)
 * - flipAllowed: disabling flip at high difficulty = harder
 *
 * The complexity threshold smoothly opens up the piece pool:
 *   d=1  → maxComplexity=8   (only O, I tetrominoes — very symmetric)
 *   d=50 → maxComplexity=28  (most pentominoes available)
 *   d=100→ maxComplexity=48  (all pieces including asymmetric hexominoes)
 */
export function mapDifficultyToParams(difficulty: number): DifficultyParams {
  const d = Math.max(1, Math.min(100, Math.round(difficulty)));
  const t = (d - 1) / 99; // 0..1

  // Piece count: 3 at d=1, 18 at d=100
  const pieceCount = Math.round(3 + t * 15);

  // Piece size range: tetrominoes only at low, pentominoes mid, hex at high
  let pieceSizeRange: PieceSizeRange;
  if (d <= 25) {
    pieceSizeRange = [4, 4];
  } else if (d <= 50) {
    pieceSizeRange = [4, 5];
  } else if (d <= 75) {
    pieceSizeRange = [5, 5];
  } else {
    pieceSizeRange = [5, 6];
  }

  // Max complexity: smooth ramp from 8 to 48
  // 8 = only the most symmetric pieces (1-2 orientations)
  // 48 = everything including fully asymmetric hexominoes
  const maxPieceComplexity = Math.round(8 + t * 40);

  // Flip: allowed until d>80, then disabled for extra challenge
  const flipAllowed = d <= 80;

  return {
    pieceCount,
    pieceSizeRange,
    maxPieceComplexity,
    rotationAllowed: true,
    flipAllowed,
  };
}
