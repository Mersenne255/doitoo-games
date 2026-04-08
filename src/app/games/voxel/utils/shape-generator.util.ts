import { Voxel, VoxelColor, VoxelShape, VOXEL_COLORS } from '../models/game.models';

/**
 * Mulberry32 seeded PRNG.
 * Returns a function that produces deterministic pseudo-random numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Six face-adjacent directions for 3D voxel connectivity. */
const FACE_DIRECTIONS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

/** Encode a 3D coordinate as a string key for Set lookups. */
function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Generates a connected voxel shape via seeded random walk.
 *
 * Algorithm:
 * 1. Start at [0,0,0], iteratively add face-adjacent voxels
 * 2. Bounding box constraint: maxDim = ceil(complexity * 0.6) + 1, clamped to [3, 8]
 * 3. Symmetric mode: mirror voxels across X axis
 * 4. Post-generation: normalize coordinates so min is [0,0,0]
 * 5. Assign colors cycling through VOXEL_COLORS palette
 *
 * Pure function — same inputs always produce the same output.
 */
export function generateShape(seed: number, complexity: number, symmetric: boolean): VoxelShape {
  const rng = mulberry32(seed);
  const maxDim = Math.min(8, Math.max(3, Math.ceil(complexity * 0.6) + 1));

  const positions: [number, number, number][] = [[0, 0, 0]];
  const occupied = new Set<string>([posKey(0, 0, 0)]);

  while (positions.length < complexity) {
    // Pick a random existing voxel
    const baseIdx = Math.floor(rng() * positions.length);
    const base = positions[baseIdx];

    // Pick a random face-adjacent direction
    const dir = FACE_DIRECTIONS[Math.floor(rng() * FACE_DIRECTIONS.length)];
    const candidate: [number, number, number] = [
      base[0] + dir[0],
      base[1] + dir[1],
      base[2] + dir[2],
    ];

    // Check bounding box constraint (using a centered range to allow growth in all directions)
    if (
      Math.abs(candidate[0]) > maxDim ||
      Math.abs(candidate[1]) > maxDim ||
      Math.abs(candidate[2]) > maxDim
    ) {
      continue;
    }

    const key = posKey(candidate[0], candidate[1], candidate[2]);
    if (occupied.has(key)) {
      continue;
    }

    // Add the candidate
    occupied.add(key);
    positions.push(candidate);

    // In symmetric mode, mirror across X axis
    if (symmetric && positions.length < complexity) {
      const mirrored: [number, number, number] = [-candidate[0], candidate[1], candidate[2]];
      const mirrorKey = posKey(mirrored[0], mirrored[1], mirrored[2]);
      if (!occupied.has(mirrorKey)) {
        occupied.add(mirrorKey);
        positions.push(mirrored);
      }
    }
  }

  // Normalize: translate so minimum coordinate on each axis is 0
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const [x, y, z] of positions) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const voxels: Voxel[] = positions.map(([x, y, z], i) => ({
    position: [x - minX, y - minY, z - minZ] as [number, number, number],
    color: VOXEL_COLORS[i % VOXEL_COLORS.length] as VoxelColor,
  }));

  // Recompute bounding box after normalization
  const normalizedMaxX = maxX - minX;
  const normalizedMaxY = maxY - minY;
  const normalizedMaxZ = maxZ - minZ;

  return {
    voxels,
    boundingBox: {
      min: [0, 0, 0],
      max: [normalizedMaxX, normalizedMaxY, normalizedMaxZ],
    },
  };
}
