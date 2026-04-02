import {
  BoardLayout,
  Junction,
  PathSegment,
  Point,
  SpawnPoint,
  Station,
} from '../models/game.models';
import { generateStationIdentities } from './station-identity.util';

/**
 * Calculate the total length of a path defined by waypoints using
 * Euclidean distance between consecutive points.
 */
function calculatePathLength(waypoints: Point[]): number {
  let length = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Generate a hub-and-spoke BoardLayout for the given trainCount and canvas size.
 *
 * Algorithm:
 * 1. Place stations evenly around the perimeter (~15% padding from edges).
 * 2. Place a hub junction at the canvas center.
 * 3. For trainCount >= 4: group stations into clusters of 2 (or 3 for odd).
 *    Each cluster gets an intermediate junction. Hub connects to intermediates,
 *    intermediates connect to stations.
 *    For trainCount 2-3: hub connects directly to all stations (no intermediates).
 * 4. Place 1–2 spawn points at the top edge, connected to the hub.
 * 5. Generate PathSegment objects with waypoints and computed lengths.
 */
export function generateLayout(
  trainCount: number,
  width: number,
  height: number,
): BoardLayout {
  const stations: Station[] = [];
  const junctions: Junction[] = [];
  const paths: PathSegment[] = [];
  const spawnPoints: SpawnPoint[] = [];

  let pathCounter = 0;
  const nextPathId = (): string => `path-${pathCounter++}`;

  // ── 1. Station placement ──
  const stationMargin = 30; // pixels from edge for station shape radius + buffer
  const cx = width / 2;
  const cy = height / 2;
  const rx = (width / 2) - stationMargin;
  const ry = (height / 2) - stationMargin;

  const identities = generateStationIdentities(trainCount);

  // Offset starting angle by half a step so no station lands exactly at top (where HUD is)
  const angleOffset = Math.PI / trainCount;
  for (let i = 0; i < trainCount; i++) {
    const angle = angleOffset + i * ((2 * Math.PI) / trainCount);
    stations.push({
      id: `station-${i}`,
      position: {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      },
      identity: identities[i],
    });
  }

  // ── 2. Hub junction ──
  const hubJunction: Junction = {
    id: 'junction-hub',
    position: { x: cx, y: cy },
    outgoingPathIds: [],
    switchIndex: 0,
  };

  // ── 3. Intermediate junctions / direct connections ──
  if (trainCount <= 3) {
    // Small train counts: hub connects directly to each station.
    // This guarantees hub has >= 2 outgoing paths (trainCount >= 2).
    for (let i = 0; i < trainCount; i++) {
      const station = stations[i];
      const pathId = nextPathId();
      const waypoints = buildWaypoints(hubJunction.position, station.position);
      paths.push({
        id: pathId,
        from: hubJunction.id,
        to: station.id,
        waypoints,
        length: calculatePathLength(waypoints),
      });
      hubJunction.outgoingPathIds.push(pathId);
    }
  } else {
    // trainCount >= 4: cluster stations into groups of 2 (last group is 3 for odd counts).
    // This guarantees >= 2 clusters, so hub has >= 2 outgoing paths.
    const clusters: number[][] = [];
    let idx = 0;
    while (idx < trainCount) {
      const remaining = trainCount - idx;
      if (remaining === 3) {
        clusters.push([idx, idx + 1, idx + 2]);
        idx += 3;
      } else {
        clusters.push([idx, idx + 1]);
        idx += 2;
      }
    }

    for (let c = 0; c < clusters.length; c++) {
      const cluster = clusters[c];

      // Midpoint of the cluster's stations
      const clusterMid: Point = {
        x: cluster.reduce((sum, si) => sum + stations[si].position.x, 0) / cluster.length,
        y: cluster.reduce((sum, si) => sum + stations[si].position.y, 0) / cluster.length,
      };

      // Intermediate junction sits midway between hub and cluster midpoint
      const intermediateJunction: Junction = {
        id: `junction-${c}`,
        position: {
          x: (cx + clusterMid.x) / 2,
          y: (cy + clusterMid.y) / 2,
        },
        outgoingPathIds: [],
        switchIndex: 0,
      };

      // Paths from intermediate junction → each station in the cluster
      for (const si of cluster) {
        const station = stations[si];
        const pathId = nextPathId();
        const waypoints = buildWaypoints(intermediateJunction.position, station.position);
        paths.push({
          id: pathId,
          from: intermediateJunction.id,
          to: station.id,
          waypoints,
          length: calculatePathLength(waypoints),
        });
        intermediateJunction.outgoingPathIds.push(pathId);
      }

      junctions.push(intermediateJunction);

      // Path from hub → intermediate junction
      const hubToIntId = nextPathId();
      const hubToIntWaypoints = buildWaypoints(hubJunction.position, intermediateJunction.position);
      paths.push({
        id: hubToIntId,
        from: hubJunction.id,
        to: intermediateJunction.id,
        waypoints: hubToIntWaypoints,
        length: calculatePathLength(hubToIntWaypoints),
      });
      hubJunction.outgoingPathIds.push(hubToIntId);
    }
  }

  junctions.push(hubJunction);

  // ── 4. Spawn points ──
  const spawnCount = trainCount <= 4 ? 1 : 2;
  for (let s = 0; s < spawnCount; s++) {
    const spawnId = `spawn-${s}`;
    const spawnX = spawnCount === 1
      ? cx
      : cx + (s === 0 ? -width * 0.15 : width * 0.15);
    const spawnPos: Point = { x: spawnX, y: 10 };

    const pathId = nextPathId();
    const waypoints = buildWaypoints(spawnPos, hubJunction.position);
    paths.push({
      id: pathId,
      from: spawnId,
      to: hubJunction.id,
      waypoints,
      length: calculatePathLength(waypoints),
    });

    spawnPoints.push({
      id: spawnId,
      position: spawnPos,
      outgoingPathId: pathId,
    });
  }

  return { spawnPoints, junctions, stations, paths };
}

/**
 * Build waypoints for a path between two points.
 * Uses a perpendicular control point for a gentle curve.
 */
function buildWaypoints(from: Point, to: Point): Point[] {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    return [from, to];
  }

  // Small perpendicular nudge (10% of distance) for a gentle curve
  const offset = dist * 0.1;
  const nx = -dy / dist;
  const ny = dx / dist;

  const control: Point = {
    x: midX + nx * offset,
    y: midY + ny * offset,
  };

  return [from, control, to];
}
