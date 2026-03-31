import { COLOR_PALETTE, SHAPE_TYPES, StationIdentity } from '../models/game.models';

/**
 * Generate unique station identities (shape + color pairs).
 * 
 * Builds all possible shape×color combos, then orders them so that
 * consecutive stations have maximum visual distinctness:
 * - Colors are spread out first (no two adjacent stations share a color)
 * - Shapes vary across the sequence
 * 
 * For counts ≤ 10: every station gets a unique color.
 * For counts ≤ 50: every station gets a unique shape+color combo.
 */
export function generateStationIdentities(trainCount: number): StationIdentity[] {
  const numColors = COLOR_PALETTE.length;
  const numShapes = SHAPE_TYPES.length;

  // Build all combos ordered by color-first, shape-second
  // This gives: red/circle, red/square, red/triangle, ..., blue/circle, blue/square, ...
  // Then we pick by striding through colors
  const allCombos: StationIdentity[] = [];
  for (let c = 0; c < numColors; c++) {
    for (let s = 0; s < numShapes; s++) {
      allCombos.push({ shapeType: SHAPE_TYPES[s], color: COLOR_PALETTE[c] });
    }
  }

  // Reorder: pick one combo per color in round-robin, cycling shapes
  // Round 0: color0/shape0, color1/shape0, color2/shape0, ..., color9/shape0
  // Round 1: color0/shape1, color1/shape1, ..., color9/shape1
  // etc.
  const ordered: StationIdentity[] = [];
  for (let s = 0; s < numShapes; s++) {
    for (let c = 0; c < numColors; c++) {
      ordered.push({ shapeType: SHAPE_TYPES[s], color: COLOR_PALETTE[c] });
    }
  }

  return ordered.slice(0, trainCount);
}
