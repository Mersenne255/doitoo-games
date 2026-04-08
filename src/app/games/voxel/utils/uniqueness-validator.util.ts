import { ViewDirection, VIEW_DIRECTIONS, VoxelShape } from '../models/game.models';
import { computeProjection, projectionsEqual } from './projection.util';

/**
 * Validates that the projection of a shape from the asked direction
 * is unique — i.e., not identical to the projection from any other direction.
 *
 * @param shape          The 3D voxel shape to validate.
 * @param askedDirection The direction being asked about.
 * @param colorMode      If true, compare exact colors; if false, compare filled/empty only.
 * @returns True if the asked direction's projection is distinct from all others.
 */
export function validateUniqueness(
  shape: VoxelShape,
  askedDirection: ViewDirection,
  colorMode: boolean,
): boolean {
  const correctProjection = computeProjection(shape, askedDirection, colorMode);

  for (const direction of VIEW_DIRECTIONS) {
    if (direction === askedDirection) {
      continue;
    }
    const otherProjection = computeProjection(shape, direction, colorMode);
    if (projectionsEqual(correctProjection, otherProjection, colorMode)) {
      return false;
    }
  }

  return true;
}
