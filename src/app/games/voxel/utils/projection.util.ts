import {
  Projection,
  ProjectionCell,
  ViewDirection,
  VoxelShape,
} from '../models/game.models';

/**
 * Direction-to-axis mapping configuration.
 *
 * | Direction | Col axis | Row axis | Depth axis | Mirror | Depth order |
 * |-----------|----------|----------|------------|--------|-------------|
 * | front     | x        | y (inv)  | z          | none   | max Z first |
 * | back      | x (inv)  | y (inv)  | z          | X      | min Z first |
 * | right     | z        | y (inv)  | x          | none   | max X first |
 * | left      | z (inv)  | y (inv)  | x          | Z      | min Z first |
 * | top       | x        | z        | y          | none   | max Y first |
 * | bottom    | x        | z (inv)  | y          | Z      | min Y first |
 */
interface AxisMapping {
  /** Index into [x, y, z] for the column axis. */
  colAxis: 0 | 1 | 2;
  /** Index into [x, y, z] for the row axis. */
  rowAxis: 0 | 1 | 2;
  /** Index into [x, y, z] for the depth axis. */
  depthAxis: 0 | 1 | 2;
  /** Whether the column axis is mirrored. */
  mirrorCol: boolean;
  /** Whether the row axis is inverted (screen Y vs 3D Y). */
  invertRow: boolean;
  /** If true, higher depth values are closer to camera (frontmost). */
  depthMaxFirst: boolean;
}

const AXIS_MAPPINGS: Record<ViewDirection, AxisMapping> = {
  front:  { colAxis: 0, rowAxis: 1, depthAxis: 2, mirrorCol: false, invertRow: true,  depthMaxFirst: true  },
  back:   { colAxis: 0, rowAxis: 1, depthAxis: 2, mirrorCol: true,  invertRow: true,  depthMaxFirst: false },
  right:  { colAxis: 2, rowAxis: 1, depthAxis: 0, mirrorCol: false, invertRow: true,  depthMaxFirst: true  },
  left:   { colAxis: 2, rowAxis: 1, depthAxis: 0, mirrorCol: true,  invertRow: true,  depthMaxFirst: false },
  top:    { colAxis: 0, rowAxis: 2, depthAxis: 1, mirrorCol: false, invertRow: false, depthMaxFirst: true  },
  bottom: { colAxis: 0, rowAxis: 2, depthAxis: 1, mirrorCol: false, invertRow: true,  depthMaxFirst: false },
};

/**
 * Computes a 2D orthographic projection of a voxel shape from a given viewing direction.
 *
 * Pure function — same inputs always produce the same output.
 *
 * @param shape     The 3D voxel shape to project.
 * @param direction The viewing direction.
 * @param colorMode If true, record frontmost voxel color; if false, record 'filled'.
 * @returns A Projection with grid[row][col], width, and height.
 */
export function computeProjection(
  shape: VoxelShape,
  direction: ViewDirection,
  colorMode: boolean,
): Projection {
  const mapping = AXIS_MAPPINGS[direction];
  const { min, max } = shape.boundingBox;

  // Projection plane dimensions
  const width = max[mapping.colAxis] - min[mapping.colAxis] + 1;
  const height = max[mapping.rowAxis] - min[mapping.rowAxis] + 1;

  // Initialize grid (height rows × width cols) and depth tracking
  const grid: ProjectionCell[][] = Array.from({ length: height }, () =>
    Array<ProjectionCell>(width).fill(null),
  );
  const depthGrid: number[][] = Array.from({ length: height }, () =>
    Array<number>(width).fill(mapping.depthMaxFirst ? -Infinity : Infinity),
  );

  for (const voxel of shape.voxels) {
    const [x, y, z] = voxel.position;
    const pos = [x, y, z];

    // Map 3D coordinate to 2D [col, row]
    let col = pos[mapping.colAxis] - min[mapping.colAxis];
    let row = pos[mapping.rowAxis] - min[mapping.rowAxis];
    const depth = pos[mapping.depthAxis];

    // Apply mirror on column axis
    if (mapping.mirrorCol) {
      col = width - 1 - col;
    }

    // Invert row (screen Y increases downward, 3D Y increases upward)
    if (mapping.invertRow) {
      row = height - 1 - row;
    }

    // Determine if this voxel is closer to camera than current occupant
    const currentDepth = depthGrid[row][col];
    const isCloser = mapping.depthMaxFirst
      ? depth > currentDepth
      : depth < currentDepth;

    if (grid[row][col] === null || isCloser) {
      grid[row][col] = colorMode ? voxel.color : 'filled';
      depthGrid[row][col] = depth;
    }
  }

  return { grid, width, height };
}

/**
 * Compares two projections for equality.
 *
 * In colorMode, compares exact cell values (color or null).
 * In standard mode, compares filled/empty status only (any non-null is 'filled').
 *
 * @param a         First projection.
 * @param b         Second projection.
 * @param colorMode If true, compare exact colors; if false, compare filled/empty only.
 * @returns True if projections are equal under the given comparison mode.
 */
export function projectionsEqual(
  a: Projection,
  b: Projection,
  colorMode: boolean,
): boolean {
  if (a.width !== b.width || a.height !== b.height) {
    return false;
  }

  for (let row = 0; row < a.height; row++) {
    for (let col = 0; col < a.width; col++) {
      const cellA = a.grid[row][col];
      const cellB = b.grid[row][col];

      if (colorMode) {
        // Exact comparison: color string or null
        if (cellA !== cellB) {
          return false;
        }
      } else {
        // Binary comparison: filled (non-null) vs empty (null)
        const filledA = cellA !== null;
        const filledB = cellB !== null;
        if (filledA !== filledB) {
          return false;
        }
      }
    }
  }

  return true;
}
