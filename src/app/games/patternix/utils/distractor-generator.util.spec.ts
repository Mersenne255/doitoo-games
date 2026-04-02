import { describe, it, expect } from 'vitest';
import { generateDistractors, mulberry32 } from './distractor-generator.util';
import {
  PatternElement,
  TransformationRule,
  SHAPE_TYPES,
  COLOR_PALETTE,
  ELEMENT_SIZES,
  ROTATIONS,
  FILL_PATTERNS,
} from '../models/game.models';

const baseElement: PatternElement = {
  shape: 'circle',
  color: '#ef4444',
  size: 'small',
  rotation: 0,
  fill: 'solid',
};

function elementsEqual(a: PatternElement, b: PatternElement): boolean {
  return (
    a.shape === b.shape &&
    a.color === b.color &&
    a.size === b.size &&
    a.rotation === b.rotation &&
    a.fill === b.fill
  );
}

// ── mulberry32 ──

describe('mulberry32', () => {
  it('should produce deterministic output for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('should produce values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

// ── generateDistractors ──

describe('generateDistractors', () => {
  const singleRule: TransformationRule[] = [
    { type: 'cycle', attribute: 'shape', values: ['circle', 'square', 'triangle'] },
  ];

  const multiRules: TransformationRule[] = [
    { type: 'cycle', attribute: 'shape', values: ['circle', 'square', 'triangle'] },
    { type: 'alternation', attribute: 'color', values: ['#ef4444', '#3b82f6'] },
  ];

  it('should return the requested number of distractors', () => {
    const result = generateDistractors(baseElement, singleRule, 3, 42);
    expect(result).toHaveLength(3);
  });

  it('should return no distractors when count is 0', () => {
    const result = generateDistractors(baseElement, singleRule, 0, 42);
    expect(result).toHaveLength(0);
  });

  it('should produce distractors that differ from the correct answer', () => {
    const result = generateDistractors(baseElement, singleRule, 3, 42);
    for (const d of result) {
      expect(elementsEqual(d, baseElement)).toBe(false);
    }
  });

  it('should produce unique distractors (no duplicates)', () => {
    const result = generateDistractors(baseElement, multiRules, 5, 99);
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(elementsEqual(result[i], result[j])).toBe(false);
      }
    }
  });

  it('should only mutate attributes governed by active rules', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'shape', values: ['circle', 'square'] },
    ];
    const result = generateDistractors(baseElement, rules, 3, 42);
    for (const d of result) {
      // Non-rule attributes must remain unchanged
      expect(d.color).toBe(baseElement.color);
      expect(d.size).toBe(baseElement.size);
      expect(d.rotation).toBe(baseElement.rotation);
      expect(d.fill).toBe(baseElement.fill);
      // The rule attribute must differ
      expect(d.shape).not.toBe(baseElement.shape);
    }
  });

  it('should produce deterministic output for the same seed', () => {
    const r1 = generateDistractors(baseElement, multiRules, 4, 777);
    const r2 = generateDistractors(baseElement, multiRules, 4, 777);
    expect(r1).toEqual(r2);
  });

  it('should produce different output for different seeds', () => {
    const r1 = generateDistractors(baseElement, multiRules, 4, 1);
    const r2 = generateDistractors(baseElement, multiRules, 4, 2);
    // At least one distractor should differ
    const allSame = r1.every((d, i) => elementsEqual(d, r2[i]));
    expect(allSame).toBe(false);
  });

  it('should handle multiple rule attributes correctly', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'color', values: ['#ef4444', '#3b82f6', '#22c55e'] },
      { type: 'progression', attribute: 'size', values: ['small', 'medium', 'large'] },
      { type: 'constant', attribute: 'rotation', values: [90] },
    ];
    const answer: PatternElement = {
      shape: 'circle',
      color: '#ef4444',
      size: 'medium',
      rotation: 90,
      fill: 'solid',
    };
    const result = generateDistractors(answer, rules, 5, 42);
    expect(result.length).toBeGreaterThan(0);
    for (const d of result) {
      expect(elementsEqual(d, answer)).toBe(false);
      // At least one rule-governed attribute must differ
      const differsInRuleAttr =
        d.color !== answer.color ||
        d.size !== answer.size ||
        d.rotation !== answer.rotation;
      expect(differsInRuleAttr).toBe(true);
    }
  });

  it('should handle edge case where domain has limited alternatives', () => {
    // Size only has 3 values, so with 'small' as correct, only 2 alternatives exist
    const rules: TransformationRule[] = [
      { type: 'progression', attribute: 'size', values: ['small', 'medium', 'large'] },
    ];
    const result = generateDistractors(baseElement, rules, 2, 42);
    expect(result).toHaveLength(2);
    for (const d of result) {
      expect(d.size).not.toBe(baseElement.size);
    }
  });
});
