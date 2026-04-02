import { describe, it, expect } from 'vitest';
import { applyRule, generateElement, validateSequence } from './transformation.util';
import {
  PatternElement,
  TransformationRule,
} from '../models/game.models';

// ── Helpers ──

const baseElement: PatternElement = {
  shape: 'circle',
  color: '#ef4444',
  size: 'small',
  rotation: 0,
  fill: 'solid',
};

// ── applyRule ──

describe('applyRule', () => {
  describe('cycle', () => {
    const rule: TransformationRule = {
      type: 'cycle',
      attribute: 'color',
      values: ['#ef4444', '#3b82f6', '#22c55e'],
    };

    it('should return values cycling through the array', () => {
      expect(applyRule(rule, 0)).toBe('#ef4444');
      expect(applyRule(rule, 1)).toBe('#3b82f6');
      expect(applyRule(rule, 2)).toBe('#22c55e');
      expect(applyRule(rule, 3)).toBe('#ef4444');
      expect(applyRule(rule, 4)).toBe('#3b82f6');
      expect(applyRule(rule, 5)).toBe('#22c55e');
    });

    it('should handle single-value cycle', () => {
      const single: TransformationRule = { type: 'cycle', attribute: 'shape', values: ['star'] };
      expect(applyRule(single, 0)).toBe('star');
      expect(applyRule(single, 5)).toBe('star');
    });
  });

  describe('progression', () => {
    const rule: TransformationRule = {
      type: 'progression',
      attribute: 'size',
      values: ['small', 'medium', 'large'],
    };

    it('should return values progressing through the array', () => {
      expect(applyRule(rule, 0)).toBe('small');
      expect(applyRule(rule, 1)).toBe('medium');
      expect(applyRule(rule, 2)).toBe('large');
    });

    it('should clamp to the last value when index exceeds array length', () => {
      expect(applyRule(rule, 3)).toBe('large');
      expect(applyRule(rule, 10)).toBe('large');
    });

    it('should handle single-value progression', () => {
      const single: TransformationRule = { type: 'progression', attribute: 'fill', values: ['dotted'] };
      expect(applyRule(single, 0)).toBe('dotted');
      expect(applyRule(single, 5)).toBe('dotted');
    });
  });

  describe('alternation', () => {
    const rule: TransformationRule = {
      type: 'alternation',
      attribute: 'fill',
      values: ['solid', 'striped'],
    };

    it('should toggle between two values', () => {
      expect(applyRule(rule, 0)).toBe('solid');
      expect(applyRule(rule, 1)).toBe('striped');
      expect(applyRule(rule, 2)).toBe('solid');
      expect(applyRule(rule, 3)).toBe('striped');
    });
  });

  describe('constant', () => {
    const rule: TransformationRule = {
      type: 'constant',
      attribute: 'rotation',
      values: [90],
    };

    it('should always return the same value regardless of index', () => {
      expect(applyRule(rule, 0)).toBe(90);
      expect(applyRule(rule, 1)).toBe(90);
      expect(applyRule(rule, 5)).toBe(90);
      expect(applyRule(rule, 100)).toBe(90);
    });
  });
});


// ── generateElement ──

describe('generateElement', () => {
  it('should return a copy of baseElement when no rules are provided', () => {
    const result = generateElement([], 0, baseElement);
    expect(result).toEqual(baseElement);
    expect(result).not.toBe(baseElement); // must be a new object
  });

  it('should apply a single rule to the base element', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'shape', values: ['square', 'triangle', 'diamond'] },
    ];
    const el0 = generateElement(rules, 0, baseElement);
    expect(el0.shape).toBe('square');
    expect(el0.color).toBe(baseElement.color); // unchanged

    const el1 = generateElement(rules, 1, baseElement);
    expect(el1.shape).toBe('triangle');
  });

  it('should apply multiple rules simultaneously', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'color', values: ['#ef4444', '#3b82f6'] },
      { type: 'progression', attribute: 'size', values: ['small', 'medium', 'large'] },
      { type: 'constant', attribute: 'rotation', values: [180] },
    ];

    const el0 = generateElement(rules, 0, baseElement);
    expect(el0.color).toBe('#ef4444');
    expect(el0.size).toBe('small');
    expect(el0.rotation).toBe(180);
    expect(el0.shape).toBe('circle'); // unchanged
    expect(el0.fill).toBe('solid');   // unchanged

    const el2 = generateElement(rules, 2, baseElement);
    expect(el2.color).toBe('#ef4444'); // cycle wraps: 2 % 2 = 0
    expect(el2.size).toBe('large');
    expect(el2.rotation).toBe(180);
  });

  it('should not mutate the base element', () => {
    const original = { ...baseElement };
    const rules: TransformationRule[] = [
      { type: 'constant', attribute: 'shape', values: ['star'] },
    ];
    generateElement(rules, 0, baseElement);
    expect(baseElement).toEqual(original);
  });
});

// ── validateSequence ──

describe('validateSequence', () => {
  it('should return true for an empty sequence', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'color', values: ['#ef4444'] },
    ];
    expect(validateSequence([], rules)).toBe(true);
  });

  it('should return true for a sequence with no rules', () => {
    const sequence: PatternElement[] = [baseElement, baseElement];
    expect(validateSequence(sequence, [])).toBe(true);
  });

  it('should return true for a valid sequence with a cycle rule', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'shape', values: ['circle', 'square', 'triangle'] },
    ];
    const sequence: PatternElement[] = [
      { ...baseElement, shape: 'circle' },
      { ...baseElement, shape: 'square' },
      { ...baseElement, shape: 'triangle' },
      { ...baseElement, shape: 'circle' },
    ];
    expect(validateSequence(sequence, rules)).toBe(true);
  });

  it('should return false when a sequence element violates a rule', () => {
    const rules: TransformationRule[] = [
      { type: 'cycle', attribute: 'shape', values: ['circle', 'square', 'triangle'] },
    ];
    const sequence: PatternElement[] = [
      { ...baseElement, shape: 'circle' },
      { ...baseElement, shape: 'square' },
      { ...baseElement, shape: 'diamond' }, // should be 'triangle'
    ];
    expect(validateSequence(sequence, rules)).toBe(false);
  });

  it('should validate a sequence with multiple rules', () => {
    const rules: TransformationRule[] = [
      { type: 'alternation', attribute: 'fill', values: ['solid', 'striped'] },
      { type: 'constant', attribute: 'color', values: ['#22c55e'] },
    ];
    const valid: PatternElement[] = [
      { ...baseElement, fill: 'solid', color: '#22c55e' },
      { ...baseElement, fill: 'striped', color: '#22c55e' },
      { ...baseElement, fill: 'solid', color: '#22c55e' },
    ];
    expect(validateSequence(valid, rules)).toBe(true);

    const invalid: PatternElement[] = [
      { ...baseElement, fill: 'solid', color: '#22c55e' },
      { ...baseElement, fill: 'striped', color: '#ef4444' }, // wrong color
    ];
    expect(validateSequence(invalid, rules)).toBe(false);
  });

  it('should validate a progression rule that clamps at the end', () => {
    const rules: TransformationRule[] = [
      { type: 'progression', attribute: 'size', values: ['small', 'medium', 'large'] },
    ];
    const sequence: PatternElement[] = [
      { ...baseElement, size: 'small' },
      { ...baseElement, size: 'medium' },
      { ...baseElement, size: 'large' },
      { ...baseElement, size: 'large' }, // clamped
    ];
    expect(validateSequence(sequence, rules)).toBe(true);
  });
});
