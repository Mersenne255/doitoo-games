import {
  BoardLayout,
  DifficultyParams,
  IDENTITY_ORIENTATION,
  Orientation,
  PIECE_COLORS,
  PieceColor,
  PieceDefinition,
  PolyominoConfig,
  Puzzle,
  PuzzlePiece,
  SolutionEntry,
} from '../models/game.models';
import { mulberry32 } from './board-generator.util';
import { getPiecesBySize, getPiecesByComplexity, getDistinctOrientations, normalize } from './piece-library.util';

import { GENERATOR_CONFIG } from '../models/generator.config';

const MAX_RETRIES = GENERATOR_CONFIG.maxRetries;

/**
 * Generate a solvable puzzle by assembling pieces into a blob.
 *
 * Algorithm:
 * 1. Select N pieces from the pool
 * 2. Place them one by one on an infinite grid, each adjacent to the existing blob
 * 3. Constrain max dimensions so the result is compact (blob, not a stripe)
 * 4. The union of placed cells becomes the board
 * 5. Guaranteed solvable — the placement IS the solution
 */
export function generatePuzzle(
  config: PolyominoConfig,
  params: DifficultyParams,
  seed: number
): Puzzle {
  let pool = getPiecesByComplexity(params.pieceSizeRange[0], params.pieceSizeRange[1], params.maxPieceComplexity);
  // Fallback: if complexity filter is too strict, use all pieces in size range
  if (pool.length === 0) {
    pool = getPiecesBySize(params.pieceSizeRange[0], params.pieceSizeRange[1]);
  }
  if (pool.length === 0) {
    return emptyPuzzle(seed);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const currentSeed = seed + attempt;
    const rng = mulberry32(currentSeed);

    const selectedDefs = selectPieces(pool, params.pieceCount, true, rng);
    if (selectedDefs.length === 0) continue;

    // Compute max bounding box — keep it compact, roughly square
    const totalCells = selectedDefs.reduce((s, p) => s + p.size, 0);
    const maxDim = Math.ceil(Math.sqrt(totalCells) * GENERATOR_CONFIG.maxDimMultiplier);

    const result = assemblePieces(
      selectedDefs, maxDim, params.rotationAllowed, params.flipAllowed, rng
    );

    if (result) {
      const { board, entries } = buildBoardFromEntries(result);
      // console.log(`[Polyomino] Generated puzzle in ${attempt + 1} attempt(s), ${params.pieceCount} pieces, seed=${currentSeed}`);
      return buildPuzzle(board, entries, currentSeed, rng);
    }
  }

  console.warn(`[Polyomino] Failed to generate puzzle after ${MAX_RETRIES} attempts`);
  return emptyPuzzle(seed);
}

// ── Types ──

interface PlacedEntry {
  definition: PieceDefinition;
  orientation: Orientation;
  absoluteCells: [number, number][];
}

// ── Piece selection ──

/**
 * Select pieces with balanced distribution.
 * Uses each shape once first, then distributes duplicates evenly —
 * no shape can have more than 1 extra occurrence compared to any other.
 */
