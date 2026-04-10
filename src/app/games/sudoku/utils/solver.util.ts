/**
 * Sudoku solver using constraint propagation + backtracking.
 * Pure function — no side effects.
 * Supports box dimensions: (2,2) → 4×4, (2,3) → 6×6, (3,3) → 9×9.
 */

export type SolverResult =
  | { status: 'unique'; solution: number[][] }
  | { status: 'none' }
  | { status: 'multiple' };

const MAX_DEPTH = 1000;

/**
 * Solve a Sudoku grid.
 * @param grid 2D array where 0 = empty, 1–gridSize = filled
 * @param boxRows number of rows per box
 * @param boxCols number of columns per box
 */
export function solve(
  grid: number[][],
  boxRows: number,
  boxCols: number
): SolverResult {
  const gridSize = boxRows * boxCols;

  // Deep-copy the grid to avoid mutation
  const work = grid.map(row => [...row]);

  // Build candidate sets for each cell
  const candidates: Set<number>[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => new Set<number>())
  );

  // Initialize candidates for empty cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (work[r][c] === 0) {
        for (let d = 1; d <= gridSize; d++) {
          candidates[r][c].add(d);
        }
      }
    }
  }

  // Eliminate existing digits from candidates
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (work[r][c] !== 0) {
        eliminateFromPeers(candidates, work[r][c], r, c, gridSize, boxRows, boxCols);
      }
    }
  }

  // Check for initial contradictions
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (work[r][c] === 0 && candidates[r][c].size === 0) {
        return { status: 'none' };
      }
    }
  }

  // Run constraint propagation
  const propResult = propagate(work, candidates, gridSize, boxRows, boxCols);
  if (!propResult) {
    return { status: 'none' };
  }

  // Check if grid is complete
  if (isComplete(work, gridSize)) {
    return { status: 'unique', solution: work };
  }

  // Backtracking search counting solutions
  const solutions: number[][][] = [];
  backtrack(work, candidates, gridSize, boxRows, boxCols, solutions, 0);

  if (solutions.length === 0) {
    return { status: 'none' };
  }
  if (solutions.length === 1) {
    return { status: 'unique', solution: solutions[0] };
  }
  return { status: 'multiple' };
}

/**
 * Eliminate digit from all peers of (row, col).
 * Returns false if a contradiction is found (a peer has zero candidates).
 */
function eliminateFromPeers(
  candidates: Set<number>[][],
  digit: number,
  row: number,
  col: number,
  gridSize: number,
  boxRows: number,
  boxCols: number
): boolean {
  // Row peers
  for (let c = 0; c < gridSize; c++) {
    if (c !== col) {
      candidates[row][c].delete(digit);
    }
  }
  // Column peers
  for (let r = 0; r < gridSize; r++) {
    if (r !== row) {
      candidates[r][col].delete(digit);
    }
  }
  // Box peers
  const boxStartRow = Math.floor(row / boxRows) * boxRows;
  const boxStartCol = Math.floor(col / boxCols) * boxCols;
  for (let r = boxStartRow; r < boxStartRow + boxRows; r++) {
    for (let c = boxStartCol; c < boxStartCol + boxCols; c++) {
      if (r !== row || c !== col) {
        candidates[r][c].delete(digit);
      }
    }
  }
  return true;
}

/**
 * Constraint propagation loop: naked singles + hidden singles.
 * Returns true if propagation succeeded, false if contradiction found.
 */
