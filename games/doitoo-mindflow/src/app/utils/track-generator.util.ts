import {
  GridSize,
  GridCell,
  Direction,
  TrackGeneratorConfig,
  TrackGeneratorResult,
  computeMaxStationCount,
  gridCellToPixel,
} from '../models/grid.models';
import {
  BoardLayout,
  PathSegment,
  Junction,
  SpawnPoint,
  Station,
  Point,
  StationIdentity,
} from '../models/game.models';
import { generateStationIdentities } from './station-identity.util';
import { TRACK_GENERATION_DEFAULTS } from '../models/track-generation.config';

// ── Internal data structures (not exported) ──

interface GridNode {
  cell: GridCell;
  type: 'spawn' | 'junction' | 'station';
  id: string;
  children: GridEdge[];
}

interface GridEdge {
  cells: GridCell[]; // ordered cells from parent to child (inclusive)
  child: GridNode;
}

// ── Direction helpers ──

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

function moveCell(cell: GridCell, dir: Direction): GridCell {
  switch (dir) {
    case 'up':    return { col: cell.col, row: cell.row - 1 };
    case 'down':  return { col: cell.col, row: cell.row + 1 };
    case 'left':  return { col: cell.col - 1, row: cell.row };
    case 'right': return { col: cell.col + 1, row: cell.row };
  }
}

