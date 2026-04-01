import {
  ValidatorOptions,
  ValidationResult,
  GridSize,
  GridCell,
} from '../models/grid.models';
import { BoardLayout, PathSegment, Point } from '../models/game.models';

/**
 * Validates a BoardLayout for structural correctness and spatial distribution.
 * Pure function — no Angular, DOM, or canvas imports.
 * Collects ALL errors (does not short-circuit on first error).
 */
export function validateLayout(
  layout: BoardLayout,
  screenWidth: number,
  screenHeight: number,
  options?: ValidatorOptions,
): ValidationResult {
  const errors: string[] = [];

  const gridSize = options?.gridSize;
  const allowThreeWay = options?.allowThreeWayJunctions ?? false;
  const minCoverage = options?.minSpatialCoverage ?? 0.6;
  const stationCount = options?.stationCount ?? layout.stations.length;
  const effectiveCoverage = stationCount <= 3 ? Math.min(minCoverage, 0.5) : minCoverage;

  // ── Check 1: Exactly one spawn point ──
  if (layout.spawnPoints.length !== 1) {
    errors.push(`Expected exactly 1 spawn point, found ${layout.spawnPoints.length}`);
  }

  // ── Check 2: All path segments axis-aligned ──
  for (const path of layout.paths) {
    if (path.waypoints.length === 2) {
      const [p1, p2] = path.waypoints;
      if (p1.x !== p2.x && p1.y !== p2.y) {
        errors.push(
          `PathSegment ${path.id} is not axis-aligned: waypoints (${p1.x},${p1.y}) to (${p2.x},${p2.y})`,
        );
      }
    }
  }

  // ── Check 3: No overlapping grid cells between segments ──
  if (gridSize) {
    checkOverlappingCells(layout.paths, gridSize, screenWidth, screenHeight, errors);
  }

  // ── Check 4: All stations reachable from spawn via BFS ──
  checkReachability(layout, errors);

  // ── Check 5: Every junction has ≥ 2 outgoing paths ──
  for (const junction of layout.junctions) {
    if (junction.outgoingPathIds.length < 2) {
      errors.push(
        `Junction ${junction.id} has only ${junction.outgoingPathIds.length} outgoing paths (minimum 2 required)`,
      );
    }
  }

  // ── Check 6: Junction outgoing paths ≤ max ──
  const maxOutgoing = allowThreeWay ? 3 : 2;
  for (const junction of layout.junctions) {
    if (junction.outgoingPathIds.length > maxOutgoing) {
      errors.push(
        `Junction ${junction.id} has ${junction.outgoingPathIds.length} outgoing paths (maximum ${maxOutgoing} allowed; allowThreeWayJunctions is ${allowThreeWay})`,
      );
    }
  }

  // ── Check 7: All node positions within screen bounds ──
  checkNodeBounds(layout, screenWidth, screenHeight, errors);

  // ── Check 8: Spatial distribution bounding box coverage ──
  if (gridSize) {
    checkSpatialCoverage(layout, gridSize, screenWidth, screenHeight, effectiveCoverage, errors);
  }

  // ── Check 9: Quadrant coverage (when total nodes ≥ 4) ──
  checkQuadrantCoverage(layout, screenWidth, screenHeight, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}


// ── Helper: Convert pixel point to grid cell ──

function pixelToGridCell(
  point: Point,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
): GridCell {
  const cellWidth = screenWidth / gridSize.cols;
  const cellHeight = screenHeight / gridSize.rows;
  const col = Math.round((point.x - cellWidth / 2) / cellWidth);
  const row = Math.round((point.y - cellHeight / 2) / cellHeight);
  return { col, row };
}

// ── Helper: Decompose a path segment into grid cells ──

function decomposeSegmentToCells(
  segment: PathSegment,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
): GridCell[] {
  if (segment.waypoints.length !== 2) return [];

  const start = pixelToGridCell(segment.waypoints[0], gridSize, screenWidth, screenHeight);
  const end = pixelToGridCell(segment.waypoints[1], gridSize, screenWidth, screenHeight);

  const cells: GridCell[] = [];

  if (start.col === end.col) {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    for (let row = minRow; row <= maxRow; row++) {
      cells.push({ col: start.col, row });
    }
  } else if (start.row === end.row) {
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    for (let col = minCol; col <= maxCol; col++) {
      cells.push({ col, row: start.row });
    }
  }

  return cells;
}

// ── Check 3: Overlapping grid cells ──

function checkOverlappingCells(
  paths: PathSegment[],
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
  errors: string[],
): void {
  const cellOwner = new Map<string, string>();

  const endpointKeys = new Set<string>();
  for (const path of paths) {
    if (path.waypoints.length === 2) {
      const startCell = pixelToGridCell(path.waypoints[0], gridSize, screenWidth, screenHeight);
      const endCell = pixelToGridCell(path.waypoints[1], gridSize, screenWidth, screenHeight);
      endpointKeys.add(`${startCell.col},${startCell.row}`);
      endpointKeys.add(`${endCell.col},${endCell.row}`);
    }
  }

  for (const path of paths) {
    const cells = decomposeSegmentToCells(path, gridSize, screenWidth, screenHeight);
    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`;
      const existing = cellOwner.get(key);
      if (existing !== undefined && existing !== path.id) {
        if (endpointKeys.has(key)) {
          const isEndpointOfCurrent = isEndpointCell(path, cell, gridSize, screenWidth, screenHeight);
          const existingPath = paths.find(p => p.id === existing);
          const isEndpointOfExisting = existingPath
            ? isEndpointCell(existingPath, cell, gridSize, screenWidth, screenHeight)
            : false;
          if (isEndpointOfCurrent && isEndpointOfExisting) {
            continue;
          }
        }
        errors.push(
          `Grid cell (${cell.col},${cell.row}) is occupied by multiple segments: ${existing}, ${path.id}`,
        );
      } else {
        cellOwner.set(key, path.id);
      }
    }
  }
}

function isEndpointCell(
  segment: PathSegment,
  cell: GridCell,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
): boolean {
  if (segment.waypoints.length !== 2) return false;
  const start = pixelToGridCell(segment.waypoints[0], gridSize, screenWidth, screenHeight);
  const end = pixelToGridCell(segment.waypoints[1], gridSize, screenWidth, screenHeight);
  return (
    (cell.col === start.col && cell.row === start.row) ||
    (cell.col === end.col && cell.row === end.row)
  );
}

// ── Check 4: Reachability via BFS ──

function checkReachability(layout: BoardLayout, errors: string[]): void {
  if (layout.spawnPoints.length === 0) return;

  const spawn = layout.spawnPoints[0];

  const adjacency = new Map<string, Set<string>>();
  for (const path of layout.paths) {
    if (!adjacency.has(path.from)) adjacency.set(path.from, new Set());
    if (!adjacency.has(path.to)) adjacency.set(path.to, new Set());
    adjacency.get(path.from)!.add(path.to);
    adjacency.get(path.to)!.add(path.from);
  }

  const visited = new Set<string>();
  const queue: string[] = [spawn.id];
  visited.add(spawn.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  for (const station of layout.stations) {
    if (!visited.has(station.id)) {
      errors.push(`Station ${station.id} is not reachable from spawn point`);
    }
  }
}

// ── Check 7: Node bounds ──

function checkNodeBounds(
  layout: BoardLayout,
  screenWidth: number,
  screenHeight: number,
  errors: string[],
): void {
  const allNodes: { id: string; position: Point }[] = [
    ...layout.spawnPoints.map(s => ({ id: s.id, position: s.position })),
    ...layout.junctions.map(j => ({ id: j.id, position: j.position })),
    ...layout.stations.map(s => ({ id: s.id, position: s.position })),
  ];

  for (const node of allNodes) {
    const { x, y } = node.position;
    if (x < 0 || x > screenWidth || y < 0 || y > screenHeight) {
      errors.push(
        `Node ${node.id} position (${x},${y}) is outside screen bounds (${screenWidth}x${screenHeight})`,
      );
    }
  }
}

// ── Check 8: Spatial distribution bounding box coverage ──

function checkSpatialCoverage(
  layout: BoardLayout,
  gridSize: GridSize,
  screenWidth: number,
  screenHeight: number,
  threshold: number,
  errors: string[],
): void {
  const allPositions = getAllNodePositions(layout);
  if (allPositions.length === 0) return;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const pos of allPositions) {
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
  }

  const cellWidth = screenWidth / gridSize.cols;
  const cellHeight = screenHeight / gridSize.rows;
  const maxSpreadX = (gridSize.cols - 1) * cellWidth;
  const maxSpreadY = (gridSize.rows - 1) * cellHeight;

  const actualSpreadX = maxX - minX;
  const actualSpreadY = maxY - minY;

  const widthCoverage = maxSpreadX > 0 ? actualSpreadX / maxSpreadX : 0;
  const heightCoverage = maxSpreadY > 0 ? actualSpreadY / maxSpreadY : 0;

  if (widthCoverage < threshold || heightCoverage < threshold) {
    const actualW = Math.round(widthCoverage * 100);
    const actualH = Math.round(heightCoverage * 100);
    const thresholdPct = Math.round(threshold * 100);
    errors.push(
      `Node bounding box covers only ${actualW}% width and ${actualH}% height (minimum ${thresholdPct}% required)`,
    );
  }
}

// ── Check 9: Quadrant coverage ──

function checkQuadrantCoverage(
  layout: BoardLayout,
  screenWidth: number,
  screenHeight: number,
  errors: string[],
): void {
  const allPositions = getAllNodePositions(layout);
  if (allPositions.length < 4) return;

  const midX = screenWidth / 2;
  const midY = screenHeight / 2;

  const quadrantNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const quadrantHasNode = [false, false, false, false];

  for (const pos of allPositions) {
    if (pos.x < midX && pos.y < midY) quadrantHasNode[0] = true;
    else if (pos.x >= midX && pos.y < midY) quadrantHasNode[1] = true;
    else if (pos.x < midX && pos.y >= midY) quadrantHasNode[2] = true;
    else quadrantHasNode[3] = true;
  }

  for (let i = 0; i < 4; i++) {
    if (!quadrantHasNode[i]) {
      errors.push(
        `Quadrant ${quadrantNames[i]} contains no nodes (expected at least 1 when total nodes >= 4)`,
      );
    }
  }
}

// ── Shared helper: collect all node positions ──

function getAllNodePositions(layout: BoardLayout): Point[] {
  return [
    ...layout.spawnPoints.map(s => s.position),
    ...layout.junctions.map(j => j.position),
    ...layout.stations.map(s => s.position),
  ];
}
