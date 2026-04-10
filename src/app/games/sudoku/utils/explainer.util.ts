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
      tryHiddenPair(candidates, gridSize, boxRows, boxCols) ??
      tryNakedTriple(candidates, gridSize, boxRows, boxCols) ??
      tryPointingPair(candidates, gridSize, boxRows, boxCols) ??
      tryBoxLineReduction(candidates, gridSize, boxRows, boxCols) ??
      tryXWing(candidates, gridSize) ??
      tryXYWing(candidates, gridSize, boxRows, boxCols) ??
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
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0 && candidates[r][c].size === 1) {
        const digit = [...candidates[r][c]][0];
        // Related: all filled peers that eliminate other digits
        const related: CellPosition[] = [];
        for (let cc = 0; cc < gridSize; cc++) {
          if (cc !== c && grid[r][cc] !== 0) related.push({ row: r, col: cc });
        }
        for (let rr = 0; rr < gridSize; rr++) {
          if (rr !== r && grid[rr][c] !== 0) related.push({ row: rr, col: c });
        }
        const br = Math.floor(r / boxRows) * boxRows;
        const bc = Math.floor(c / boxCols) * boxCols;
        for (let rr = br; rr < br + boxRows; rr++) {
          for (let cc = bc; cc < bc + boxCols; cc++) {
            if ((rr !== r || cc !== c) && grid[rr][cc] !== 0 && rr !== r && cc !== c) {
              related.push({ row: rr, col: cc });
            }
          }
        }
        // Build child-friendly explanation listing which digits are taken
        const rowDigits: number[] = [];
        for (let cc = 0; cc < gridSize; cc++) {
          if (cc !== c && grid[r][cc] !== 0) rowDigits.push(grid[r][cc]);
        }
        const colDigits: number[] = [];
        for (let rr = 0; rr < gridSize; rr++) {
          if (rr !== r && grid[rr][c] !== 0) colDigits.push(grid[rr][c]);
        }
        const boxDigits: number[] = [];
        for (let rr = br; rr < br + boxRows; rr++) {
          for (let cc = bc; cc < bc + boxCols; cc++) {
            if ((rr !== r || cc !== c) && grid[rr][cc] !== 0) {
              if (!rowDigits.includes(grid[rr][cc]) && !colDigits.includes(grid[rr][cc])) {
                boxDigits.push(grid[rr][cc]);
              }
            }
          }
        }
        const parts: string[] = [];
        if (rowDigits.length > 0) parts.push(`Row ${r + 1} already has ${rowDigits.sort((a, b) => a - b).join(', ')}`);
        if (colDigits.length > 0) parts.push(`Column ${c + 1} already has ${colDigits.sort((a, b) => a - b).join(', ')}`);
        if (boxDigits.length > 0) parts.push(`The box already has ${boxDigits.sort((a, b) => a - b).join(', ')}`);
        const reason = parts.length > 0 ? '\n• ' + parts.join('\n• ') : '';
        return {
          technique: 'naked_single' as TechniqueName,
          cells: [{ row: r, col: c }],
          digit,
          relatedCells: related,
          explanation:
            `Only ${digit} can go in cell (${r + 1},${c + 1}).${reason}`,
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
        // Related: all cells that block digit d from the other empty cells in this unit
        const related: CellPosition[] = [];
        const otherEmpty = unit.filter(
          p => (p.row !== r || p.col !== c) && grid[p.row][p.col] === 0,
        );
        // For each other empty cell, find WHY it can't have d
        const blockerReasons: string[] = [];
        for (const p of otherEmpty) {
          if (!candidates[p.row][p.col].has(d)) {
            // Find the blocker: check row, col, box for digit d
            let blockerDesc = '';
            for (let cc = 0; cc < gridSize; cc++) {
              if (grid[p.row][cc] === d) {
                related.push({ row: p.row, col: cc });
                blockerDesc = `${d} is already in row ${p.row + 1} at (${p.row + 1},${cc + 1})`;
                break;
              }
            }
            if (!blockerDesc) {
              for (let rr = 0; rr < gridSize; rr++) {
                if (grid[rr][p.col] === d) {
                  related.push({ row: rr, col: p.col });
                  blockerDesc = `${d} is already in column ${p.col + 1} at (${rr + 1},${p.col + 1})`;
                  break;
                }
              }
            }
            if (!blockerDesc) {
              const pbr = Math.floor(p.row / boxRows) * boxRows;
              const pbc = Math.floor(p.col / boxCols) * boxCols;
              for (let rr = pbr; rr < pbr + boxRows; rr++) {
                for (let cc = pbc; cc < pbc + boxCols; cc++) {
                  if (grid[rr][cc] === d) {
                    related.push({ row: rr, col: cc });
                    blockerDesc = `${d} is already in its box at (${rr + 1},${cc + 1})`;
                  }
                }
              }
            }
            if (blockerDesc) {
              blockerReasons.push(`Cell (${p.row + 1},${p.col + 1}) can't be ${d} because ${blockerDesc}`);
            }
          }
        }
        // Also add filled cells in the unit as related
        for (const p of unit) {
          if ((p.row !== r || p.col !== c) && grid[p.row][p.col] !== 0) {
            if (!related.some(rp => rp.row === p.row && rp.col === p.col)) {
              related.push(p);
            }
          }
        }
        const reasonText = blockerReasons.length > 0
          ? '\n• ' + blockerReasons.join('\n• ')
          : '';
        return {
          technique: 'hidden_single' as TechniqueName,
          cells: [{ row: r, col: c }],
          digit: d,
          relatedCells: related,
          explanation:
            `Digit ${d} must go in cell (${r + 1},${c + 1}) — it's the only spot in ${label}.${reasonText}`,
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
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `Cells (${a.row + 1},${a.col + 1}) and (${b.row + 1},${b.col + 1}) in ${label} ` +
                `can only be ${pairDigits[0]} or ${pairDigits[1]}. ` +
                `So no other cell in ${label} can have ${pairDigits[0]} or ${pairDigits[1]}.`,
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

// ── 3b. Hidden Pair ──

function tryHiddenPair(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  const units = allUnits(gridSize, boxRows, boxCols);
  for (const { unit, label } of units) {
    // Find digits that appear in exactly 2 cells in this unit
    const digitCells = new Map<number, CellPosition[]>();
    for (let d = 1; d <= gridSize; d++) {
      const cells = unit.filter(p => candidates[p.row][p.col].has(d));
      if (cells.length === 2) digitCells.set(d, cells);
    }
    // Find pairs of digits that share the same two cells
    const digits = [...digitCells.keys()];
    for (let i = 0; i < digits.length; i++) {
      for (let j = i + 1; j < digits.length; j++) {
        const cellsA = digitCells.get(digits[i])!;
        const cellsB = digitCells.get(digits[j])!;
        if (cellsA[0].row === cellsB[0].row && cellsA[0].col === cellsB[0].col &&
            cellsA[1].row === cellsB[1].row && cellsA[1].col === cellsB[1].col) {
          const pairDigits = [digits[i], digits[j]].sort((a, b) => a - b);
          const pairCells = [cellsA[0], cellsA[1]];
          // Check if there are other candidates to eliminate from these two cells
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (const p of pairCells) {
            const toRemove = [...candidates[p.row][p.col]].filter(d => !pairDigits.includes(d));
            if (toRemove.length > 0) {
              eliminations.push({ cell: p, digits: toRemove });
            }
          }
          if (eliminations.length > 0) {
            return {
              technique: 'hidden_pair' as TechniqueName,
              cells: pairCells,
              eliminations,
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `In ${label}, digits ${pairDigits[0]} and ${pairDigits[1]} can only go in cells (${pairCells[0].row + 1},${pairCells[0].col + 1}) and (${pairCells[1].row + 1},${pairCells[1].col + 1}).` +
                `\n• These two cells must contain ${pairDigits[0]} and ${pairDigits[1]}` +
                `\n• All other candidates in these cells can be removed`,
            };
          }
        }
      }
    }
  }
  return null;
}

// ── 3c. Naked Triple ──

function tryNakedTriple(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  const units = allUnits(gridSize, boxRows, boxCols);
  for (const { unit, label } of units) {
    const emptyCells = unit.filter(p => candidates[p.row][p.col].size >= 2 && candidates[p.row][p.col].size <= 3);
    if (emptyCells.length < 3) continue;
    for (let i = 0; i < emptyCells.length; i++) {
      for (let j = i + 1; j < emptyCells.length; j++) {
        for (let k = j + 1; k < emptyCells.length; k++) {
          const a = emptyCells[i], b = emptyCells[j], c = emptyCells[k];
          const union = new Set([...candidates[a.row][a.col], ...candidates[b.row][b.col], ...candidates[c.row][c.col]]);
          if (union.size !== 3) continue;
          const tripleDigits = [...union].sort((x, y) => x - y);
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (const p of unit) {
            if ((p.row === a.row && p.col === a.col) || (p.row === b.row && p.col === b.col) || (p.row === c.row && p.col === c.col)) continue;
            const removed = tripleDigits.filter(d => candidates[p.row][p.col].has(d));
            if (removed.length > 0) eliminations.push({ cell: p, digits: removed });
          }
          if (eliminations.length > 0) {
            return {
              technique: 'naked_triple' as TechniqueName,
              cells: [a, b, c],
              eliminations,
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `Three cells in ${label} — (${a.row + 1},${a.col + 1}), (${b.row + 1},${b.col + 1}), (${c.row + 1},${c.col + 1}) — can only contain {${tripleDigits.join(',')}}.` +
                `\n• No other cell in ${label} can have ${tripleDigits.join(', ')}`,
            };
          }
        }
      }
    }
  }
  return null;
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
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `In the box at (${br + 1},${bc + 1}), digit ${d} can only be in row ${row + 1}. ` +
                `So ${d} can't appear in row ${row + 1} outside this box.`,
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
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `In the box at (${br + 1},${bc + 1}), digit ${d} can only appear in column ${col + 1} — at cells ${positions.map(p => `(${p.row + 1},${p.col + 1})`).join(' and ')}. ` +
                `So ${d} can be removed from other cells in column ${col + 1} outside this box.`,
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
            relatedCells: eliminations.map(e => e.cell),
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
            relatedCells: eliminations.map(e => e.cell),
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

// ── 7. X-Wing ──

function tryXWing(
  candidates: Set<number>[][],
  gridSize: number,
): SolveStep | null {
  // Check rows: find digit appearing in exactly 2 columns in two different rows
  for (let d = 1; d <= gridSize; d++) {
    const rowPairs: { row: number; cols: number[] }[] = [];
    for (let r = 0; r < gridSize; r++) {
      const cols: number[] = [];
      for (let c = 0; c < gridSize; c++) {
        if (candidates[r][c].has(d)) cols.push(c);
      }
      if (cols.length === 2) rowPairs.push({ row: r, cols });
    }
    for (let i = 0; i < rowPairs.length; i++) {
      for (let j = i + 1; j < rowPairs.length; j++) {
        if (rowPairs[i].cols[0] === rowPairs[j].cols[0] && rowPairs[i].cols[1] === rowPairs[j].cols[1]) {
          const [c1, c2] = rowPairs[i].cols;
          const r1 = rowPairs[i].row, r2 = rowPairs[j].row;
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (let r = 0; r < gridSize; r++) {
            if (r === r1 || r === r2) continue;
            if (candidates[r][c1].has(d)) eliminations.push({ cell: { row: r, col: c1 }, digits: [d] });
            if (candidates[r][c2].has(d)) eliminations.push({ cell: { row: r, col: c2 }, digits: [d] });
          }
          if (eliminations.length > 0) {
            const cells = [{ row: r1, col: c1 }, { row: r1, col: c2 }, { row: r2, col: c1 }, { row: r2, col: c2 }];
            return {
              technique: 'x_wing' as TechniqueName,
              cells,
              eliminations,
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `X-Wing on digit ${d}: rows ${r1 + 1} and ${r2 + 1} both have ${d} in only columns ${c1 + 1} and ${c2 + 1}.` +
                `\n• This means ${d} must be in one of these four cells` +
                `\n• So ${d} can be removed from all other cells in columns ${c1 + 1} and ${c2 + 1}`,
            };
          }
        }
      }
    }
    // Check columns: same logic transposed
    const colPairs: { col: number; rows: number[] }[] = [];
    for (let c = 0; c < gridSize; c++) {
      const rows: number[] = [];
      for (let r = 0; r < gridSize; r++) {
        if (candidates[r][c].has(d)) rows.push(r);
      }
      if (rows.length === 2) colPairs.push({ col: c, rows });
    }
    for (let i = 0; i < colPairs.length; i++) {
      for (let j = i + 1; j < colPairs.length; j++) {
        if (colPairs[i].rows[0] === colPairs[j].rows[0] && colPairs[i].rows[1] === colPairs[j].rows[1]) {
          const [r1, r2] = colPairs[i].rows;
          const c1 = colPairs[i].col, c2 = colPairs[j].col;
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (let c = 0; c < gridSize; c++) {
            if (c === c1 || c === c2) continue;
            if (candidates[r1][c].has(d)) eliminations.push({ cell: { row: r1, col: c }, digits: [d] });
            if (candidates[r2][c].has(d)) eliminations.push({ cell: { row: r2, col: c }, digits: [d] });
          }
          if (eliminations.length > 0) {
            const cells = [{ row: r1, col: c1 }, { row: r1, col: c2 }, { row: r2, col: c1 }, { row: r2, col: c2 }];
            return {
              technique: 'x_wing' as TechniqueName,
              cells,
              eliminations,
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `X-Wing on digit ${d}: columns ${c1 + 1} and ${c2 + 1} both have ${d} in only rows ${r1 + 1} and ${r2 + 1}.` +
                `\n• This means ${d} must be in one of these four cells` +
                `\n• So ${d} can be removed from all other cells in rows ${r1 + 1} and ${r2 + 1}`,
            };
          }
        }
      }
    }
  }
  return null;
}

// ── 8. XY-Wing ──

function tryXYWing(
  candidates: Set<number>[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
): SolveStep | null {
  // Find pivot cell with exactly 2 candidates {X, Y}
  for (let pr = 0; pr < gridSize; pr++) {
    for (let pc = 0; pc < gridSize; pc++) {
      if (candidates[pr][pc].size !== 2) continue;
      const [x, y] = [...candidates[pr][pc]].sort((a, b) => a - b);

      // Find wing cells that are peers of pivot and have exactly 2 candidates
      const peers = getPeers(pr, pc, gridSize, boxRows, boxCols);
      const wings: { pos: CellPosition; cands: number[] }[] = [];
      for (const p of peers) {
        if (candidates[p.row][p.col].size === 2) {
          wings.push({ pos: p, cands: [...candidates[p.row][p.col]].sort((a, b) => a - b) });
        }
      }

      // Find wing1 with {X, Z} and wing2 with {Y, Z} where Z is the shared elimination digit
      for (let i = 0; i < wings.length; i++) {
        for (let j = i + 1; j < wings.length; j++) {
          const w1 = wings[i], w2 = wings[j];
          // w1 must share one digit with pivot, w2 must share the other
          let z = -1;
          if (w1.cands.includes(x) && !w1.cands.includes(y) && w2.cands.includes(y) && !w2.cands.includes(x)) {
            // w1 = {X, Z}, w2 = {Y, Z}
            z = w1.cands.find(d => d !== x)!;
            if (w2.cands.find(d => d !== y) !== z) continue;
          } else if (w1.cands.includes(y) && !w1.cands.includes(x) && w2.cands.includes(x) && !w2.cands.includes(y)) {
            // w1 = {Y, Z}, w2 = {X, Z}
            z = w1.cands.find(d => d !== y)!;
            if (w2.cands.find(d => d !== x) !== z) continue;
          } else {
            continue;
          }

          // Find cells that see both wings and have Z as candidate
          const wing1Peers = new Set(getPeers(w1.pos.row, w1.pos.col, gridSize, boxRows, boxCols).map(p => `${p.row},${p.col}`));
          const wing2Peers = new Set(getPeers(w2.pos.row, w2.pos.col, gridSize, boxRows, boxCols).map(p => `${p.row},${p.col}`));
          const eliminations: { cell: CellPosition; digits: number[] }[] = [];
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              if (r === pr && c === pc) continue;
              if (r === w1.pos.row && c === w1.pos.col) continue;
              if (r === w2.pos.row && c === w2.pos.col) continue;
              const key = `${r},${c}`;
              if (wing1Peers.has(key) && wing2Peers.has(key) && candidates[r][c].has(z)) {
                eliminations.push({ cell: { row: r, col: c }, digits: [z] });
              }
            }
          }
          if (eliminations.length > 0) {
            return {
              technique: 'xy_wing' as TechniqueName,
              cells: [{ row: pr, col: pc }, w1.pos, w2.pos],
              eliminations,
              relatedCells: eliminations.map(e => e.cell),
              explanation:
                `XY-Wing: pivot (${pr + 1},${pc + 1}) has {${x},${y}}, wing (${w1.pos.row + 1},${w1.pos.col + 1}) has {${w1.cands.join(',')}}, wing (${w2.pos.row + 1},${w2.pos.col + 1}) has {${w2.cands.join(',')}}.` +
                `\n• One of the wings must contain ${z}` +
                `\n• Any cell that sees both wings can't have ${z}`,
            };
          }
        }
      }
    }
  }
  return null;
}

function getPeers(row: number, col: number, gridSize: number, boxRows: number, boxCols: number): CellPosition[] {
  const peers: CellPosition[] = [];
  const seen = new Set<string>();
  const add = (r: number, c: number) => {
    const key = `${r},${c}`;
    if ((r !== row || c !== col) && !seen.has(key)) {
      seen.add(key);
      peers.push({ row: r, col: c });
    }
  };
  for (let c = 0; c < gridSize; c++) add(row, c);
  for (let r = 0; r < gridSize; r++) add(r, col);
  const br = Math.floor(row / boxRows) * boxRows;
  const bc = Math.floor(col / boxCols) * boxCols;
  for (let r = br; r < br + boxRows; r++) {
    for (let c = bc; c < bc + boxCols; c++) add(r, c);
  }
  return peers;
}

// ── 9. Backtrack Guess ──

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
    `Advanced reasoning required. Testing digit ${digit} in cell (${bestR + 1},${bestC + 1}).` +
      `\n• No standard technique can make progress here` +
      `\n• We try ${digit} and check if it leads to a valid solution`,
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
