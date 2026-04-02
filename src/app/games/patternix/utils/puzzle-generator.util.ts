import {
  PatternElement,
  TransformationRule,
  TransformationType,
  TransformableAttribute,
  Puzzle,
  AnswerOption,
  SHAPE_TYPES,
  COLOR_PALETTE,
  ELEMENT_SIZES,
  ROTATIONS,
  FILL_PATTERNS,
} from '../models/game.models';
import { getDifficultyParams } from './difficulty.util';
import { generateElement } from './transformation.util';
import { generateDistractors, mulberry32 } from './distractor-generator.util';

const ALL_ATTRIBUTES: TransformableAttribute[] = ['shape', 'color', 'size', 'rotation', 'fill'];
const RULE_TYPES: TransformationType[] = ['cycle', 'progression', 'alternation', 'constant'];

/** Returns the domain (valid values) for a given transformable attribute. */
function getDomain(attribute: TransformableAttribute): readonly (string | number)[] {
  switch (attribute) {
    case 'shape': return SHAPE_TYPES;
    case 'color': return COLOR_PALETTE;
    case 'size': return ELEMENT_SIZES;
    case 'rotation': return ROTATIONS;
    case 'fill': return FILL_PATTERNS;
  }
}

/** Picks `count` random items from `arr` using the provided RNG (without replacement). */
function pickRandom<T>(arr: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/** Picks a single random item from `arr` using the provided RNG. */
function pickOne<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generates a TransformationRule for a given attribute using the seeded RNG.
 * The rule type is chosen randomly, and values are drawn from the attribute's domain.
 */
function generateRule(
  attribute: TransformableAttribute,
  sequenceLength: number,
  rng: () => number,
): TransformationRule {
  const domain = getDomain(attribute);
  const type = pickOne(RULE_TYPES, rng);

  let values: (string | number)[];

  switch (type) {
    case 'cycle': {
      // Pick 2–4 values from the domain
      const count = Math.min(2 + Math.floor(rng() * 3), domain.length);
      values = pickRandom(domain, count, rng) as (string | number)[];
      break;
    }
    case 'progression': {
      // Pick sequenceLength+1 ordered values from the domain
      const needed = Math.min(sequenceLength + 1, domain.length);
      const startMax = domain.length - needed;
      const startIdx = Math.floor(rng() * (startMax + 1));
      values = domain.slice(startIdx, startIdx + needed) as (string | number)[];
      break;
    }
    case 'alternation': {
      // Pick 2 values from the domain
      const picked = pickRandom(domain, 2, rng);
      values = picked as (string | number)[];
      break;
    }
    case 'constant': {
      // Pick 1 value from the domain
      values = [pickOne(domain, rng)] as (string | number)[];
      break;
    }
  }

  return { type, attribute, values };
}

/**
 * Generates a base PatternElement with random values for all attributes.
 */
function generateBaseElement(rng: () => number): PatternElement {
  return {
    shape: pickOne(SHAPE_TYPES, rng),
    color: pickOne(COLOR_PALETTE, rng),
    size: pickOne(ELEMENT_SIZES, rng),
    rotation: pickOne(ROTATIONS, rng),
    fill: pickOne(FILL_PATTERNS, rng),
  };
}

/**
 * Checks if all elements in a sequence are identical (degenerate).
 */
function isDegenerate(sequence: PatternElement[]): boolean {
  if (sequence.length <= 1) return false;
  const first = sequence[0];
  return sequence.every(
    el =>
      el.shape === first.shape &&
      el.color === first.color &&
      el.size === first.size &&
      el.rotation === first.rotation &&
      el.fill === first.fill,
  );
}

/**
 * Generates a complete Puzzle as a pure function.
 *
 * Algorithm:
 * 1. Use getDifficultyParams to get sequenceLength, ruleCount, distractorCount
 * 2. Create a seeded PRNG using mulberry32
 * 3. Generate ruleCount transformation rules (each affecting a different attribute)
 * 4. Generate a base element with random values for non-rule attributes
 * 5. Build the full sequence (sequenceLength + 1 elements; last is the correct answer)
 * 6. Generate distractors
 * 7. Retry with seed+1 if the sequence is degenerate (max 10 retries)
 */
export function generatePuzzle(difficulty: number, seed: number): Puzzle {
  const maxRetries = 10;

  for (let retry = 0; retry < maxRetries; retry++) {
    const currentSeed = seed + retry;
    const rng = mulberry32(currentSeed);
    const params = getDifficultyParams(difficulty);

    // Pick ruleCount unique attributes
    const attributes = pickRandom(ALL_ATTRIBUTES, params.ruleCount, rng);

    // Generate a rule for each attribute
    const rules = attributes.map(attr => generateRule(attr, params.sequenceLength, rng));

    // Generate a base element (values for non-rule attributes)
    const baseElement = generateBaseElement(rng);

    // Build the full sequence: sequenceLength visible + 1 answer
    const totalLength = params.sequenceLength + 1;
    const fullSequence: PatternElement[] = [];
    for (let i = 0; i < totalLength; i++) {
      fullSequence.push(generateElement(rules, i, baseElement));
    }

    // Check for degenerate sequence (all elements identical)
    if (isDegenerate(fullSequence)) {
      continue; // retry with next seed
    }

    const sequence = fullSequence.slice(0, params.sequenceLength);
    const correctAnswer = fullSequence[params.sequenceLength];

    // Generate distractors
    const distractors = generateDistractors(
      correctAnswer,
      rules,
      params.distractorCount,
      currentSeed,
    );

    return { sequence, correctAnswer, distractors, rules };
  }

  // Fallback after max retries: use the last attempt regardless
  const rng = mulberry32(seed + maxRetries);
  const params = getDifficultyParams(difficulty);
  const attributes = pickRandom(ALL_ATTRIBUTES, params.ruleCount, rng);
  const rules = attributes.map(attr => generateRule(attr, params.sequenceLength, rng));
  const baseElement = generateBaseElement(rng);

  const totalLength = params.sequenceLength + 1;
  const fullSequence: PatternElement[] = [];
  for (let i = 0; i < totalLength; i++) {
    fullSequence.push(generateElement(rules, i, baseElement));
  }

  const sequence = fullSequence.slice(0, params.sequenceLength);
  const correctAnswer = fullSequence[params.sequenceLength];
  const distractors = generateDistractors(correctAnswer, rules, params.distractorCount, seed + maxRetries);

  return { sequence, correctAnswer, distractors, rules };
}

/**
 * Creates a shuffled array of AnswerOptions from the correct answer + distractors.
 * Uses a seeded PRNG for deterministic shuffling.
 */
export function shuffleAnswers(puzzle: Puzzle, seed: number): AnswerOption[] {
  const options: AnswerOption[] = [
    { element: puzzle.correctAnswer, isCorrect: true },
    ...puzzle.distractors.map(d => ({ element: d, isCorrect: false })),
  ];

  // Fisher-Yates shuffle with seeded RNG
  const rng = mulberry32(seed);
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}
