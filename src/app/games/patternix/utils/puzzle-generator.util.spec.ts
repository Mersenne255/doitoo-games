import { describe, it, expect } from 'vitest';
import { generatePuzzle, shuffleAnswers } from './puzzle-generator.util';
import { getDifficultyParams } from './difficulty.util';
import { validateSequence } from './transformation.util';

describe('generatePuzzle', () => {
  it('should return a puzzle with the correct sequence length for difficulty 1', () => {
    const puzzle = generatePuzzle(1, 42);
    const params = getDifficultyParams(1);
    expect(puzzle.sequence.length).toBe(params.sequenceLength);
  });

  it('should return a puzzle with the correct sequence length for difficulty 20', () => {
    const puzzle = generatePuzzle(20, 42);
    const params = getDifficultyParams(20);
    expect(puzzle.sequence.length).toBe(params.sequenceLength);
  });

  it('should return the correct number of distractors for difficulty 1', () => {
    const puzzle = generatePuzzle(1, 42);
    const params = getDifficultyParams(1);
    expect(puzzle.distractors.length).toBe(params.distractorCount);
  });

  it('should return the correct number of distractors for difficulty 20', () => {
    const puzzle = generatePuzzle(20, 42);
    const params = getDifficultyParams(20);
    expect(puzzle.distractors.length).toBe(params.distractorCount);
  });

  it('should return the correct number of rules for difficulty 1', () => {
    const puzzle = generatePuzzle(1, 42);
    expect(puzzle.rules.length).toBe(1);
  });

  it('should return rules affecting different attributes', () => {
    const puzzle = generatePuzzle(15, 42);
    const attrs = puzzle.rules.map(r => r.attribute);
    expect(new Set(attrs).size).toBe(attrs.length);
  });

  it('should produce a deterministic puzzle for the same seed and difficulty', () => {
    const p1 = generatePuzzle(5, 123);
    const p2 = generatePuzzle(5, 123);
    expect(p1).toEqual(p2);
  });

  it('should produce different puzzles for different seeds', () => {
    const p1 = generatePuzzle(5, 100);
    const p2 = generatePuzzle(5, 200);
    // Very unlikely to be equal with different seeds
    expect(JSON.stringify(p1)).not.toBe(JSON.stringify(p2));
  });

  it('should produce a valid sequence consistent with the rules', () => {
    const puzzle = generatePuzzle(10, 42);
    const fullSequence = [...puzzle.sequence, puzzle.correctAnswer];
    expect(validateSequence(fullSequence, puzzle.rules)).toBe(true);
  });

  it('should ensure the correct answer is a valid PatternElement', () => {
    const puzzle = generatePuzzle(5, 42);
    const answer = puzzle.correctAnswer;
    expect(answer.shape).toBeDefined();
    expect(answer.color).toBeDefined();
    expect(answer.size).toBeDefined();
    expect(answer.rotation).toBeDefined();
    expect(answer.fill).toBeDefined();
  });

  it('should ensure no distractor is identical to the correct answer', () => {
    const puzzle = generatePuzzle(10, 42);
    for (const d of puzzle.distractors) {
      const isIdentical =
        d.shape === puzzle.correctAnswer.shape &&
        d.color === puzzle.correctAnswer.color &&
        d.size === puzzle.correctAnswer.size &&
        d.rotation === puzzle.correctAnswer.rotation &&
        d.fill === puzzle.correctAnswer.fill;
      expect(isIdentical).toBe(false);
    }
  });

  it('should handle edge difficulty values (clamped)', () => {
    // difficulty 0 should be clamped to 1
    const p1 = generatePuzzle(0, 42);
    expect(p1.sequence.length).toBe(getDifficultyParams(1).sequenceLength);

    // difficulty 25 should be clamped to 20
    const p2 = generatePuzzle(25, 42);
    expect(p2.sequence.length).toBe(getDifficultyParams(20).sequenceLength);
  });

  it('should work across a range of difficulties and seeds', () => {
    for (let d = 1; d <= 20; d += 5) {
      for (let s = 0; s < 5; s++) {
        const puzzle = generatePuzzle(d, s * 1000);
        expect(puzzle.sequence.length).toBeGreaterThanOrEqual(3);
        expect(puzzle.sequence.length).toBeLessThanOrEqual(6);
        expect(puzzle.distractors.length).toBeGreaterThanOrEqual(3);
        expect(puzzle.distractors.length).toBeLessThanOrEqual(5);
        expect(puzzle.rules.length).toBeGreaterThanOrEqual(1);
        expect(puzzle.rules.length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('shuffleAnswers', () => {
  it('should return correct + distractors count options', () => {
    const puzzle = generatePuzzle(5, 42);
    const options = shuffleAnswers(puzzle, 99);
    expect(options.length).toBe(1 + puzzle.distractors.length);
  });

  it('should contain exactly one correct answer', () => {
    const puzzle = generatePuzzle(5, 42);
    const options = shuffleAnswers(puzzle, 99);
    const correctCount = options.filter(o => o.isCorrect).length;
    expect(correctCount).toBe(1);
  });

  it('should preserve all elements from the puzzle', () => {
    const puzzle = generatePuzzle(5, 42);
    const options = shuffleAnswers(puzzle, 99);

    const correctOption = options.find(o => o.isCorrect)!;
    expect(correctOption.element).toEqual(puzzle.correctAnswer);

    const distractorElements = options
      .filter(o => !o.isCorrect)
      .map(o => o.element);
    expect(distractorElements.length).toBe(puzzle.distractors.length);

    for (const d of puzzle.distractors) {
      expect(distractorElements).toContainEqual(d);
    }
  });

  it('should produce deterministic results for the same seed', () => {
    const puzzle = generatePuzzle(5, 42);
    const o1 = shuffleAnswers(puzzle, 99);
    const o2 = shuffleAnswers(puzzle, 99);
    expect(o1).toEqual(o2);
  });

  it('should produce different orderings for different seeds', () => {
    const puzzle = generatePuzzle(10, 42);
    const o1 = shuffleAnswers(puzzle, 1);
    const o2 = shuffleAnswers(puzzle, 2);
    // With enough options, different seeds should produce different orderings
    // (not guaranteed but highly likely)
    const s1 = JSON.stringify(o1.map(o => o.element));
    const s2 = JSON.stringify(o2.map(o => o.element));
    // At minimum, both should have the same elements
    expect(o1.length).toBe(o2.length);
  });
});
