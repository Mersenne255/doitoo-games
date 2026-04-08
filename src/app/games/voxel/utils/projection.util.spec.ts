import { describe, it, expect } from 'vitest';
import { computeProjection, projectionsEqual } from './projection.util';
import {
  Projection,
  Voxel,
  VoxelColor,
  VoxelShape,
  VOXEL_COLORS,
} from '../models/game.models';

/** Helper: build a VoxelShape from position tuples (standard indigo color). */
function makeShape(positions: [number, number, number][]): VoxelShape {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of positions) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
  }
  const voxels: Voxel[] = positions.map((pos, i) => ({
    position: pos,
    color: VOXEL_COLORS[i % VOXEL_COLORS.length] as VoxelColor,
  }));
  return {
    voxels,
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
  };
}

describe('computeProjection', () => {
  // Single voxel at [0,0,0] — should produce 1×1 projection from all directions
  it('should produce 1×1 projection for a single voxel from all directions', () => {
    const shape = makeShape([[0, 0, 0]]);
    const directions = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const;
    for (const dir of directions) {
      const proj = computeProjection(shape, dir, false);
      expect(proj.width).toBe(1);
      expect(proj.height).toBe(1);
      expect(proj.grid).toEqual([['filled']]);
    }
  });

  // L-shaped piece: voxels at [0,0,0], [1,0,0], [0,1,0]
  // Front projection (XY plane, Y inverted):
  //   3D: y=1 has [0,1,0], y=0 has [0,0,0] and [1,0,0]
  //   Screen: row 0 = y=1, row 1 = y=0
  //   Expected grid (2 rows × 2 cols):
  //     row 0: ['filled', null]     (y=1: only x=0)
  //     row 1: ['filled', 'filled'] (y=0: x=0 and x=1)
  it('should project an L-shape from front correctly', () => {
    const shape = makeShape([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    const proj = computeProjection(shape, 'front', false);
    expect(proj.width).toBe(2);
    expect(proj.height).toBe(2);
    expect(proj.grid).toEqual([
      ['filled', null],
      ['filled', 'filled'],
    ]);
  });

  // Back projection mirrors X axis
  it('should project an L-shape from back as X-mirrored front', () => {
    const shape = makeShape([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    const proj = computeProjection(shape, 'back', false);
    expect(proj.width).toBe(2);
    expect(proj.height).toBe(2);
    expect(proj.grid).toEqual([
      [null, 'filled'],
      ['filled', 'filled'],
    ]);
  });

  // Top projection (XZ plane, no Y inversion)
  // Voxels: [0,0,0], [1,0,0], [0,1,0] — all at z=0
  // Top view: col=x, row=z → 1 row × 2 cols
  it('should project an L-shape from top correctly', () => {
    const shape = makeShape([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
    const proj = computeProjection(shape, 'top', false);
    expect(proj.width).toBe(2);
    expect(proj.height).toBe(1);
    expect(proj.grid).toEqual([
      ['filled', 'filled'],
    ]);
  });

  // Color mode: frontmost voxel's color is recorded
  it('should record frontmost voxel color in color mode', () => {
    // Two voxels stacked along Z: [0,0,0] and [0,0,1]
    // Front view looks along +Z, so max Z first → [0,0,1] is frontmost
    const shape = makeShape([[0, 0, 0], [0, 0, 1]]);
    const proj = computeProjection(shape, 'front', true);
    expect(proj.width).toBe(1);
    expect(proj.height).toBe(1);
    // Voxel at index 1 ([0,0,1]) is frontmost, its color is VOXEL_COLORS[1]
    expect(proj.grid[0][0]).toBe(VOXEL_COLORS[1]);
  });

  // Standard mode: all non-null cells are 'filled'
  it('should produce filled cells in standard mode', () => {
    const shape = makeShape([[0, 0, 0], [0, 0, 1]]);
    const proj = computeProjection(shape, 'front', false);
    expect(proj.grid[0][0]).toBe('filled');
  });

  // Projection dimensions match bounding box on projection plane
  it('should have dimensions matching bounding box on projection plane', () => {
    // Shape spanning x=[0,2], y=[0,1], z=[0,3]
    const shape = makeShape([[0, 0, 0], [2, 1, 3]]);
    // Front: col=x (3 wide), row=y (2 tall)
    const front = computeProjection(shape, 'front', false);
    expect(front.width).toBe(3);
    expect(front.height).toBe(2);
    // Right: col=z (4 wide), row=y (2 tall)
    const right = computeProjection(shape, 'right', false);
    expect(right.width).toBe(4);
    expect(right.height).toBe(2);
    // Top: col=x (3 wide), row=z (4 tall)
    const top = computeProjection(shape, 'top', false);
    expect(top.width).toBe(3);
    expect(top.height).toBe(4);
  });
});

describe('projectionsEqual', () => {
  it('should return true for identical projections in standard mode', () => {
    const proj: Projection = {
      grid: [['filled', null], [null, 'filled']],
      width: 2,
      height: 2,
    };
    expect(projectionsEqual(proj, proj, false)).toBe(true);
  });

  it('should return false for different dimensions', () => {
    const a: Projection = { grid: [['filled']], width: 1, height: 1 };
    const b: Projection = { grid: [['filled', null]], width: 2, height: 1 };
    expect(projectionsEqual(a, b, false)).toBe(false);
  });

  it('should treat different colors as equal in standard mode', () => {
    const a: Projection = {
      grid: [[VOXEL_COLORS[0]]],
      width: 1,
      height: 1,
    };
    const b: Projection = {
      grid: [[VOXEL_COLORS[1]]],
      width: 1,
      height: 1,
    };
    // Both are non-null → both "filled" in standard mode
    expect(projectionsEqual(a, b, false)).toBe(true);
  });

  it('should treat different colors as distinct in color mode', () => {
    const a: Projection = {
      grid: [[VOXEL_COLORS[0]]],
      width: 1,
      height: 1,
    };
    const b: Projection = {
      grid: [[VOXEL_COLORS[1]]],
      width: 1,
      height: 1,
    };
    expect(projectionsEqual(a, b, true)).toBe(false);
  });

  it('should compare null cells correctly', () => {
    const a: Projection = { grid: [[null]], width: 1, height: 1 };
    const b: Projection = { grid: [['filled']], width: 1, height: 1 };
    expect(projectionsEqual(a, b, false)).toBe(false);
    expect(projectionsEqual(a, b, true)).toBe(false);
  });
});
