import { COLOR_PALETTE, SHAPE_TYPES, StationIdentity } from '../models/game.models';

export function generateStationIdentities(trainCount: number): StationIdentity[] {
  const identities: StationIdentity[] = [];
  for (let i = 0; i < trainCount; i++) {
    const shapeIndex = Math.floor(i / COLOR_PALETTE.length);
    const colorIndex = i % COLOR_PALETTE.length;
    identities.push({
      shapeType: SHAPE_TYPES[shapeIndex],
      color: COLOR_PALETTE[colorIndex],
    });
  }
  return identities;
}
