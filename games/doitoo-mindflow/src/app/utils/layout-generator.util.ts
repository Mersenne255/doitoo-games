import { BoardLayout } from '../models/game.models';
import { TRACK_GENERATION_DEFAULTS } from '../models/track-generation.config';
import { generateTrackLayout } from './track-generator.util';

/**
 * Generate a BoardLayout for the given trainCount and canvas size.
 *
 * Grid dimensions are computed dynamically from the screen resolution:
 * cols = floor(width / cellSizePx), rows = floor(height / cellSizePx).
 * This keeps cell density consistent across different screen sizes.
 */
export function generateLayout(
  trainCount: number,
  width: number,
  height: number,
): BoardLayout {
  const cellSize = TRACK_GENERATION_DEFAULTS.cellSizePx;
  const cols = Math.max(3, Math.floor(width / cellSize));
  const rows = Math.max(3, Math.floor(height / cellSize));

  const result = generateTrackLayout({
    trainCount,
    screenWidth: width,
    screenHeight: height,
    gridSize: { cols, rows },
  });
  return result.layout;
}
