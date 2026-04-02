import {
  PatternElement,
  TransformationRule,
  TransformableAttribute,
  SHAPE_TYPES,
  COLOR_PALETTE,
  ELEMENT_SIZES,
  ROTATIONS,
  FILL_PATTERNS,
} from '../models/game.models';

/**
 * Simple seeded PRNG (mulberry32).
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

/** Shapes that look the same regardless of rotation. */
const ROTATION_INVARIANT_SHAPES: Set<string> = new Set(['circle']);

/** Checks whether two PatternElements are identical across all attributes. */
function elementsEqual(a: PatternElement, b: PatternElement): boolean {
  return (
    a.shape === b.shape &&
    a.color === b.color &&
    a.size === b.size &&
    a.rotation === b.rotation &&
    a.fill === b.fill
  );
}

/** Checks whether two PatternElements look the same visually (ignoring rotation for symmetric shapes). */
function visuallyEqual(a: PatternElement, b: PatternElement): boolean {
  if (a.shape !== b.shape || a.color !== b.color || a.size !== b.size || a.fill !== b.fill) {
    return false;
  }
  // For rotation-invariant shapes, rotation doesn't matter visually
  if (ROTATION_INVARIANT_SHAPES.has(a.shape)) {
    return true;
  }
  return a.rotation === b.rotation;
}

/**
 * Generates `count` distractors that are plausible but wrong.
 *
 * Each distractor differs from the correct answer in at least one attribute
 * governed by an active transformation rule. No distractor is identical to
 * the correct answer, and no two distractors are identical to each other.
 */
export function generateDistractors(
  correctAnswer: PatternElement,
  rules: TransformationRule[],
  count: number,
  seed: number,
): PatternElement[] {
  const rng = mulberry32(seed);
  const ruleAttributes = rules.map(r => r.attribute);
  const distractors: PatternElement[] = [];
  let attempts = 0;
  const maxAttempts = count * 50;

  while (distractors.length < count && attempts < maxAttempts) {
    attempts++;

    // Pick a random rule-governed attribute to mutate
    const attr = ruleAttributes[Math.floor(rng() * ruleAttributes.length)];
    const domain = getDomain(attr);
    const currentValue = (correctAnswer as unknown as Record<string, string | number>)[attr];

    // Pick a different valid value from the domain
    const alternatives = domain.filter(v => v !== currentValue);
    if (alternatives.length === 0) continue;

    const newValue = alternatives[Math.floor(rng() * alternatives.length)];

    const distractor: PatternElement = {
      ...correctAnswer,
      [attr]: newValue,
    };

    // Ensure uniqueness: not visually equal to correct answer and not a visual duplicate
    if (
      !visuallyEqual(distractor, correctAnswer) &&
      !distractors.some(d => visuallyEqual(d, distractor))
    ) {
      distractors.push(distractor);
    }
  }

  return distractors;
}