function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`;
}

function isInBounds(cell: GridCell, gridSize: GridSize): boolean {
  return cell.col >= 0 && cell.col < gridSize.cols && cell.row >= 0 && cell.row < gridSize.rows;
}


// ── Quadrant helpers ──

function getQuadrant(cell: GridCell, gridSize: GridSize): number {
  const midCol = gridSize.cols / 2;
  const midRow = gridSize.rows / 2;
  if (cell.col < midCol && cell.row < midRow) return 0; // top-left
  if (cell.col >= midCol && cell.row < midRow) return 1; // top-right
  if (cell.col < midCol && cell.row >= midRow) return 2; // bottom-left
  return 3; // bottom-right
}

function computeQuadrantCounts(occupied: Set<string>, gridSize: GridSize): number[] {
  const counts = [0, 0, 0, 0];
  for (const key of occupied) {
    const [colStr, rowStr] = key.split(',');
    const cell: GridCell = { col: parseInt(colStr, 10), row: parseInt(rowStr, 10) };
    counts[getQuadrant(cell, gridSize)]++;
  }
  return counts;
}

function directionQuadrantBias(
  fromCell: GridCell,
  dir: Direction,
  gridSize: GridSize,
  quadrantCounts: number[],
): number {
  const targetCell = moveCell(fromCell, dir);
  if (!isInBounds(targetCell, gridSize)) return 0;
  const q = getQuadrant(targetCell, gridSize);
  const maxCount = Math.max(...quadrantCounts, 1);
  // Higher weight for quadrants with fewer nodes
  return maxCount - quadrantCounts[q] + 1;
}

function weightedRandomPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Walk helpers ──

function checkSpatialDistribution(
  allNodes: GridCell[],
  gridSize: GridSize,
  minCoverage: number,
): boolean {
  if (allNodes.length === 0) return false;
  let minCol = Infinity, maxCol = -Infinity;
  let minRow = Infinity, maxRow = -Infinity;
  for (const cell of allNodes) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.col > maxCol) maxCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
    if (cell.row > maxRow) maxRow = cell.row;
  }
  const widthCoverage = (maxCol - minCol) / (gridSize.cols - 1);
  const heightCoverage = (maxRow - minRow) / (gridSize.rows - 1);
  return widthCoverage >= minCoverage && heightCoverage >= minCoverage;
}

// ── Random walk helpers ──

function getUnoccupiedNeighbors(
  cell: GridCell,
  gridSize: GridSize,
  occupied: Set<string>,
): { dir: Direction; cell: GridCell }[] {
  const result: { dir: Direction; cell: GridCell }[] = [];
  for (const dir of ALL_DIRECTIONS) {
    const next = moveCell(cell, dir);
    if (isInBounds(next, gridSize) && !occupied.has(cellKey(next))) {
      result.push({ dir, cell: next });
    }
  }
  return result;
}

/**
 * Walk from a starting cell in a given initial direction for walkLen cells.
 * The walk proceeds in a straight line only (no turns) to guarantee
 * axis-aligned segments. If the path is blocked, the walk stops early.
 * Returns the cells walked (including start), or null if no progress was made.
 */
function straightWalk(
  start: GridCell,
  dir: Direction,
  walkLen: number,
  gridSize: GridSize,
  occupied: Set<string>,
): GridCell[] | null {
  const cells: GridCell[] = [start];
  let currentCell = start;

  for (let step = 0; step < walkLen; step++) {
    const next = moveCell(currentCell, dir);
    if (isInBounds(next, gridSize) && !occupied.has(cellKey(next))) {
      occupied.add(cellKey(next));
      cells.push(next);
      currentCell = next;
    } else {
      break; // Blocked — stop the walk
    }
  }

  return cells.length >= 2 ? cells : null;
}


// ── Core generation algorithm (iterative growth) ──

function attemptGeneration(
  stationCount: number,
  gridSize: GridSize,
  allowThreeWay: boolean,
  rng: () => number,
): GridNode | null {
  const occupied = new Set<string>();
  const { trunkLenMin, trunkLenMax, branchLenMin, branchLenMax, threeWayProbability,
    reservedTopLeftCols, reservedTopLeftRows, reservedTopRightCols, reservedTopRightRows,
  } = TRACK_GENERATION_DEFAULTS;

  // Pre-mark reserved corner zones as occupied (HUD + cancel button)
  for (let r = 0; r < reservedTopLeftRows; r++) {
    for (let c = 0; c < reservedTopLeftCols; c++) {
      occupied.add(cellKey({ col: c, row: r }));
    }
  }
  for (let r = 0; r < reservedTopRightRows; r++) {
    for (let c = gridSize.cols - reservedTopRightCols; c < gridSize.cols; c++) {
      occupied.add(cellKey({ col: c, row: r }));
    }
  }

  // 1. Pick a random edge cell for the spawn point
  type EdgeInfo = { cell: GridCell; inwardDir: Direction };
  const edgeCandidates: EdgeInfo[] = [];

  // Top edge → grows down
  for (let c = 0; c < gridSize.cols; c++) {
    if (!occupied.has(cellKey({ col: c, row: 0 }))) {
      edgeCandidates.push({ cell: { col: c, row: 0 }, inwardDir: 'down' });
    }
  }
  // Bottom edge → grows up
  for (let c = 0; c < gridSize.cols; c++) {
    if (!occupied.has(cellKey({ col: c, row: gridSize.rows - 1 }))) {
      edgeCandidates.push({ cell: { col: c, row: gridSize.rows - 1 }, inwardDir: 'up' });
    }
  }
  // Left edge → grows right
  for (let r = 0; r < gridSize.rows; r++) {
    if (!occupied.has(cellKey({ col: 0, row: r }))) {
      edgeCandidates.push({ cell: { col: 0, row: r }, inwardDir: 'right' });
    }
  }
  // Right edge → grows left
  for (let r = 0; r < gridSize.rows; r++) {
    if (!occupied.has(cellKey({ col: gridSize.cols - 1, row: r }))) {
      edgeCandidates.push({ cell: { col: gridSize.cols - 1, row: r }, inwardDir: 'left' });
    }
  }

  if (edgeCandidates.length === 0) return null;
  const chosen = edgeCandidates[Math.floor(rng() * edgeCandidates.length)];
  const spawnCell = chosen.cell;
  const trunkDir = chosen.inwardDir;
  occupied.add(cellKey(spawnCell));

  const spawnNode: GridNode = {
    cell: spawnCell,
    type: 'spawn',
    id: 'spawn-0',
    children: [],
  };

  // 2. Grow trunk inward from spawn
  const trunkLen = trunkLenMin + Math.floor(rng() * (trunkLenMax - trunkLenMin + 1));
  const trunkCells = straightWalk(spawnCell, trunkDir, trunkLen, gridSize, occupied);
  if (!trunkCells || trunkCells.length < 2) return null;

  let junctionCounter = 0;
  let stationCounter = 0;

  // 3. Place first junction at end of trunk
  const firstJunction: GridNode = {
    cell: trunkCells[trunkCells.length - 1],
    type: 'junction',
    id: `junction-${junctionCounter++}`,
    children: [],
  };
  spawnNode.children.push({ cells: trunkCells, child: firstJunction });

  // Helper: try to walk from a cell, trying progressively shorter lengths
  function tryWalk(from: GridCell, dir: Direction, preferredLen: number): GridCell[] | null {
    for (let len = preferredLen; len >= 2; len--) {
      const cells = straightWalk(from, dir, len, gridSize, occupied);
      if (cells && cells.length >= 2) return cells;
    }
    return null;
  }

  // Helper: pick a direction with quadrant bias from available neighbors
  function pickDirection(from: GridCell): { dir: Direction; cell: GridCell } | null {
    const neighbors = getUnoccupiedNeighbors(from, gridSize, occupied);
    if (neighbors.length === 0) return null;
    const quadrantCounts = computeQuadrantCounts(occupied, gridSize);
    const dirs = neighbors.map(n => n.dir);
    const weights = dirs.map(d => directionQuadrantBias(from, d, gridSize, quadrantCounts));
    const dir = weightedRandomPick(dirs, weights, rng);
    return neighbors.find(n => n.dir === dir) ?? null;
  }

  // Helper: add a branch from a junction, returning the leaf node
  function addBranch(junction: GridNode): GridNode | null {
    const neighbor = pickDirection(junction.cell);
    if (!neighbor) return null;

    const walkLen = branchLenMin + Math.floor(rng() * (branchLenMax - branchLenMin + 1));
    const cells = tryWalk(junction.cell, neighbor.dir, walkLen);
    if (!cells) {
      // Last resort: single cell neighbor
      if (!occupied.has(cellKey(neighbor.cell))) {
        occupied.add(cellKey(neighbor.cell));
        const station: GridNode = {
          cell: neighbor.cell,
          type: 'station',
          id: `station-${stationCounter++}`,
          children: [],
        };
        junction.children.push({ cells: [junction.cell, neighbor.cell], child: station });
        return station;
      }
      return null;
    }

    const endCell = cells[cells.length - 1];
    const station: GridNode = {
      cell: endCell,
      type: 'station',
      id: `station-${stationCounter++}`,
      children: [],
    };
    junction.children.push({ cells, child: station });
    return station;
  }

  // 4. Seed the tree: add 2 initial branches from the first junction
  const branch1 = addBranch(firstJunction);
  const branch2 = addBranch(firstJunction);
  if (!branch1 || !branch2) return null;
  if (firstJunction.children.length < 2) return null;

  // 5. Iteratively grow: convert leaf stations into junctions and add more branches
  //    until we reach the target station count.
  //    We collect all station leaf nodes and pick one to "promote" to a junction.
  function collectStationLeaves(node: GridNode): GridNode[] {
    const leaves: GridNode[] = [];
    if (node.type === 'station') {
      leaves.push(node);
    }
    for (const edge of node.children) {
      leaves.push(...collectStationLeaves(edge.child));
    }
    return leaves;
  }

  let safetyCounter = 0;
  const maxIterations = stationCount * 10; // prevent infinite loops

  while (stationCounter < stationCount && safetyCounter++ < maxIterations) {
    const leaves = collectStationLeaves(spawnNode);
    if (leaves.length === 0) break;

    // Shuffle leaves and try to promote one that has available neighbors
    const shuffled = [...leaves].sort(() => rng() - 0.5);
    let promoted = false;

    for (const leaf of shuffled) {
      const neighbors = getUnoccupiedNeighbors(leaf.cell, gridSize, occupied);
      if (neighbors.length < 2) continue; // Need at least 2 directions for a junction

      // Promote this station to a junction
      leaf.type = 'junction';
      leaf.id = `junction-${junctionCounter++}`;
      stationCounter--; // We lost a station by converting it

      // Add 2 branches (or 3 if allowed)
      let branchCount = 2;
      if (allowThreeWay && neighbors.length >= 3 && (stationCount - stationCounter) >= 3 && rng() < threeWayProbability) {
        branchCount = 3;
      }

      let added = 0;
      for (let i = 0; i < branchCount; i++) {
        const result = addBranch(leaf);
        if (result) added++;
      }

      if (added >= 2) {
        promoted = true;
        break;
      } else if (added === 1) {
        // Need at least 2 children for a valid junction — try one more
        const extra = addBranch(leaf);
        if (extra) {
          promoted = true;
          break;
        } else {
          // Can't make a valid junction — revert to station
          leaf.type = 'station';
          leaf.id = `station-${stationCounter++}`;
          junctionCounter--;
          // Remove the single child we added
          if (leaf.children.length > 0) {
            leaf.children.pop();
            stationCounter--;
          }
          continue;
        }
      } else {
        // No branches added — revert
        leaf.type = 'station';
        leaf.id = `station-${stationCounter++}`;
        junctionCounter--;
        continue;
      }
    }

    if (!promoted) break; // No leaf could be promoted — we're stuck
  }

  // Ensure first junction still has at least 2 children
  if (firstJunction.children.length < 2) return null;

  // Reject if we didn't place the exact requested number of stations
  if (stationCounter < stationCount) return null;

  return spawnNode;
}


// ── Grid tree to BoardLayout conversion ──

function convertTreeToBoardLayout(
  root: GridNode,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
): BoardLayout {
  const spawnPoints: SpawnPoint[] = [];
  const junctions: Junction[] = [];
  const stations: Station[] = [];
  const paths: PathSegment[] = [];
  let pathCounter = 0;

  // Collect all station nodes and reassign clean sequential IDs
  // to avoid gaps/duplicates from the promote/revert cycle
  const stationNodes: GridNode[] = [];
  function collectStations(node: GridNode): void {
    if (node.type === 'station') {
      stationNodes.push(node);
    }
    for (const edge of node.children) {
      collectStations(edge.child);
    }
  }
  collectStations(root);

  // Reassign station IDs sequentially so identity mapping is clean
  stationNodes.forEach((sn, i) => {
    sn.id = `station-${i}`;
  });

  const identities = generateStationIdentities(stationNodes.length);
  const identityMap = new Map<string, StationIdentity>();
  stationNodes.forEach((sn, i) => {
    identityMap.set(sn.id, identities[i]);
  });

  function toPixel(cell: GridCell): Point {
    return gridCellToPixel(cell, gridSize, screenWidth, screenHeight);
  }

  function processNode(node: GridNode): void {
    const pos = toPixel(node.cell);

    if (node.type === 'spawn') {
      const childPathIds: string[] = [];
      for (const edge of node.children) {
        const pathId = `path-${pathCounter++}`;
        const startPoint = toPixel(edge.cells[0]);
        const endPoint = toPixel(edge.cells[edge.cells.length - 1]);
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        paths.push({
          id: pathId,
          from: node.id,
          to: edge.child.id,
          waypoints: [startPoint, endPoint],
          length,
        });
        childPathIds.push(pathId);
        processNode(edge.child);
      }

      spawnPoints.push({
        id: node.id,
        position: pos,
        outgoingPathId: childPathIds[0],
      });
    } else if (node.type === 'junction') {
      const outgoingPathIds: string[] = [];
      for (const edge of node.children) {
        const pathId = `path-${pathCounter++}`;
        const startPoint = toPixel(edge.cells[0]);
        const endPoint = toPixel(edge.cells[edge.cells.length - 1]);
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        paths.push({
          id: pathId,
          from: node.id,
          to: edge.child.id,
          waypoints: [startPoint, endPoint],
          length,
        });
        outgoingPathIds.push(pathId);
        processNode(edge.child);
      }

      junctions.push({
        id: node.id,
        position: pos,
        outgoingPathIds,
        switchIndex: 0,
      });
    } else if (node.type === 'station') {
      const identity = identityMap.get(node.id);
      if (identity) {
        stations.push({
          id: node.id,
          position: pos,
          identity,
        });
      }
    }
  }

  processNode(root);

  return { spawnPoints, junctions, stations, paths };
}


// ── Main entry point ──

export function generateTrackLayout(config: TrackGeneratorConfig): TrackGeneratorResult {
  // Input validation
  if (config.screenWidth < 1) {
    throw new Error('screenWidth must be at least 1');
  }
  if (config.screenHeight < 1) {
    throw new Error('screenHeight must be at least 1');
  }
  if (config.gridSize.cols < 3) {
    throw new Error('gridSize.cols must be at least 3');
  }
  if (config.gridSize.rows < 3) {
    throw new Error('gridSize.rows must be at least 3');
  }

  const rng = config.rng ?? Math.random;
  const allowThreeWay = config.allowThreeWayJunctions ?? false;

  // Clamp trainCount to [2, 20]
  let trainCount = Math.max(2, Math.min(20, config.trainCount));

  // Station count capping
  const maxStations = computeMaxStationCount(config.gridSize);
  let capped = false;
  if (trainCount > maxStations) {
    if (maxStations < 2) {
      throw new Error(
        `Grid too small: cannot fit minimum 2 stations on a ${config.gridSize.cols}x${config.gridSize.rows} grid`,
      );
    }
    console.warn(
      `Station count capped: requested ${trainCount}, maximum for ${config.gridSize.cols}x${config.gridSize.rows} grid is ${maxStations}`,
    );
    trainCount = maxStations;
    capped = true;
  }

  // Determine spatial coverage threshold
  const defaultCoverage = trainCount <= 3
    ? TRACK_GENERATION_DEFAULTS.spatialCoverageSmall
    : TRACK_GENERATION_DEFAULTS.spatialCoverageDefault;
  const minCoverage = config.minSpatialCoverage ?? defaultCoverage;
  const effectiveCoverage = trainCount <= 3
    ? Math.min(minCoverage, TRACK_GENERATION_DEFAULTS.spatialCoverageSmall)
    : minCoverage;

  // Time-based retry: try for retryTimeBudgetMs at current station count,
  // then reduce by 1 and try again, until we reach 2.
  const timeBudget = TRACK_GENERATION_DEFAULTS.retryTimeBudgetMs;
  let currentTarget = trainCount;

  while (currentTarget >= 2) {
    const deadline = performance.now() + timeBudget;

    while (performance.now() < deadline) {
      const tree = attemptGeneration(currentTarget, config.gridSize, allowThreeWay, rng);
      if (!tree) continue;

      // Collect node cells for spatial distribution check
      const nodeCells: GridCell[] = [];
      function collectNodeCells(node: GridNode): void {
        nodeCells.push(node.cell);
        for (const edge of node.children) {
          collectNodeCells(edge.child);
        }
      }
      collectNodeCells(tree);

      if (!checkSpatialDistribution(nodeCells, config.gridSize, effectiveCoverage)) {
        continue;
      }

      const layout = convertTreeToBoardLayout(
        tree,
        config.gridSize,
        config.screenWidth,
        config.screenHeight,
      );

      return {
        layout,
        actualStationCount: layout.stations.length,
        capped: capped || currentTarget < trainCount,
      };
    }

    // Time expired for this target — reduce by 1
    currentTarget--;
    if (currentTarget < trainCount) {
      console.warn(`Could not generate ${currentTarget + 1} stations in ${timeBudget}ms, trying ${currentTarget}`);
    }
  }

  throw new Error('Failed to generate layout: could not fit even 2 stations');
}
