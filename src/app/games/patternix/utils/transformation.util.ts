import {
  PatternElement,
  TransformationRule,
} from '../models/game.models';

/**
 * Applies a single transformation rule at a given sequence index
 * and returns the expected attribute value.
 */
export function applyRule(rule: TransformationRule, index: number): string | number {
  switch (rule.type) {
    case 'cycle':
      return rule.values[index % rule.values.length];
    case 'progression':
      return rule.values[Math.min(index, rule.values.length - 1)];
    case 'alternation':
      return rule.values[index % 2];
    case 'constant':
      return rule.values[0];
  }
}

/**
 * Generates a PatternElement at a given sequence index by applying
 * all active transformation rules to a base element.
 */
export function generateElement(
  rules: TransformationRule[],
  index: number,
  baseElement: PatternElement,
): PatternElement {
  const element: PatternElement = { ...baseElement };
  for (const rule of rules) {
    (element as unknown as Record<string, string | number>)[rule.attribute] = applyRule(rule, index);
  }
  return element;
}

/**
 * Validates that every element in a sequence is consistent with
 * the given transformation rules.
 */
export function validateSequence(
  sequence: PatternElement[],
  rules: TransformationRule[],
): boolean {
  for (let i = 0; i < sequence.length; i++) {
    for (const rule of rules) {
      const expected = applyRule(rule, i);
      const actual = (sequence[i] as unknown as Record<string, string | number>)[rule.attribute];
      if (actual !== expected) {
        return false;
      }
    }
  }
  return true;
}