function selectPieces(
  pool: PieceDefinition[],
  count: number,
  _uniqueOnly: boolean,
  rng: () => number
): PieceDefinition[] {
  if (pool.length === 0) return [];

  // Shuffle pool for variety
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // If pool is large enough, just take unique pieces
  if (count <= shuffled.length) {
    return shuffled.slice(0, count);
  }

  // Need duplicates — distribute evenly
  // Each shape gets at least `baseCount` uses, then `remainder` shapes get one extra
  const baseCount = Math.floor(count / shuffled.length);
  const remainder = count % shuffled.length;

  const result: PieceDefinition[] = [];
  for (let i = 0; i < shuffled.length; i++) {
    const uses = baseCount + (i < remainder ? 1 : 0);
    for (let j = 0; j < uses; j++) {
      result.push(shuffled[i]);
    }
  }

  // Shuffle the result so duplicates aren't grouped together
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// ── Core: assemble pieces into a compact blob ──

function assemblePieces(
  defs: PieceDefinition[],
  maxDim: number,
  allowRotation: boolean,
  allowFlip: boolean,
  rng: () => number
): PlacedEntry[] | null {
  const occupied = new Set<string>();
  const entries: PlacedEntry[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const orientations = getDistinctOrientations(def.cells, allowRotation, allowFlip);

    // Shuffle orientations for variety
    for (let k = orientations.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [orientations[k], orientations[j]] = [orientations[j], orientations[k]];
    }

    if (i === 0) {
      // First piece: place at origin
      const cells = orientations[0];
      for (const [r, c] of cells) occupied.add(key(r, c));
      entries.push({
        definition: def,
        orientation: findOrientation(def.cells, cells, allowRotation, allowFlip),
        absoluteCells: cells.map(([r, c]) => [r, c] as [number, number]),
      });
      continue;
    }

    // Collect ALL valid placements, then pick the most compact one
    const candidates: Array<{
      absCells: [number, number][];
      oriented: [number, number][];
      contactScore: number; // shared edges with blob — higher = more compact
    }> = [];

    const adjacentEmpty = getAdjacentEmpty(occupied);

    for (const oriented of orientations) {
      for (const [pr, pc] of oriented) {
        for (const [ar, ac] of adjacentEmpty) {
          const offsetR = ar - pr;
          const offsetC = ac - pc;
          const absCells = oriented.map(([r, c]) => [r + offsetR, c + offsetC] as [number, number]);

          // No overlap
          if (absCells.some(([r, c]) => occupied.has(key(r, c)))) continue;

          // Must touch blob
          const contactScore = absCells.reduce((score, [r, c]) => {
            let s = 0;
            if (occupied.has(key(r - 1, c))) s++;
            if (occupied.has(key(r + 1, c))) s++;
            if (occupied.has(key(r, c - 1))) s++;
            if (occupied.has(key(r, c + 1))) s++;
            return score + s;
          }, 0);
          if (contactScore === 0) continue;

          // Check bounding box constraint
          const allCells = [...Array.from(occupied).map(k => k.split(',').map(Number) as [number, number]), ...absCells];
          const minR = Math.min(...allCells.map(([r]) => r));
          const maxR = Math.max(...allCells.map(([r]) => r));
          const minC = Math.min(...allCells.map(([, c]) => c));
          const maxC = Math.max(...allCells.map(([, c]) => c));
          if (maxR - minR + 1 > maxDim || maxC - minC + 1 > maxDim) continue;

          // Deduplicate by cell set
          const cellKey = absCells.map(([r, c]) => key(r, c)).sort().join(';');
          if (!candidates.some(c => c.absCells.map(([r, c2]) => key(r, c2)).sort().join(';') === cellKey)) {
            candidates.push({ absCells, oriented, contactScore });
          }
        }
      }
    }

    if (candidates.length === 0) return null;

    // Sort by contact score descending (most compact first), then pick from top candidates with some randomness
    candidates.sort((a, b) => b.contactScore - a.contactScore);
    const topN = Math.max(1, Math.ceil(candidates.length * GENERATOR_CONFIG.topCandidateRatio));
    const pick = candidates[Math.floor(rng() * topN)];

    for (const [r, c] of pick.absCells) occupied.add(key(r, c));
    entries.push({
      definition: def,
      orientation: findOrientation(def.cells, normalize(pick.absCells), allowRotation, allowFlip),
      absoluteCells: pick.absCells,
    });
  }

  return entries;
}

// ── Helpers ──

function key(r: number, c: number): string {
  return `${r},${c}`;
}

function getAdjacentEmpty(occupied: Set<string>): [number, number][] {
  const adjacent = new Set<string>();
  for (const k of occupied) {
    const [r, c] = k.split(',').map(Number);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nk = key(r + dr, c + dc);
      if (!occupied.has(nk)) adjacent.add(nk);
    }
  }
  return Array.from(adjacent).map(k => k.split(',').map(Number) as [number, number]);
}

