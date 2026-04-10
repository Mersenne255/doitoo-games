/**
 * Sudoku explainer — step-by-step solving with named techniques.
 * Pure function — no side effects.
 * Supports box dimensions: (2,2) → 4×4, (2,3) → 6×6, (3,3) → 9×9.
 *
 * Technique priority: naked_single → hidden_single → naked_pair →
 *   pointing_pair → box_line_reduction → backtrack_guess
 */

import {
  SolveStep,
  TechniqueName,
  CellPosition,
} from '../models/game.models';

// ── Public API ──

/**
 * Produce an ordered list of SolveSteps that fully solve the given grid.
 * Row/column numbers in explanation strings are 1-based for human readability.
 */
export function explain(
  grid: number[][],
  boxRows: number,
  boxCols: number,
): SolveStep[] {
  const gridSize = boxRows * boxCols;
  const work = grid.map(row => [...row]);
  const candidates = buildCandidates(work, gridSize, boxRows, boxCols);
  const steps: SolveStep[] = [];
  const maxIterations = gridSize * gridSize * 4; // safety valve
  let iterations = 0;

  while (!isComplete(work, gridSize)) {
    if (++iterations > maxIterations) break;

    const step =
      tryNakedSingle(work, candidates, gridSize, boxRows, boxCols) ??
      tryHiddenSingle(work, candidates, gridSize, boxRows, boxCols) ??
      tryNakedPair(candidates, gridSize, boxRows, boxCols) ??
      tryPointingPair(candidates, gridSize, boxRows, boxCols) ??
      tryBoxLineReduction(candidates, gridSize, boxRows, boxCols) ??
      doBacktrackGuess(work, candidates, gridSize, boxRows, boxCols);

    if (!step) break; // no progress possible

    steps.push(step);
    applyStep(work, candidates, step, gridSize, boxRows, boxCols);
  }

  return steps;
}

// ── Candidate helpers ──

function buildCandidates(
  grid: number[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): Set<number>[][] {
  const cands: Set<number>[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => new Set<number>()),
  );
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) {
        for (let d = 1; d <= gridSize; d++) cands[r][c].add(d);
      }
    }
  }
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== 0) {
        eliminateFromPeers(cands, grid[r][c], r, c, gridSize, boxRows, boxCols);
      }
    }
  }
  return cands;
}

function eliminateFromPeers(
  candidates: Set<number>[][],
  digit: number,
  row: number,
  col: number,
  gridSize: number,
  boxRows: number,
  boxCols: number,
): void {
  for (let c = 0; c < gridSize; c++) {
    if (c !== col) candidates[row][c].delete(digit);
  }
  for (let r = 0; r < gridSize; r++) {
    if (r !== row) candidates[r][col].delete(digit);
  }
  const br = Math.floor(row / boxRows) * boxRows;
  const bc = Math.floor(col / boxCols) * boxCols;
  for (let r = br; r < br + boxRows; r++) {
    for (let c = bc; c < bc + boxCols; c++) {
      if (r !== row || c !== col) candidates[r][c].delete(digit);
    }
  }
}

function isComplete(grid: number[][], gridSize: number): boolean {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) return false;
    }
  }
  return true;
}

// ── Unit iterators ──

type Unit = CellPosition[];

function getRowUnit(row: number, gridSize: number): Unit {
  return Array.from({ length: gridSize }, (_, c) => ({ row, col: c }));
}

function getColUnit(col: number, gridSize: number): Unit {
  return Array.from({ length: gridSize }, (_, r) => ({ row: r, col }));
}

function getBoxUnit(
  boxStartRow: number,
  boxStartCol: number,
  boxRows: number,
  boxCols: number,
): Unit {
  const cells: Unit = [];
  for (let r = boxStartRow; r < boxStartRow + boxRows; r++) {
    for (let c = boxStartCol; c < boxStartCol + boxCols; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function allUnits(
  gridSize: number,
  boxRows: number,
  boxCols: number,
): { unit: Unit; label: string }[] {
  const units: { unit: Unit; label: string }[] = [];
  for (let r = 0; r < gridSize; r++) {
    units.push({ unit: getRowUnit(r, gridSize), label: `row ${r + 1}` });
  }
  for (let c = 0; c < gridSize; c++) {
    units.push({ unit: getColUnit(c, gridSize), label: `column ${c + 1}` });
  }
  for (let br = 0; br < gridSize; br += boxRows) {
    for (let bc = 0; bc < gridSize; bc += boxCols) {
      units.push({
        unit: getBoxUnit(br, bc, boxRows, boxCols),
        label: `box`,
      });
    }
  }
  return units;
}

// ── 1. Naked Single ──

function tryNakedSingle(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number,
  _boxRows: number,
  _boxCols: number,
): SolveStep | null {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0 && candidates[r][c].size === 1) {
        const digit = [...candidates[r][c]][0];
        return {
          technique: 'naked_single' as TechniqueName,
          cells: [{ row: r, col: c }],
          digit,
          explanation:
            `Cell (${r + 1},${c + 1}) has only one candidate: ${digit}. ` +
            `Row ${r + 1}, column ${c + 1}, and box eliminate all other digits.`,
        };
      }
    }
  }
  return null;
}

