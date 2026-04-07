import { describe, it, expect } from 'vitest';
import { validatePuzzle, countValidOptions } from './puzzle-validator.util';
import { CellContent, PatternRule, Puzzle } from '../models/game.models';
import { applyRule, inferMissingCell, createEmptyCell } from './rule-engine.util';

// ── Helpers ──

function makeCell(shape: string, color: string): CellContent {
  return {
    layers: [{
      shape: shape as any,
      size: 'medium',
      rotation: 0,
      fill: 'solid',
      color: color as any,
    }],
  };
}

function buildGridFromRule(rule: PatternRule): CellContent[][] {
  const emptyGrid: CellContent[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => createEmptyCell(1)),
  );
  return applyRule(rule, emptyGrid);
}

// ── Tests ──

describe('puzzle-validator.util', () => {
  describe('countValidOptions', () => {
    it('should return 1 when only the correct answer satisfies all rules', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'color',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['red', 'blue', 'green'] },
      };

      const grid = buildGridFromRule(rule);
      const correctAnswer = grid[2][2];

      const wrongOption1 = makeCell('circle', 'red');
      const wrongOption2 = makeCell('circle', 'blue');

      const options = [wrongOption1, correctAnswer, wrongOption2];

      expect(countValidOptions(options, [rule], grid)).toBe(1);
    });

    it('should return 0 when no option satisfies all rules', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'color',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['red', 'blue', 'green'] },
      };

      const grid = buildGridFromRule(rule);

      const options = [
        makeCell('circle', 'red'),
        makeCell('circle', 'blue'),
        makeCell('circle', 'yellow'),
      ];

      expect(countValidOptions(options, [rule], grid)).toBe(0);
    });

    it('should return >1 when multiple options satisfy all rules', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'color',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['red', 'blue', 'green'] },
      };

      const grid = buildGridFromRule(rule);
      const correctAnswer = grid[2][2];

      // Another cell that also has green color — satisfies the constant color rule
      const alsoValid = makeCell('square', 'green');

      const options = [correctAnswer, alsoValid, makeCell('circle', 'red')];

      expect(countValidOptions(options, [rule], grid)).toBe(2);
    });
  });

  describe('validatePuzzle', () => {
    it('should return true when exactly one option is valid', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'shape',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['circle', 'square', 'triangle'] },
      };

      const grid = buildGridFromRule(rule);
      const correctAnswer = grid[2][2];

      const options = [
        makeCell('circle', 'red'),
        correctAnswer,
        makeCell('square', 'red'),
        makeCell('diamond', 'red'),
      ];

      const puzzle: Puzzle = {
        grid,
        correctAnswer,
        correctIndex: 1,
        options,
        rules: [rule],
        seed: 42,
      };

      expect(validatePuzzle(puzzle)).toBe(true);
    });

    it('should return false when no option is valid', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'shape',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['circle', 'square', 'triangle'] },
      };

      const grid = buildGridFromRule(rule);

      const options = [
        makeCell('diamond', 'red'),
        makeCell('hexagon', 'red'),
        makeCell('star', 'red'),
      ];

      const puzzle: Puzzle = {
        grid,
        correctAnswer: grid[2][2],
        correctIndex: -1,
        options,
        rules: [rule],
        seed: 42,
      };

      expect(validatePuzzle(puzzle)).toBe(false);
    });

    it('should return false when multiple options are valid', () => {
      const rule: PatternRule = {
        type: 'constant',
        dimension: 'color',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['red', 'blue', 'green'] },
      };

      const grid = buildGridFromRule(rule);
      const correctAnswer = grid[2][2];

      // Both have green color, so both satisfy the single rule
      const alsoValid = makeCell('square', 'green');

      const options = [correctAnswer, alsoValid, makeCell('circle', 'red')];

      const puzzle: Puzzle = {
        grid,
        correctAnswer,
        correctIndex: 0,
        options,
        rules: [rule],
        seed: 42,
      };

      expect(validatePuzzle(puzzle)).toBe(false);
    });

    it('should work with multiple rules', () => {
      const colorRule: PatternRule = {
        type: 'constant',
        dimension: 'color',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['red', 'blue', 'green'] },
      };

      const shapeRule: PatternRule = {
        type: 'constant',
        dimension: 'shape',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'constant', values: ['circle', 'square', 'triangle'] },
      };

      let grid = buildGridFromRule(colorRule);
      grid = applyRule(shapeRule, grid);

      const correctAnswer = grid[2][2]; // triangle + green

      // Satisfies color but not shape
      const wrongShape = makeCell('circle', 'green');
      // Satisfies shape but not color
      const wrongColor = makeCell('triangle', 'red');
      // Satisfies neither
      const wrongBoth = makeCell('diamond', 'yellow');

      const options = [wrongShape, correctAnswer, wrongColor, wrongBoth];

      const puzzle: Puzzle = {
        grid,
        correctAnswer,
        correctIndex: 1,
        options,
        rules: [colorRule, shapeRule],
        seed: 42,
      };

      expect(validatePuzzle(puzzle)).toBe(true);
    });

    it('should work with progression rules', () => {
      const rule: PatternRule = {
        type: 'progression',
        dimension: 'size',
        direction: 'row-wise',
        layerIndex: 0,
        params: { kind: 'progression', sequence: ['small', 'medium', 'large'] },
      };

      const grid = buildGridFromRule(rule);
      const correctAnswer = grid[2][2]; // large

      const options = [
        makeCell('circle', 'red'), // size=medium (default from makeCell)
        correctAnswer,
        makeCell('circle', 'red'),
      ];
      // Override sizes for wrong options
      options[0].layers[0].size = 'small';
      options[2].layers[0].size = 'medium';

      const puzzle: Puzzle = {
        grid,
        correctAnswer,
        correctIndex: 1,
        options,
        rules: [rule],
        seed: 42,
      };

      expect(validatePuzzle(puzzle)).toBe(true);
    });
  });
});
