import { ActiveShape, SpawnPoint, StationIdentity } from '../models/game.models';

export function spawnShape(
  stationIdentities: StationIdentity[],
  spawnPoint: SpawnPoint,
  id: string,
  timestamp: number,
): ActiveShape {
  const identity = stationIdentities[Math.floor(Math.random() * stationIdentities.length)];
  return {
    id,
    identity,
    currentPathId: spawnPoint.outgoingPathId,
    progressAlongPath: 0,
    spawnTime: timestamp,
  };
}
