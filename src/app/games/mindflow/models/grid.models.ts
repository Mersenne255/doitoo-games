import { BoardLayout, Point } from './game.models';

/** Grid dimensions */
export interface GridSize {
  cols: number;
  rows: number;
}

/** A cell position on the grid */
export interface GridCell {
  col: number;
  row: number;
}

/** Cardinal directions for grid movement */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Configuration for the track generator */
export interface TrackGeneratorConfig {
  trainCount: number;
  screenWidth: number;
  screenHeight: number;
  gridSize: GridSize;
  rng?: () => number;
  allowThreeWayJunctions?: boolean;
  minSpatialCoverage?: number;
}

/** Options for the layout validator */
export interface ValidatorOptions {
  gridSize?: GridSize;
  allowThreeWayJunctions?: boolean;
  minSpatialCoverage?: number;
  stationCount?: number;
}

/** Result from the track generator */
export interface TrackGeneratorResult {
  layout: BoardLayout;
  actualStationCount: number;
  capped: boolean;
}

/** Result from the layout validator */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Computes the maximum number of stations a grid can support.
 *
 * Each station branch requires roughly 3 cells (junction + branch segment + station cell),
 * and the trunk from spawn to the first junction needs ~3 cells.
 * Formula: maxStations = floor((totalCells - 3) / 3), clamped to at least 0.
 */
export function computeMaxStationCount(gridSize: GridSize): number {
  const totalCells = gridSize.cols * gridSize.rows;
  return Math.max(0, Math.floor((totalCells - 3) / 3));
}

/**
 * Converts a grid cell to pixel coordinates (cell center).
 *
 * cellWidth  = screenWidth  / cols
 * cellHeight = screenHeight / rows
 * pixelX     = col * cellWidth  + cellWidth  / 2
 * pixelY     = row * cellHeight + cellHeight / 2
 */
export function gridCellToPixel(
  cell: GridCell,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
): Point {
  const cellWidth = screenWidth / gridSize.cols;
  const cellHeight = screenHeight / gridSize.rows;
  return {
    x: cell.col * cellWidth + cellWidth / 2,
    y: cell.row * cellHeight + cellHeight / 2,
  };
}
