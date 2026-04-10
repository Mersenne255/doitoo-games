/**
 * Puzzle generator — seeded deterministic puzzle generation.
 * Pure functions — no side effects.
 *
 * Algorithm:
 * 1. Generate complete solution via seeded random fill + backtracking
 * 2. Remove cells while verifying unique solvability after each removal
 * 3. Verify technique ceiling via explainer
 */

import {
  Puzzle,
  DifficultyParams,
  TECHNIQUE_ORDER,
  TechniqueName,
} from '../models/game.models';
import { solve } from './solver.util';
import { explain } from './explainer.util';

// ── Seeded PRNG (mulberry32) ──

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fisher-Yates shuffle using seeded PRNG ──

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Fill grid: backtracking with randomized candidate ordering ──

function fillGrid(
  grid: number[][],
  gridSize: number,
  boxRows: number,
  boxCols: number,
  rng: () => number,
): boolean {
  const pos = findEmpty(grid, gridSize);
  if (!pos) return true; // grid complete

  const [row, col] = pos;
  const digits = shuffle(
    Array.from({ length: gridSize }, (_, i) => i + 1),
    rng,
  );

  for (const d of digits) {
    if (isValid(grid, row, col, d, gridSize, boxRows, boxCols)) {
      grid[row][col] = d;
      if (fillGrid(grid, gridSize, boxRows, boxCols, rng)) return true;
      grid[row][col] = 0;
    }
  }
  return false;
}

function findEmpty(grid: number[][], gridSize: number): [number, number] | null {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function isValid(
  grid: number[][],
  row: number,
  col: number,
  digit: number,
  gridSize: number,
  boxRows: number,
  boxCols: number,
): boolean {
  // Check row
  for (let c = 0; c < gridSize; c++) {
    if (grid[row][c] === digit) return false;
  }
  // Check column
  for (let r = 0; r < gridSize; r++) {
    if (grid[r][col] === digit) return false;
  }
  // Check box
  const br = Math.floor(row / boxRows) * boxRows;
  const bc = Math.floor(col / boxCols) * boxCols;
  for (let r = br; r < br + boxRows; r++) {
    for (let c = bc; c < bc + boxCols; c++) {
      if (grid[r][c] === digit) return false;
    }
  }
  return true;
}

// ── Technique ceiling check ──

function techniqueIndex(t: TechniqueName): number {
  return TECHNIQUE_ORDER.indexOf(t);
}

function exceedsCeiling(steps: { technique: TechniqueName }[], ceiling: TechniqueName): boolean {
  const ceilingIdx = techniqueIndex(ceiling);
  // backtrack_guess is always allowed as last resort
  const backtrackIdx = techniqueIndex('backtrack_guess');
  for (const step of steps) {
    const idx = techniqueIndex(step.technique);
    if (idx > ceilingIdx && idx !== backtrackIdx) return true;
  }
  return false;
}

// ── Public API ──

/**
 * Generate a single puzzle deterministically from a seed.
 */
export function generatePuzzle(
  boxRows: number,
  boxCols: number,
  params: DifficultyParams,
  seed: number,
): Puzzle {
  const gridSize = boxRows * boxCols;
  const rng = mulberry32(seed);

  // 1. Build empty grid
  const solution: number[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(0),
  );

  // 2a. Fill first row with shuffled digits
  const firstRow = shuffle(
    Array.from({ length: gridSize }, (_, i) => i + 1),
    rng,
  );
  for (let c = 0; c < gridSize; c++) {
    solution[0][c] = firstRow[c];
  }

  // 2b. Fill rest via backtracking with randomized candidates
  fillGrid(solution, gridSize, boxRows, boxCols, rng);

  // 3. Remove cells to create puzzle
  const grid = solution.map(row => [...row]);
  const allPositions = shuffle(
    Array.from({ length: gridSize * gridSize }, (_, i) => ({
      row: Math.floor(i / gridSize),
      col: i % gridSize,
    })),
    rng,
  );

  const targetMin = params.givenCountRange.min;
  const targetMax = params.givenCountRange.max;
  let givenCount = gridSize * gridSize;
  let lastRemovedPos: { row: number; col: number } | null = null;
  let lastRemovedVal = 0;

  for (const pos of allPositions) {
    if (givenCount <= targetMin) break;

    const val = grid[pos.row][pos.col];
    if (val === 0) continue; // already removed

    // Temporarily remove
    grid[pos.row][pos.col] = 0;
    const result = solve(grid, boxRows, boxCols);

    if (result.status === 'unique') {
      lastRemovedPos = pos;
      lastRemovedVal = val;
      givenCount--;
    } else {
      // Restore — removal breaks uniqueness
      grid[pos.row][pos.col] = val;
    }
  }

  // 4. Verify technique ceiling
  const steps = explain(grid, boxRows, boxCols);
  if (exceedsCeiling(steps, params.techniqueCeiling) && lastRemovedPos) {
    // Restore last removed cell
    grid[lastRemovedPos.row][lastRemovedPos.col] = lastRemovedVal;
  }

  return { grid, solution, boxRows, boxCols };
}

/**
 * Generate multiple puzzles for a round, each with a distinct derived seed.
 */
export function generateRound(
  puzzleCount: number,
  boxRows: number,
  boxCols: number,
  params: DifficultyParams,
  seed: number,
): Puzzle[] {
  const rng = mulberry32(seed);
  const puzzles: Puzzle[] = [];
  for (let i = 0; i < puzzleCount; i++) {
    // Derive a unique seed for each puzzle from the round PRNG
    const puzzleSeed = Math.floor(rng() * 0x7FFFFFFF);
    puzzles.push(generatePuzzle(boxRows, boxCols, params, puzzleSeed));
  }
  return puzzles;
}
