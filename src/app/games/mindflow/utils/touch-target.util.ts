import { BoardLayout } from '../models/game.models';

export function validateTouchTargets(layout: BoardLayout, minSize: number): boolean {
  const junctions = layout.junctions;
  for (let i = 0; i < junctions.length; i++) {
    for (let j = i + 1; j < junctions.length; j++) {
      const dx = junctions[i].position.x - junctions[j].position.x;
      const dy = junctions[i].position.y - junctions[j].position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minSize) {
        return false;
      }
    }
  }
  return true;
}
