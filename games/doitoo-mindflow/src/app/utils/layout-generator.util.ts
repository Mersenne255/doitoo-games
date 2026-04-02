import { BoardLayout } from '../models/game.models';
import { TRACK_GENERATION_DEFAULTS } from '../models/track-generation.config';
import { generateTrackLayout } from './track-generator.util';

/**
 * Generate a BoardLayout for the given trainCount and canvas size.
 * Runs synchronously (the time-based retry is inside generateTrackLayout).
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

/**
 * Async version that yields to the UI between attempts so a spinner can render.
 * Tries the full station count for retryTimeBudgetMs, then reduces by 1, etc.
 */
export async function generateLayoutAsync(
  trainCount: number,
  width: number,
  height: number,
): Promise<BoardLayout> {
  const cellSize = TRACK_GENERATION_DEFAULTS.cellSizePx;
  const cols = Math.max(3, Math.floor(width / cellSize));
  const rows = Math.max(3, Math.floor(height / cellSize));

  // Yield to UI before starting heavy work
  await new Promise(resolve => setTimeout(resolve, 0));

  const result = generateTrackLayout({
    trainCount,
    screenWidth: width,
    screenHeight: height,
    gridSize: { cols, rows },
  });
  return result.layout;
}
