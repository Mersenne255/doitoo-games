import { BoardLayout, OccupancyGrid, PlacementResult } from '../models/game.models';

/**
 * Check whether a piece at a given anchor position fits on the board without conflicts.
 * Pure function — deterministic for same inputs.
 *
 * @param board - The board layout with dimensions and active cell mask
 * @param occupancy - Current occupancy grid (null = empty, string = piece ID)
 * @param pieceCells - Oriented cells relative to anchor [row, col]
 * @param anchorRow - Row position of the piece anchor on the board
 * @param anchorCol - Column position of the piece anchor on the board
 */
export function checkPlacement(
  board: BoardLayout,
  occupancy: OccupancyGrid,
  pieceCells: [number, number][],
  anchorRow: number,
  anchorCol: number
): PlacementResult {
  for (const [r, c] of pieceCells) {
    const absRow = anchorRow + r;
    const absCol = anchorCol + c;

    if (absRow < 0 || absRow >= board.height || absCol < 0 || absCol >= board.width) {
      return { valid: false, reason: 'out_of_bounds' };
    }
    if (!board.activeCells[absRow][absCol]) {
      return { valid: false, reason: 'inactive_cell' };
    }
    if (occupancy.cells[absRow][absCol] !== null) {
      return { valid: false, reason: 'occupied' };
    }
  }
  return { valid: true };
}

/** Create an empty occupancy grid for a given board */
export function createEmptyOccupancy(board: BoardLayout): OccupancyGrid {
  return {
    cells: Array.from({ length: board.height }, () =>
      Array.from({ length: board.width }, () => null)
    ),
  };
}

/** Apply a placement to an occupancy grid (mutates a copy) */
export function applyPlacement(
  occupancy: OccupancyGrid,
  pieceId: string,
  absoluteCells: [number, number][]
): OccupancyGrid {
  const newCells = occupancy.cells.map(row => [...row]);
  for (const [r, c] of absoluteCells) {
    newCells[r][c] = pieceId;
  }
  return { cells: newCells };
}

/** Remove a placement from an occupancy grid (returns new copy) */
export function removePlacement(
  occupancy: OccupancyGrid,
  pieceId: string
): OccupancyGrid {
  const newCells = occupancy.cells.map(row =>
    row.map(cell => (cell === pieceId ? null : cell))
  );
  return { cells: newCells };
}

/** Count occupied cells in an occupancy grid */
export function countOccupied(occupancy: OccupancyGrid): number {
  return occupancy.cells.reduce(
    (sum, row) => sum + row.filter(c => c !== null).length,
    0
  );
}

/** Count active cells in a board layout */
export function countActiveCells(board: BoardLayout): number {
  return board.activeCells.reduce(
    (sum, row) => sum + row.filter(Boolean).length,
    0
  );
}
