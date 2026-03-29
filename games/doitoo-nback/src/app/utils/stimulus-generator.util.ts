import {
  NBackConfig,
  GeneratedSequence,
  Stimulus,
  MatchFlags,
  COLOR_PALETTE,
  SHAPES,
  INTENSITY_RATES,
  ShapeType,
} from '../models/game.models';

/**
 * Generate a complete stimulus sequence for a Dual N-Back session.
 * Pure function — no Angular dependencies, fully deterministic when given a seeded rng.
 */
export function generateSequence(
  config: NBackConfig,
  rng: () => number = Math.random,
): GeneratedSequence {
  const { stepCount, nLevel, gridSize, colorCount, intensity } = config;

  const targetMatchCount = Math.round(stepCount * INTENSITY_RATES[intensity]);

  // Pool definitions per modality
  const spatialPoolSize = gridSize * gridSize;
  const auditoryPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const colorPool = COLOR_PALETTE.slice(0, colorCount);
  const shapePool: ShapeType[] = [...SHAPES];

  // Generate independent modality sequences
  const positions = generateModalitySequence(stepCount, nLevel, targetMatchCount, spatialPoolSize, rng,
    (idx) => idx,                                          // indexToValue
    () => Math.floor(rng() * spatialPoolSize),             // randomValue
  );

  const letters = generateModalitySequence(stepCount, nLevel, targetMatchCount, auditoryPool.length, rng,
    (idx) => auditoryPool[idx],
    () => auditoryPool[Math.floor(rng() * auditoryPool.length)],
  );

  const colors = generateModalitySequence(stepCount, nLevel, targetMatchCount, colorPool.length, rng,
    (idx) => colorPool[idx],
    () => colorPool[Math.floor(rng() * colorPool.length)],
  );

  const shapes = generateModalitySequence(stepCount, nLevel, targetMatchCount, shapePool.length, rng,
    (idx) => shapePool[idx],
    () => shapePool[Math.floor(rng() * shapePool.length)],
  );

  // Combine into Stimulus[]
  const stimuli: Stimulus[] = [];
  for (let i = 0; i < stepCount; i++) {
    stimuli.push({
      position: positions[i] as number,
      letter: letters[i] as string,
      color: colors[i] as string,
      shape: shapes[i] as ShapeType,
    });
  }

  // Compute MatchFlags[]
  const matchFlags: MatchFlags[] = [];
  for (let i = 0; i < stepCount; i++) {
    if (i < nLevel) {
      matchFlags.push({ spatial: false, auditory: false, color: false, shape: false });
    } else {
      matchFlags.push({
        spatial: stimuli[i].position === stimuli[i - nLevel].position,
        auditory: stimuli[i].letter === stimuli[i - nLevel].letter,
        color: stimuli[i].color === stimuli[i - nLevel].color,
        shape: stimuli[i].shape === stimuli[i - nLevel].shape,
      });
    }
  }

  return { stimuli, matchFlags };
}

/**
 * Generate a single modality's value sequence with controlled match placement.
 *
 * @param stepCount   Total number of steps
 * @param nLevel      N-back level
 * @param targetMatches  Desired number of match steps
 * @param poolSize    Number of distinct values in this modality's pool
 * @param rng         Random number generator [0,1)
 * @param indexToValue  Convert a pool index to the modality's value type
 * @param randomValue   Generate a random value from the pool
 */
function generateModalitySequence<T>(
  stepCount: number,
  nLevel: number,
  targetMatches: number,
  poolSize: number,
  rng: () => number,
  indexToValue: (idx: number) => T,
  randomValue: () => T,
): T[] {
  // Determine which eligible steps (>= nLevel) will be matches
  const eligibleIndices: number[] = [];
  for (let i = nLevel; i < stepCount; i++) {
    eligibleIndices.push(i);
  }

  // Fisher-Yates shuffle of eligible indices, then take first targetMatches
  const shuffled = [...eligibleIndices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const matchCount = Math.min(targetMatches, eligibleIndices.length);
  const matchSteps = new Set(shuffled.slice(0, matchCount));

  // Build the sequence
  const values: T[] = new Array(stepCount);

  for (let i = 0; i < stepCount; i++) {
    if (i < nLevel) {
      // First N steps: just pick random
      values[i] = randomValue();
    } else if (matchSteps.has(i)) {
      // Match step: copy from i - nLevel
      values[i] = values[i - nLevel];
    } else {
      // Non-match step: pick a value that differs from i - nLevel
      if (poolSize <= 1) {
        // Can't differ with pool size 1 — fallback to same value
        values[i] = values[i - nLevel];
      } else {
        let candidate = randomValue();
        // Re-roll until we get something different
        while (candidate === values[i - nLevel]) {
          candidate = randomValue();
        }
        values[i] = candidate;
      }
    }
  }

  return values;
}
