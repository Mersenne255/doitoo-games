import { Voxel, VoxelColor, VoxelShape, VOXEL_COLORS } from '../models/game.models';

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FACE_DIRECTIONS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Checks if adding a voxel at (nx, ny, nz) would make any of its existing neighbors
 * become fully enclosed (all 6 faces occupied).
 */
function wouldCreateHidden(nx: number, ny: number, nz: number, occupied: Set<string>): boolean {
  // Temporarily add the new position
  const newKey = posKey(nx, ny, nz);
  occupied.add(newKey);

  let createsHidden = false;

  // Check each existing neighbor — would it become fully enclosed?
  for (const [dx, dy, dz] of FACE_DIRECTIONS) {
    const adjKey = posKey(nx + dx, ny + dy, nz + dz);
    if (occupied.has(adjKey)) {
      // Check if this neighbor now has all 6 faces occupied
      const allEnclosed = FACE_DIRECTIONS.every(([ddx, ddy, ddz]) =>
        occupied.has(posKey(nx + dx + ddx, ny + dy + ddy, nz + dz + ddz))
      );
      if (allEnclosed) {
        createsHidden = true;
        break;
      }
    }
  }

  // Also check if the new cube itself would be fully enclosed
  if (!createsHidden) {
    createsHidden = FACE_DIRECTIONS.every(([dx, dy, dz]) =>
      occupied.has(posKey(nx + dx, ny + dy, nz + dz))
    );
  }

  // Remove the temporary addition
  occupied.delete(newKey);

  return createsHidden;
}

export function generateShape(seed: number, complexity: number, symmetric: boolean): VoxelShape {
  const rng = mulberry32(seed);
  const maxDim = Math.min(12, Math.max(3, Math.ceil(complexity * 0.7) + 1));

  const positions: [number, number, number][] = [[0, 0, 0]];
  const occupied = new Set<string>([posKey(0, 0, 0)]);

  let failedAttempts = 0;
  const maxFailedAttempts = complexity * 100; // safety valve

  while (positions.length < complexity && failedAttempts < maxFailedAttempts) {
    const baseIdx = Math.floor(rng() * positions.length);
    const base = positions[baseIdx];

    const dir = FACE_DIRECTIONS[Math.floor(rng() * FACE_DIRECTIONS.length)];
    const candidate: [number, number, number] = [
      base[0] + dir[0],
      base[1] + dir[1],
      base[2] + dir[2],
    ];

    if (
      Math.abs(candidate[0]) > maxDim ||
      Math.abs(candidate[1]) > maxDim ||
      Math.abs(candidate[2]) > maxDim
    ) {
      failedAttempts++;
      continue;
    }

    const key = posKey(candidate[0], candidate[1], candidate[2]);
    if (occupied.has(key)) {
      failedAttempts++;
      continue;
    }

    // Check if placing this cube would create any hidden cubes
    if (wouldCreateHidden(candidate[0], candidate[1], candidate[2], occupied)) {
      failedAttempts++;
      continue;
    }

    occupied.add(key);
    positions.push(candidate);
    failedAttempts = 0; // reset on success

    // Symmetric mode: mirror across X axis
    if (symmetric && positions.length < complexity) {
      const mirrored: [number, number, number] = [-candidate[0], candidate[1], candidate[2]];
      const mirrorKey = posKey(mirrored[0], mirrored[1], mirrored[2]);
      if (!occupied.has(mirrorKey) && !wouldCreateHidden(mirrored[0], mirrored[1], mirrored[2], occupied)) {
        occupied.add(mirrorKey);
        positions.push(mirrored);
      }
    }
  }

  // Normalize coordinates so min is [0,0,0]
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

  return {
    voxels,
    boundingBox: {
      min: [0, 0, 0],
      max: [maxX - minX, maxY - minY, maxZ - minZ],
    },
  };
}
