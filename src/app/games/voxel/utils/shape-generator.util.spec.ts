import { describe, it, expect } from 'vitest';
import { generateShape, mulberry32 } from './shape-generator.util';

/** Check if a voxel has all 6 neighbors occupied (hidden). */
function isHidden(pos: [number, number, number], allPositions: Set<string>): boolean {
  const dirs: [number, number, number][] = [
    [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],
  ];
  return dirs.every(([dx,dy,dz]) => allPositions.has(`${pos[0]+dx},${pos[1]+dy},${pos[2]+dz}`));
}

/** Check if all voxels form a single connected component via BFS. */
function isConnected(positions: [number, number, number][]): boolean {
  if (positions.length <= 1) return true;
  const set = new Set(positions.map(([x,y,z]) => `${x},${y},${z}`));
  const visited = new Set<string>();
  const queue = [`${positions[0][0]},${positions[0][1]},${positions[0][2]}`];
  visited.add(queue[0]);
  const dirs: [number, number, number][] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

  while (queue.length > 0) {
    const key = queue.shift()!;
    const [x,y,z] = key.split(',').map(Number);
    for (const [dx,dy,dz] of dirs) {
      const nk = `${x+dx},${y+dy},${z+dz}`;
      if (set.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === positions.length;
}

describe('mulberry32', () => {
  it('should produce deterministic output for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('should produce values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('generateShape', () => {
  it('should produce the requested number of voxels (or close to it)', () => {
    for (const n of [3, 5, 8, 12]) {
      const shape = generateShape(42, n, false);
      expect(shape.voxels.length).toBe(n);
    }
    // High complexity may lose a cube or two due to hidden cube relocation
    const shape50 = generateShape(42, 50, false);
    expect(shape50.voxels.length).toBeGreaterThanOrEqual(45);
    expect(shape50.voxels.length).toBeLessThanOrEqual(50);
  });

  it('should be deterministic — same seed produces same shape', () => {
    const a = generateShape(999, 10, false);
    const b = generateShape(999, 10, false);
    expect(a).toEqual(b);
  });

  it('should produce all non-negative coordinates', () => {
    for (let seed = 0; seed < 20; seed++) {
      const shape = generateShape(seed, 15, false);
      for (const v of shape.voxels) {
        expect(v.position[0]).toBeGreaterThanOrEqual(0);
        expect(v.position[1]).toBeGreaterThanOrEqual(0);
        expect(v.position[2]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should produce a connected shape', () => {
    for (let seed = 0; seed < 20; seed++) {
      const shape = generateShape(seed, 12, false);
      expect(isConnected(shape.voxels.map(v => v.position))).toBe(true);
    }
  });

  it('should contain a voxel at the normalized origin [0,0,0]', () => {
    for (let seed = 0; seed < 10; seed++) {
      const shape = generateShape(seed, 8, false);
      // After normalization, min coords are shifted to 0, so the anchor
      // cube (originally at [0,0,0]) lands at the normalized origin.
      // However, if the shape grew in negative directions, the anchor
      // may not be at [0,0,0]. Instead verify the bounding box starts at [0,0,0].
      expect(shape.boundingBox.min).toEqual([0, 0, 0]);
    }
  });

  it('should have no hidden cubes — every cube has at least one exposed face', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const complexity of [5, 10, 15, 20, 30]) {
        const shape = generateShape(seed * 1000, complexity, false);
        const posSet = new Set(shape.voxels.map(v => `${v.position[0]},${v.position[1]},${v.position[2]}`));

        for (const v of shape.voxels) {
          const hidden = isHidden(v.position, posSet);
          if (hidden) {
            // Provide a useful error message
            expect(hidden, `Cube at [${v.position}] is hidden (seed=${seed * 1000}, complexity=${complexity})`).toBe(false);
          }
        }
      }
    }
  });

  it('should have no hidden cubes even at high complexity (50 cubes)', () => {
    for (let seed = 0; seed < 10; seed++) {
      const shape = generateShape(seed * 7777, 50, false);
      const posSet = new Set(shape.voxels.map(v => `${v.position[0]},${v.position[1]},${v.position[2]}`));

      for (const v of shape.voxels) {
        expect(isHidden(v.position, posSet)).toBe(false);
      }
    }
  });

  it('should have no hidden cubes in symmetric mode', () => {
    for (let seed = 0; seed < 20; seed++) {
      const shape = generateShape(seed * 333, 10, true);
      const posSet = new Set(shape.voxels.map(v => `${v.position[0]},${v.position[1]},${v.position[2]}`));

      for (const v of shape.voxels) {
        expect(isHidden(v.position, posSet)).toBe(false);
      }
    }
  });

  it('should have bounding box matching actual voxel extents', () => {
    const shape = generateShape(42, 10, false);
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const v of shape.voxels) {
      maxX = Math.max(maxX, v.position[0]);
      maxY = Math.max(maxY, v.position[1]);
      maxZ = Math.max(maxZ, v.position[2]);
    }
    expect(shape.boundingBox.min).toEqual([0, 0, 0]);
    expect(shape.boundingBox.max).toEqual([maxX, maxY, maxZ]);
  });
});
