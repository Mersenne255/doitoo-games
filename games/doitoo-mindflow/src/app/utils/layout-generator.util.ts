import { BoardLayout } from '../models/game.models';
import { generateTrackLayout } from './track-generator.util';

/**
 * Generate a BoardLayout for the given trainCount and canvas size.
 *
 * Thin wrapper around `generateTrackLayout` that uses a default grid size
 * of 20 columns × 15 rows. Maintains the existing public signature for
 * backward compatibility with GameBoardComponent and other callers.
 */
export function generateLayout(
  trainCount: number,
  width: number,
  height: number,
): BoardLayout {
  const result = generateTrackLayout({
    trainCount,
    screenWidth: width,
    screenHeight: height,
    gridSize: { cols: 20, rows: 15 },
  });
  return result.layout;
}
