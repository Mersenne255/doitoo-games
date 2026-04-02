import { Junction } from '../models/game.models';

export function cycleJunction(junction: Junction): Junction {
  return {
    ...junction,
    switchIndex: (junction.switchIndex + 1) % junction.outgoingPathIds.length,
  };
}

export function getNextPathForShape(junction: Junction): string {
  return junction.outgoingPathIds[junction.switchIndex];
}