function propagate(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number
): boolean {
  let changed = true;
  while (changed) {
    changed = false;

    // Naked singles: cell with exactly one candidate
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] !== 0) continue;
        if (candidates[r][c].size === 0) return false;
        if (candidates[r][c].size === 1) {
          const digit = [...candidates[r][c]][0];
          grid[r][c] = digit;
          candidates[r][c].clear();
          eliminateFromPeers(candidates, digit, r, c, gridSize, boxRows, boxCols);
          changed = true;

          // Check for contradictions after elimination
          if (hasContradiction(grid, candidates, gridSize)) return false;
        }
      }
    }

    // Hidden singles in rows
    for (let r = 0; r < gridSize; r++) {
      for (let d = 1; d <= gridSize; d++) {
        if (rowHasDigit(grid, r, d, gridSize)) continue;
        let count = 0;
        let lastCol = -1;
        for (let c = 0; c < gridSize; c++) {
          if (grid[r][c] === 0 && candidates[r][c].has(d)) {
            count++;
            lastCol = c;
          }
        }
        if (count === 0) return false;
        if (count === 1) {
          grid[r][lastCol] = d;
          candidates[r][lastCol].clear();
          eliminateFromPeers(candidates, d, r, lastCol, gridSize, boxRows, boxCols);
          changed = true;
          if (hasContradiction(grid, candidates, gridSize)) return false;
        }
      }
    }

    // Hidden singles in columns
    for (let c = 0; c < gridSize; c++) {
      for (let d = 1; d <= gridSize; d++) {
        if (colHasDigit(grid, c, d, gridSize)) continue;
        let count = 0;
        let lastRow = -1;
        for (let r = 0; r < gridSize; r++) {
          if (grid[r][c] === 0 && candidates[r][c].has(d)) {
            count++;
            lastRow = r;
          }
        }
        if (count === 0) return false;
        if (count === 1) {
          grid[lastRow][c] = d;
          candidates[lastRow][c].clear();
          eliminateFromPeers(candidates, d, lastRow, c, gridSize, boxRows, boxCols);
          changed = true;
          if (hasContradiction(grid, candidates, gridSize)) return false;
        }
      }
    }

    // Hidden singles in boxes
    for (let br = 0; br < gridSize; br += boxRows) {
      for (let bc = 0; bc < gridSize; bc += boxCols) {
        for (let d = 1; d <= gridSize; d++) {
          if (boxHasDigit(grid, br, bc, d, boxRows, boxCols)) continue;
          let count = 0;
          let lastR = -1;
          let lastC = -1;
          for (let r = br; r < br + boxRows; r++) {
            for (let c = bc; c < bc + boxCols; c++) {
              if (grid[r][c] === 0 && candidates[r][c].has(d)) {
                count++;
                lastR = r;
                lastC = c;
              }
            }
          }
          if (count === 0) return false;
          if (count === 1) {
            grid[lastR][lastC] = d;
            candidates[lastR][lastC].clear();
            eliminateFromPeers(candidates, d, lastR, lastC, gridSize, boxRows, boxCols);
            changed = true;
            if (hasContradiction(grid, candidates, gridSize)) return false;
          }
        }
      }
    }
  }
  return true;
}

/**
 * Backtracking search. Finds up to 2 solutions (early exit on multiple).
 */
function backtrack(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
  solutions: number[][][],
  depth: number
): void {
  if (solutions.length >= 2) return;
  if (depth >= MAX_DEPTH) return;

  // Find the empty cell with fewest candidates (MRV heuristic)
  let minSize = gridSize + 1;
  let bestR = -1;
  let bestC = -1;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) {
        const size = candidates[r][c].size;
        if (size < minSize) {
          minSize = size;
          bestR = r;
          bestC = c;
        }
      }
    }
  }

  // No empty cell found — grid is complete
  if (bestR === -1) {
    solutions.push(grid.map(row => [...row]));
    return;
  }

  // No candidates for this cell — dead end
  if (minSize === 0) return;

  // Try each candidate
  const digits = [...candidates[bestR][bestC]];
  for (const digit of digits) {
    if (solutions.length >= 2) return;

    // Snapshot grid and candidates
    const gridSnap = grid.map(row => [...row]);
    const candSnap = candidates.map(row =>
      row.map(s => new Set(s))
    );

    // Assign digit
    grid[bestR][bestC] = digit;
    candidates[bestR][bestC].clear();
    eliminateFromPeers(candidates, digit, bestR, bestC, gridSize, boxRows, boxCols);

    // Propagate
    const ok = !hasContradiction(grid, candidates, gridSize) &&
      propagate(grid, candidates, gridSize, boxRows, boxCols);

    if (ok) {
      if (isComplete(grid, gridSize)) {
        solutions.push(grid.map(row => [...row]));
      } else {
        backtrack(grid, candidates, gridSize, boxRows, boxCols, solutions, depth + 1);
      }
    }

    // Restore snapshot
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = gridSnap[r][c];
        candidates[r][c] = candSnap[r][c];
      }
    }
  }
}

// ── Helper functions ──

function isComplete(grid: number[][], gridSize: number): boolean {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) return false;
    }
  }
  return true;
}

function hasContradiction(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number
): boolean {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0 && candidates[r][c].size === 0) {
        return true;
      }
    }
  }
  return false;
}

function rowHasDigit(grid: number[][], row: number, digit: number, gridSize: number): boolean {
  for (let c = 0; c < gridSize; c++) {
    if (grid[row][c] === digit) return true;
  }
  return false;
}

function colHasDigit(grid: number[][], col: number, digit: number, gridSize: number): boolean {
  for (let r = 0; r < gridSize; r++) {
    if (grid[r][col] === digit) return true;
  }
  return false;
}

function boxHasDigit(
  grid: number[][],
  boxStartRow: number,
  boxStartCol: number,
  digit: number,
  boxRows: number,
  boxCols: number
): boolean {
  for (let r = boxStartRow; r < boxStartRow + boxRows; r++) {
    for (let c = boxStartCol; c < boxStartCol + boxCols; c++) {
      if (grid[r][c] === digit) return true;
    }
  }
  return false;
}
