import { PieceDefinition } from '../models/game.models';

// ── Transformation Functions ──

/** Rotate cells 90° clockwise: [r, c] → [c, -r], then normalize */
export function rotateCW(cells: [number, number][]): [number, number][] {
  return normalize(cells.map(([r, c]) => [c, -r] as [number, number]));
}

/** Flip cells horizontally: [r, c] → [r, -c], then normalize */
export function flipH(cells: [number, number][]): [number, number][] {
  return normalize(cells.map(([r, c]) => [r, -c] as [number, number]));
}

/** Translate cells so min row and min col are both 0, then sort lexicographically */
export function normalize(cells: [number, number][]): [number, number][] {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  return cells
    .map(([r, c]) => [r - minR, c - minC] as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Return the lexicographically smallest normalized orientation across all rotations and flips */
export function canonicalize(cells: [number, number][]): [number, number][] {
  const orientations = getAllOrientations(cells);
  return orientations.sort((a, b) => {
    const keyA = cellsToKey(a);
    const keyB = cellsToKey(b);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  })[0];
}

/** Check if all cells form a single connected component via edge adjacency */
export function isConnected(cells: [number, number][]): boolean {
  if (cells.length <= 1) return true;
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const visited = new Set<string>();
  const queue = [`${cells[0][0]},${cells[0][1]}`];
  visited.add(queue[0]);
  while (queue.length > 0) {
    const key = queue.shift()!;
    const [r, c] = key.split(',').map(Number);
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nk = `${r + dr},${c + dc}`;
      if (set.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === cells.length;
}

/** Get all distinct orientations of a piece, respecting rotation/flip flags */
export function getDistinctOrientations(
  cells: [number, number][],
  allowRotation: boolean,
  allowFlip: boolean
): [number, number][][] {
  const seen = new Set<string>();
  const result: [number, number][][] = [];

  const variants = allowFlip
    ? [normalize(cells), flipH(cells)]
    : [normalize(cells)];

  for (const base of variants) {
    let current = base;
    const rotations = allowRotation ? 4 : 1;
    for (let i = 0; i < rotations; i++) {
      const key = cellsToKey(current);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(current);
      }
      current = rotateCW(current);
    }
  }
  return result;
}

/** Get pieces from the library filtered by size range */
export function getPiecesBySize(minSize: number, maxSize: number): PieceDefinition[] {
  return ALL_PIECES.filter(p => p.size >= minSize && p.size <= maxSize);
}

/**
 * Compute complexity score for a piece: size × distinctOrientations.
 * More orientations = harder to figure out correct placement.
 * Larger pieces = harder to fit.
 */
export function pieceComplexity(piece: PieceDefinition): number {
  const orientations = getDistinctOrientations(piece.cells, true, true).length;
  return piece.size * orientations;
}

/**
 * Get pieces filtered by max complexity threshold.
 * Complexity = size × distinctOrientations (with full rotation+flip).
 * Lower threshold = simpler pieces only.
 */
export function getPiecesByComplexity(
  minSize: number,
  maxSize: number,
  maxComplexity: number
): PieceDefinition[] {
  return ALL_PIECES.filter(p =>
    p.size >= minSize && p.size <= maxSize && pieceComplexity(p) <= maxComplexity
  );
}

// ── Internal Helpers ──

function cellsToKey(cells: [number, number][]): string {
  return cells.map(([r, c]) => `${r},${c}`).join('|');
}

function getAllOrientations(cells: [number, number][]): [number, number][][] {
  const result: [number, number][][] = [];
  for (const base of [normalize(cells), flipH(cells)]) {
    let current = base;
    for (let i = 0; i < 4; i++) {
      result.push(current);
      current = rotateCW(current);
    }
  }
  return result;
}

// ── Tetrominoes (5 free tetrominoes) ──

export const TETROMINOES: PieceDefinition[] = [
  { id: 'T4-I', name: 'I-tetromino', size: 4, cells: [[0,0],[0,1],[0,2],[0,3]] },
  { id: 'T4-O', name: 'O-tetromino', size: 4, cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: 'T4-T', name: 'T-tetromino', size: 4, cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: 'T4-S', name: 'S-tetromino', size: 4, cells: [[0,1],[0,2],[1,0],[1,1]] },
  { id: 'T4-Z', name: 'Z-tetromino', size: 4, cells: [[0,0],[0,1],[1,1],[1,2]] },
];

// ── Pentominoes (12 free pentominoes) ──

export const PENTOMINOES: PieceDefinition[] = [
  { id: 'P5-F', name: 'F-pentomino', size: 5, cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
  { id: 'P5-I', name: 'I-pentomino', size: 5, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { id: 'P5-L', name: 'L-pentomino', size: 5, cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { id: 'P5-N', name: 'N-pentomino', size: 5, cells: [[0,0],[1,0],[1,1],[2,1],[3,1]] },
  { id: 'P5-P', name: 'P-pentomino', size: 5, cells: [[0,0],[0,1],[1,0],[1,1],[2,0]] },
  { id: 'P5-T', name: 'T-pentomino', size: 5, cells: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
  { id: 'P5-U', name: 'U-pentomino', size: 5, cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { id: 'P5-V', name: 'V-pentomino', size: 5, cells: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
  { id: 'P5-W', name: 'W-pentomino', size: 5, cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: 'P5-X', name: 'X-pentomino', size: 5, cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
  { id: 'P5-Y', name: 'Y-pentomino', size: 5, cells: [[0,0],[1,0],[1,1],[2,0],[3,0]] },
  { id: 'P5-Z', name: 'Z-pentomino', size: 5, cells: [[0,0],[0,1],[1,1],[2,1],[2,2]] },
];

// ── Hexominoes (35 free hexominoes) ──

export const HEXOMINOES: PieceDefinition[] = [
  { id: 'H6-01', name: 'I-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]] },
  { id: 'H6-02', name: 'L-hexomino', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1]] },
  { id: 'H6-03', name: 'Y-hexomino', size: 6, cells: [[0,0],[1,0],[2,0],[2,1],[3,0],[4,0]] },
  { id: 'H6-04', name: 'N-hexomino', size: 6, cells: [[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]] },
  { id: 'H6-05', name: 'P-hexomino', size: 6, cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[3,0]] },
  { id: 'H6-06', name: 'C-hexomino', size: 6, cells: [[0,0],[0,1],[1,0],[2,0],[2,1],[3,0]] },
  { id: 'H6-07', name: 'F-hexomino', size: 6, cells: [[0,1],[0,2],[1,0],[1,1],[2,1],[3,1]] },
  { id: 'H6-08', name: 'T-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[1,1],[2,1],[3,1]] },
  { id: 'H6-09', name: 'U-hexomino', size: 6, cells: [[0,0],[0,2],[1,0],[1,1],[1,2],[2,1]] },
  { id: 'H6-10', name: 'V-hexomino', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2]] },
  { id: 'H6-11', name: 'W-hexomino', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]] },
  { id: 'H6-12', name: 'X-hexomino', size: 6, cells: [[0,1],[1,0],[1,1],[1,2],[2,1],[3,1]] },
  { id: 'H6-13', name: 'Z-hexomino', size: 6, cells: [[0,0],[0,1],[1,1],[2,1],[3,1],[3,2]] },
  { id: 'H6-14', name: 'S-hexomino', size: 6, cells: [[0,1],[0,2],[1,0],[1,1],[2,0],[3,0]] },
  { id: 'H6-15', name: 'J-hexomino', size: 6, cells: [[0,0],[1,0],[1,1],[1,2],[2,0],[3,0]] },
  { id: 'H6-16', name: 'R-hexomino', size: 6, cells: [[0,0],[0,1],[1,1],[1,2],[2,0],[2,1]] },
  { id: 'H6-17', name: 'Q-hexomino', size: 6, cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]] },
  { id: 'H6-18', name: 'A-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0]] },
  { id: 'H6-19', name: 'B-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[2,0]] },
  { id: 'H6-20', name: 'D-hexomino', size: 6, cells: [[0,0],[0,1],[1,0],[1,1],[1,2],[2,2]] },
  { id: 'H6-21', name: 'E-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[1,1],[1,2],[2,1]] },
  { id: 'H6-22', name: 'G-hexomino', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]] },
  { id: 'H6-23', name: 'H-hexomino', size: 6, cells: [[0,0],[0,1],[1,1],[2,0],[2,1],[3,0]] },
  { id: 'H6-24', name: 'K-hexomino', size: 6, cells: [[0,1],[1,0],[1,1],[2,0],[2,1],[3,1]] },
  { id: 'H6-25', name: 'M-hexomino', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2]] },
  { id: 'H6-26', name: 'O-hexomino', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]] },
  { id: 'H6-27', name: 'Cross-hex', size: 6, cells: [[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]] },
  { id: 'H6-28', name: 'Stair-hex', size: 6, cells: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
  { id: 'H6-29', name: 'Hook-hex', size: 6, cells: [[0,0],[1,0],[2,0],[2,1],[2,2],[1,2]] },
  { id: 'H6-30', name: 'Angle-hex', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[3,1],[2,1]] },
  { id: 'H6-31', name: 'Bump-hex', size: 6, cells: [[0,0],[0,1],[1,0],[2,0],[3,0],[3,1]] },
  { id: 'H6-32', name: 'Notch-hex', size: 6, cells: [[0,0],[0,1],[0,2],[1,2],[2,1],[2,2]] },
  { id: 'H6-33', name: 'Wave-hex', size: 6, cells: [[0,0],[0,1],[1,1],[2,1],[2,2],[3,2]] },
  { id: 'H6-34', name: 'Zigzag-hex', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]] },
  { id: 'H6-35', name: 'Bolt-hex', size: 6, cells: [[0,1],[1,0],[1,1],[2,0],[3,0],[3,1]] },
];

// ── Combined catalog ──

export const ALL_PIECES: PieceDefinition[] = [...TETROMINOES, ...PENTOMINOES, ...HEXOMINOES];