// ── 2. Hidden Single ──

function tryHiddenSingle(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  const units = allUnits(gridSize, boxRows, boxCols);
  for (const { unit, label } of units) {
    for (let d = 1; d <= gridSize; d++) {
      // Skip if digit already placed in this unit
      if (unit.some(p => grid[p.row][p.col] === d)) continue;

      const possible = unit.filter(
        p => grid[p.row][p.col] === 0 && candidates[p.row][p.col].has(d),
      );
      if (possible.length === 1) {
        const { row: r, col: c } = possible[0];
        return {
          technique: 'hidden_single' as TechniqueName,
          cells: [{ row: r, col: c }],
          digit: d,
          explanation:
            `Digit ${d} can only go in cell (${r + 1},${c + 1}) within ${label}.`,
        };
      }
    }
  }
  return null;
}

// ── 3. Naked Pair ──

function tryNakedPair(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  const units = allUnits(gridSize, boxRows, boxCols);
  for (const { unit, label } of units) {
    // Find cells in this unit with exactly 2 candidates
    const twos = unit.filter(p => candidates[p.row][p.col].size === 2);
    for (let i = 0; i < twos.length; i++) {
      for (let j = i + 1; j < twos.length; j++) {
        const a = twos[i];
        const b = twos[j];
        const setA = candidates[a.row][a.col];
        const setB = candidates[b.row][b.col];
        if (setsEqual(setA, setB)) {
          const pairDigits = [...setA].sort((x, y) => x - y);
          // Check if there are eliminations to make
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (const p of unit) {
            if ((p.row === a.row && p.col === a.col) || (p.row === b.row && p.col === b.col)) continue;
            const removed: number[] = [];
            for (const d of pairDigits) {
              if (candidates[p.row][p.col].has(d)) removed.push(d);
            }
            if (removed.length > 0) {
              eliminations.push({ cell: { row: p.row, col: p.col }, digits: removed });
            }
          }
          if (eliminations.length > 0) {
            return {
              technique: 'naked_pair' as TechniqueName,
              cells: [a, b],
              eliminations,
              explanation:
                `Cells (${a.row + 1},${a.col + 1}) and (${b.row + 1},${b.col + 1}) in ${label} ` +
                `form a naked pair {${pairDigits.join(',')}}. ` +
                `Eliminating ${pairDigits.join(' and ')} from other cells in the ${label}.`,
            };
          }
        }
      }
    }
  }
  return null;
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// ── 4. Pointing Pair ──

function tryPointingPair(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  // For each box, check if a candidate is restricted to one row or one column
  for (let br = 0; br < gridSize; br += boxRows) {
    for (let bc = 0; bc < gridSize; bc += boxCols) {
      for (let d = 1; d <= gridSize; d++) {
        const positions: CellPosition[] = [];
        for (let r = br; r < br + boxRows; r++) {
          for (let c = bc; c < bc + boxCols; c++) {
            if (candidates[r][c].has(d)) positions.push({ row: r, col: c });
          }
        }
        if (positions.length < 2) continue;

        // Check if all in same row
        const allSameRow = positions.every(p => p.row === positions[0].row);
        if (allSameRow) {
          const row = positions[0].row;
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (let c = 0; c < gridSize; c++) {
            if (c >= bc && c < bc + boxCols) continue; // skip cells inside the box
            if (candidates[row][c].has(d)) {
              eliminations.push({ cell: { row, col: c }, digits: [d] });
            }
          }
          if (eliminations.length > 0) {
            return {
              technique: 'pointing_pair' as TechniqueName,
              cells: positions,
              eliminations,
              explanation:
                `In the box starting at (${br + 1},${bc + 1}), digit ${d} is restricted to row ${row + 1}. ` +
                `Eliminating ${d} from other cells in row ${row + 1} outside the box.`,
            };
          }
        }

        // Check if all in same column
        const allSameCol = positions.every(p => p.col === positions[0].col);
        if (allSameCol) {
          const col = positions[0].col;
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (let r = 0; r < gridSize; r++) {
            if (r >= br && r < br + boxRows) continue; // skip cells inside the box
            if (candidates[r][col].has(d)) {
              eliminations.push({ cell: { row: r, col }, digits: [d] });
            }
          }
          if (eliminations.length > 0) {
            return {
              technique: 'pointing_pair' as TechniqueName,
              cells: positions,
              eliminations,
              explanation:
                `In the box starting at (${br + 1},${bc + 1}), digit ${d} is restricted to column ${col + 1}. ` +
                `Eliminating ${d} from other cells in column ${col + 1} outside the box.`,
            };
          }
        }
      }
    }
  }
  return null;
}

// ── 5. Box Line Reduction ──

function tryBoxLineReduction(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  // For each row, check if a candidate is restricted to one box
  for (let row = 0; row < gridSize; row++) {
    for (let d = 1; d <= gridSize; d++) {
      const positions: CellPosition[] = [];
      for (let c = 0; c < gridSize; c++) {
        if (candidates[row][c].has(d)) positions.push({ row, col: c });
      }
      if (positions.length < 2) continue;

      const boxCol0 = Math.floor(positions[0].col / boxCols) * boxCols;
      const allSameBox = positions.every(
        p => Math.floor(p.col / boxCols) * boxCols === boxCol0,
      );
      if (allSameBox) {
        const boxRow0 = Math.floor(row / boxRows) * boxRows;
        const eliminations: { cell: CellPosition; digits: number[] }[] = [];
        for (let r = boxRow0; r < boxRow0 + boxRows; r++) {
          for (let c = boxCol0; c < boxCol0 + boxCols; c++) {
            if (r === row) continue; // skip the row itself
            if (candidates[r][c].has(d)) {
              eliminations.push({ cell: { row: r, col: c }, digits: [d] });
            }
          }
        }
        if (eliminations.length > 0) {
          return {
            technique: 'box_line_reduction' as TechniqueName,
            cells: positions,
            eliminations,
            explanation:
              `In row ${row + 1}, digit ${d} is restricted to the box starting at (${boxRow0 + 1},${boxCol0 + 1}). ` +
              `Eliminating ${d} from other cells in that box.`,
          };
        }
      }
    }
  }

  // For each column, check if a candidate is restricted to one box
  for (let col = 0; col < gridSize; col++) {
    for (let d = 1; d <= gridSize; d++) {
      const positions: CellPosition[] = [];
      for (let r = 0; r < gridSize; r++) {
        if (candidates[r][col].has(d)) positions.push({ row: r, col });
      }
      if (positions.length < 2) continue;

      const boxRow0 = Math.floor(positions[0].row / boxRows) * boxRows;
      const allSameBox = positions.every(
        p => Math.floor(p.row / boxRows) * boxRows === boxRow0,
      );
      if (allSameBox) {
        const boxCol0 = Math.floor(col / boxCols) * boxCols;
        const eliminations: { cell: CellPosition; digits: number[] }[] = [];
        for (let r = boxRow0; r < boxRow0 + boxRows; r++) {
          for (let c = boxCol0; c < boxCol0 + boxCols; c++) {
            if (c === col) continue; // skip the column itself
            if (candidates[r][c].has(d)) {
              eliminations.push({ cell: { row: r, col: c }, digits: [d] });
            }
          }
        }
        if (eliminations.length > 0) {
          return {
            technique: 'box_line_reduction' as TechniqueName,
            cells: positions,
            eliminations,
            explanation:
              `In column ${col + 1}, digit ${d} is restricted to the box starting at (${boxRow0 + 1},${boxCol0 + 1}). ` +
              `Eliminating ${d} from other cells in that box.`,
          };
        }
      }
    }
  }

  return null;
}

// ── 6. Backtrack Guess ──

function doBacktrackGuess(
  grid: number[][],
  candidates: Set<number>[][],
  gridSize: number,
  _boxRows: number,
  _boxCols: number,
): SolveStep | null {
  // Pick the empty cell with fewest candidates (MRV)
  let minSize = gridSize + 1;
  let bestR = -1;
  let bestC = -1;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0 && candidates[r][c].size > 0 && candidates[r][c].size < minSize) {
        minSize = candidates[r][c].size;
        bestR = r;
        bestC = c;
      }
    }
  }
  if (bestR === -1) return null; // no cell with candidates — dead end
  const digit = [...candidates[bestR][bestC]][0];
  return {
    technique: 'backtrack_guess' as TechniqueName,
    cells: [{ row: bestR, col: bestC }],
    digit,
    explanation:
      `No logical technique applies. Guessing digit ${digit} in cell (${bestR + 1},${bestC + 1}) ` +
      `(${candidates[bestR][bestC].size} candidates remaining).`,
  };
}

// ── Apply a step to the working grid + candidates ──

function applyStep(
  grid: number[][],
  candidates: Set<number>[][],
  step: SolveStep,
  gridSize: number,
  boxRows: number,
  boxCols: number,
): void {
  // Apply digit placement (naked_single, hidden_single, backtrack_guess)
  if (step.digit !== undefined && step.cells.length > 0) {
    const isPlacement =
      step.technique === 'naked_single' ||
      step.technique === 'hidden_single' ||
      step.technique === 'backtrack_guess';
    if (isPlacement) {
      const { row, col } = step.cells[0];
      grid[row][col] = step.digit;
      candidates[row][col].clear();
      eliminateFromPeers(candidates, step.digit, row, col, gridSize, boxRows, boxCols);
    }
  }

  // Apply eliminations (naked_pair, pointing_pair, box_line_reduction)
  if (step.eliminations) {
    for (const elim of step.eliminations) {
      for (const d of elim.digits) {
        candidates[elim.cell.row][elim.cell.col].delete(d);
      }
    }
  }
}
