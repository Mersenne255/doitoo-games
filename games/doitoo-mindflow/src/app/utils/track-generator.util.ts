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


// ── Core generation algorithm ──

function attemptGeneration(
  stationCount: number,
  gridSize: GridSize,
  allowThreeWay: boolean,
  rng: () => number,
): GridNode | null {
  const occupied = new Set<string>();

  // 1. Place spawn point at top-center of grid edge
  const spawnCol = Math.floor(gridSize.cols / 2);
  const spawnCell: GridCell = { col: spawnCol, row: 0 };
  occupied.add(cellKey(spawnCell));

  const spawnNode: GridNode = {
    cell: spawnCell,
    type: 'spawn',
    id: 'spawn-0',
    children: [],
  };

  // 2. Grow trunk: random walk from spawn to first junction
  const { trunkLenMin, trunkLenMax } = TRACK_GENERATION_DEFAULTS;
  const trunkLen = trunkLenMin + Math.floor(rng() * (trunkLenMax - trunkLenMin + 1));
  const trunkCells = straightWalk(spawnCell, 'down', trunkLen, gridSize, occupied);
  if (!trunkCells || trunkCells.length < 2) return null;

  const trunkEndCell = trunkCells[trunkCells.length - 1];

  // 3. Place first junction at end of trunk
  let junctionCounter = 0;
  let stationsPlaced = 0;

  const firstJunction: GridNode = {
    cell: trunkEndCell,
    type: 'junction',
    id: `junction-${junctionCounter++}`,
    children: [],
  };

  spawnNode.children.push({
    cells: trunkCells,
    child: firstJunction,
  });

  // 4. Recursive branching
  const stationsNeeded = stationCount;

  function growBranches(
    junctionNode: GridNode,
    remainingStations: number,
    depth: number,
  ): number {
    if (remainingStations <= 0) return 0;

    const neighbors = getUnoccupiedNeighbors(junctionNode.cell, gridSize, occupied);
    if (neighbors.length === 0) return 0;

    // Determine number of branches
    let numBranches: number;
    if (allowThreeWay && neighbors.length >= 3 && remainingStations >= 3 && rng() < TRACK_GENERATION_DEFAULTS.threeWayProbability) {
      numBranches = 3;
    } else {
      numBranches = Math.min(2, neighbors.length, remainingStations);
    }

    if (numBranches < 1) return 0;

    // Pick directions with quadrant-aware weighting
    const quadrantCounts = computeQuadrantCounts(occupied, gridSize);
    const candidateDirs = neighbors.map(n => n.dir);
    const candidateWeights = candidateDirs.map(dir =>
      directionQuadrantBias(junctionNode.cell, dir, gridSize, quadrantCounts),
    );

    const chosenDirs: Direction[] = [];
    const availableDirs = [...candidateDirs];
    const availableWeights = [...candidateWeights];

    for (let b = 0; b < numBranches && availableDirs.length > 0; b++) {
      const dir = weightedRandomPick(availableDirs, availableWeights, rng);
      chosenDirs.push(dir);
      const idx = availableDirs.indexOf(dir);
      availableDirs.splice(idx, 1);
      availableWeights.splice(idx, 1);
    }

    // Distribute stations among branches
    const stationsPerBranch: number[] = [];
    let leftover = remainingStations;
    for (let b = 0; b < chosenDirs.length; b++) {
      if (b === chosenDirs.length - 1) {
        stationsPerBranch.push(leftover);
      } else {
        const share = Math.max(1, Math.floor(leftover / (chosenDirs.length - b)));
        stationsPerBranch.push(share);
        leftover -= share;
      }
    }

    let totalPlaced = 0;

    for (let b = 0; b < chosenDirs.length; b++) {
      const dir = chosenDirs[b];
      const branchStations = stationsPerBranch[b];
      const { branchLenMin, branchLenMax } = TRACK_GENERATION_DEFAULTS;
      const walkLen = branchLenMin + Math.floor(rng() * (branchLenMax - branchLenMin + 1));

      const walkCells = straightWalk(junctionNode.cell, dir, walkLen, gridSize, occupied);
      if (!walkCells || walkCells.length < 2) {
        // Walk failed — try to place a station at the junction's neighbor if possible
        const fallbackNeighbors = getUnoccupiedNeighbors(junctionNode.cell, gridSize, occupied);
        if (fallbackNeighbors.length > 0) {
          const fb = fallbackNeighbors[Math.floor(rng() * fallbackNeighbors.length)];
          occupied.add(cellKey(fb.cell));
          const stationNode: GridNode = {
            cell: fb.cell,
            type: 'station',
            id: `station-${stationsPlaced++}`,
            children: [],
          };
          junctionNode.children.push({
            cells: [junctionNode.cell, fb.cell],
            child: stationNode,
          });
          totalPlaced++;
        }
        continue;
      }

      const walkEndCell = walkCells[walkCells.length - 1];

      if (branchStations <= 1 || depth > TRACK_GENERATION_DEFAULTS.maxBranchDepth) {
        // Place station at end of walk
        const stationNode: GridNode = {
          cell: walkEndCell,
          type: 'station',
          id: `station-${stationsPlaced++}`,
          children: [],
        };
        junctionNode.children.push({
          cells: walkCells,
          child: stationNode,
        });
        totalPlaced++;
      } else {
        // Place junction at end of walk and recurse
        const newJunction: GridNode = {
          cell: walkEndCell,
          type: 'junction',
          id: `junction-${junctionCounter++}`,
          children: [],
        };
        junctionNode.children.push({
          cells: walkCells,
          child: newJunction,
        });

        const placed = growBranches(newJunction, branchStations, depth + 1);
        totalPlaced += placed;

        // If junction ended up with fewer than 2 children, fix it
        if (newJunction.children.length < 2) {
          if (newJunction.children.length === 0) {
            // No children at all — convert junction to station
            newJunction.type = 'station';
            newJunction.id = `station-${stationsPlaced++}`;
            totalPlaced++;
          } else {
            // Only 1 child — need to add another branch or collapse
            const extraNeighbors = getUnoccupiedNeighbors(newJunction.cell, gridSize, occupied);
            if (extraNeighbors.length > 0) {
              const en = extraNeighbors[Math.floor(rng() * extraNeighbors.length)];
              occupied.add(cellKey(en.cell));
              const extraStation: GridNode = {
                cell: en.cell,
                type: 'station',
                id: `station-${stationsPlaced++}`,
                children: [],
              };
              newJunction.children.push({
                cells: [newJunction.cell, en.cell],
                child: extraStation,
              });
              totalPlaced++;
            } else {
              // Can't add second branch — fail this junction placement
              // Convert junction to station and lose the subtree
              // (the retry logic will handle generating a new layout)
              newJunction.type = 'station';
              newJunction.id = `station-${stationsPlaced++}`;
              // Remove the single child edge (its cells are already occupied but that's OK for this attempt)
              newJunction.children = [];
              totalPlaced++;
            }
          }
        }
      }
    }

    return totalPlaced;
  }

  const placed = growBranches(firstJunction, stationsNeeded, 0);

  // Ensure first junction has at least 2 children
  if (firstJunction.children.length < 2) {
    return null; // Failed attempt
  }

  if (placed < stationsNeeded) {
    return null; // Couldn't place all stations
  }

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

  // Collect all station nodes to assign identities
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

  // Retry loop
  const MAX_RETRIES = TRACK_GENERATION_DEFAULTS.maxRetries;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const tree = attemptGeneration(trainCount, config.gridSize, allowThreeWay, rng);
    if (!tree) continue;

    // Collect node cells (spawn, junctions, stations) for spatial distribution check
    const nodeCells: GridCell[] = [];
    function collectNodeCells(node: GridNode): void {
      nodeCells.push(node.cell);
      for (const edge of node.children) {
        collectNodeCells(edge.child);
      }
    }
    collectNodeCells(tree);

    if (!checkSpatialDistribution(nodeCells, config.gridSize, effectiveCoverage)) {
      continue; // Poor distribution, retry
    }

    // Convert to BoardLayout
    const layout = convertTreeToBoardLayout(
      tree,
      config.gridSize,
      config.screenWidth,
      config.screenHeight,
    );

    return {
      layout,
      actualStationCount: layout.stations.length,
      capped,
    };
  }

  throw new Error('Failed to generate layout after 10 retries');
}
