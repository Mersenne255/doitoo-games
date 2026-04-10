import { BoardLayout, BoardShape } from '../models/game.models';

/** Seeded PRNG — mulberry32 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a board layout. Pure function.
 * - rectangular: all cells active
 * - irregular: wild outer shape — aggressively removes edges/corners, no internal holes
 */
export function generateBoard(
  width: number,
  height: number,
  shape: BoardShape,
  seed: number
): BoardLayout {
  const rng = mulberry32(seed);

  if (shape === 'rectangular') {
    return {
      width,
      height,
      activeCells: Array.from({ length: height }, () => Array(width).fill(true)),
    };
  }

  // 'irregular' (also handles legacy 'holes' — treat as irregular)
  return generateIrregularBoard(width, height, rng);
}

function generateIrregularBoard(
  width: number,
  height: number,
  rng: () => number
): BoardLayout {
  const cells = Array.from({ length: height }, () => Array(width).fill(true) as boolean[]);
  const totalCells = width * height;
  // Remove 30-45% of cells from edges/corners for a wild outer shape
  const targetRemove = Math.floor(totalCells * (0.30 + rng() * 0.15));
  let removed = 0;

  // Phase 1: Remove large corner chunks (2-4 corners, big rectangles)
  const corners: Array<{ startR: number; startC: number; dr: number; dc: number }> = [
    { startR: 0, startC: 0, dr: 1, dc: 1 },
    { startR: 0, startC: width - 1, dr: 1, dc: -1 },
    { startR: height - 1, startC: 0, dr: -1, dc: 1 },
    { startR: height - 1, startC: width - 1, dr: -1, dc: -1 },
  ];
  // Shuffle
  for (let i = corners.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [corners[i], corners[j]] = [corners[j], corners[i]];
  }

  const numCorners = 2 + Math.floor(rng() * 3); // 2-4 corners
  for (let ci = 0; ci < numCorners && removed < targetRemove; ci++) {
    const corner = corners[ci % corners.length];
    // Big chunks: up to half the width/height
    const cw = 2 + Math.floor(rng() * Math.max(1, Math.floor(width / 2) - 1));
    const ch = 2 + Math.floor(rng() * Math.max(1, Math.floor(height / 2) - 1));

    for (let dr = 0; dr < ch && removed < targetRemove; dr++) {
      for (let dc = 0; dc < cw && removed < targetRemove; dc++) {
        const r = corner.startR + dr * corner.dr;
        const c = corner.startC + dc * corner.dc;
        if (r >= 0 && r < height && c >= 0 && c < width && cells[r][c]) {
          cells[r][c] = false;
          removed++;
        }
      }
    }
  }

  // Phase 2: Nibble random edge cells for jagged outline
  const edgePasses = 2 + Math.floor(rng() * 3);
  for (let pass = 0; pass < edgePasses && removed < targetRemove; pass++) {
    for (let r = 0; r < height && removed < targetRemove; r++) {
      for (let c = 0; c < width && removed < targetRemove; c++) {
        if (!cells[r][c]) continue;
        // Only remove cells on the border of the active region
        const isEdge = r === 0 || r === height - 1 || c === 0 || c === width - 1 ||
          !cells[r - 1]?.[c] || !cells[r + 1]?.[c] || !cells[r]?.[c - 1] || !cells[r]?.[c + 1];
        if (isEdge && rng() < 0.4) {
          cells[r][c] = false;
          removed++;
        }
      }
    }
  }

  // Ensure connectivity — keep only the largest connected component
  ensureConnectivity(cells, width, height);

  return { width, height, activeCells: cells };
}

/** BFS to check if all active cells are connected */
export function isConnectedBoard(cells: boolean[][], width: number, height: number): boolean {
  let startR = -1, startC = -1;
  for (let r = 0; r < height && startR < 0; r++) {
    for (let c = 0; c < width && startR < 0; c++) {
      if (cells[r][c]) { startR = r; startC = c; }
    }
  }
  if (startR < 0) return true; // no active cells

  const visited = new Set<string>();
  const queue: [number, number][] = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width && cells[nr][nc] && !visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  let totalActive = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (cells[r][c]) totalActive++;
    }
  }
  return visited.size === totalActive;
}

/** Restore cells to ensure connectivity — re-enable disconnected cells */
function ensureConnectivity(cells: boolean[][], width: number, height: number): void {
  while (!isConnectedBoard(cells, width, height)) {
    // Find the largest connected component
    const visited = new Set<string>();
    let largestComponent = new Set<string>();

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const key = `${r},${c}`;
        if (cells[r][c] && !visited.has(key)) {
          const component = bfs(cells, width, height, r, c);
          component.forEach(k => visited.add(k));
          if (component.size > largestComponent.size) {
            largestComponent = component;
          }
        }
      }
    }

    // Re-enable cells not in the largest component
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (cells[r][c] && !largestComponent.has(`${r},${c}`)) {
          cells[r][c] = false;
        }
      }
    }
    break; // After removing smaller components, board is connected
  }
}

function bfs(cells: boolean[][], width: number, height: number, startR: number, startC: number): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width && cells[nr][nc] && !visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited;
}