/** Build a BoardLayout from the union of all placed piece cells */
function buildBoardFromEntries(entries: PlacedEntry[]): { board: BoardLayout; entries: PlacedEntry[] } {
  // Collect all cells
  const allCells: [number, number][] = [];
  for (const e of entries) {
    allCells.push(...e.absoluteCells);
  }

  // Find bounding box
  const minR = Math.min(...allCells.map(([r]) => r));
  const maxR = Math.max(...allCells.map(([r]) => r));
  const minC = Math.min(...allCells.map(([, c]) => c));
  const maxC = Math.max(...allCells.map(([, c]) => c));

  const height = maxR - minR + 1;
  const width = maxC - minC + 1;

  // Build active cells grid — only cells that are part of the blob
  const cellSet = new Set(allCells.map(([r, c]) => key(r, c)));
  const activeCells: boolean[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => cellSet.has(key(r + minR, c + minC)))
  );

  // Normalize entry positions relative to the bounding box origin
  const normalizedEntries: PlacedEntry[] = entries.map(e => ({
    ...e,
    absoluteCells: e.absoluteCells.map(([r, c]) => [r - minR, c - minC] as [number, number]),
  }));

  return {
    board: { width, height, activeCells },
    entries: normalizedEntries,
  };
}

function findOrientation(
  original: [number, number][],
  oriented: [number, number][],
  allowRotation: boolean,
  allowFlip: boolean
): Orientation {
  const orientedKey = normalize(oriented).map(([r, c]) => `${r},${c}`).join('|');

  for (const flipped of [false, true]) {
    if (flipped && !allowFlip) continue;
    for (const rotation of [0, 1, 2, 3] as const) {
      if (rotation > 0 && !allowRotation) continue;
      let cells = normalize(original);
      if (flipped) cells = normalize(cells.map(([r, c]) => [r, -c] as [number, number]));
      for (let i = 0; i < rotation; i++) {
        cells = normalize(cells.map(([r, c]) => [c, -r] as [number, number]));
      }
      const k = cells.map(([r, c]) => `${r},${c}`).join('|');
      if (k === orientedKey) return { rotation, flipped };
    }
  }
  return IDENTITY_ORIENTATION;
}

// ── Build final Puzzle object ──

function buildPuzzle(
  board: BoardLayout,
  entries: PlacedEntry[],
  seed: number,
  rng: () => number
): Puzzle {
  const colors = assignColors(entries.length, rng);
  const pieces: PuzzlePiece[] = [];
  const solution: SolutionEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const pieceId = `piece-${i}`;
    // Find anchor: top-left cell of the placed piece
    const minR = Math.min(...entry.absoluteCells.map(([r]) => r));
    const minC = Math.min(...entry.absoluteCells.filter(([r]) => r === minR).map(([, c]) => c));

    pieces.push({
      id: pieceId,
      definitionId: entry.definition.id,
      cells: entry.definition.cells,
      color: colors[i],
      currentOrientation: IDENTITY_ORIENTATION,
    });

    solution.push({
      pieceId,
      definitionId: entry.definition.id,
      anchorRow: minR,
      anchorCol: minC,
      orientation: entry.orientation,
      cells: entry.absoluteCells,
    });
  }

  // Shuffle piece order for presentation
  const indices = pieces.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return { board, pieces: indices.map(i => pieces[i]), solution, seed };
}

function assignColors(count: number, rng: () => number): PieceColor[] {
  const available = [...PIECE_COLORS];
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return Array.from({ length: count }, (_, i) => available[i % available.length]);
}

function emptyPuzzle(seed: number): Puzzle {
  return {
    board: { width: 4, height: 4, activeCells: Array.from({ length: 4 }, () => Array(4).fill(true)) },
    pieces: [],
    solution: [],
    seed,
  };
}
