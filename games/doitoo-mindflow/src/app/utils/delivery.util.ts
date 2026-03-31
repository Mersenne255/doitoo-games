import { StationIdentity } from '../models/game.models';

export function classifyDelivery(
  shapeIdentity: StationIdentity,
  stationIdentity: StationIdentity,
): boolean {
  return shapeIdentity.shapeType === stationIdentity.shapeType
    && shapeIdentity.color === stationIdentity.color;
}
