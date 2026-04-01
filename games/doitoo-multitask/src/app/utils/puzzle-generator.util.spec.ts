import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fc from 'fast-check';
import {
  generatePuzzle,
  isAnswerCard,
  findAnswerCard,
} from '../utils/puzzle-generator.util';
import {
  cardCountForDifficulty,
  timeLimitForDifficulty,
} from '../models/game.models';

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('Property 1: Puzzle uniqueness', () => {
  it('exactly one card passes isAnswerCard for any difficulty', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      (difficulty, seed) => {
        const puzzle = generatePuzzle(difficulty, seededRng(seed));
        const count = puzzle.cards.filter(c => isAnswerCard(c, puzzle.cards)).length;
        assert.equal(count, 1, `Expected 1 answer card at difficulty ${difficulty}, got ${count}`);
      }
    ), { numRuns: 100 });
  });
});

describe('Property 2: Answer verification idempotence', () => {
  it('findAnswerCard returns same index and matches puzzle.answerIndex', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      (difficulty, seed) => {
        const puzzle = generatePuzzle(difficulty, seededRng(seed));
        const first = findAnswerCard(puzzle.cards);
        const second = findAnswerCard(puzzle.cards);
        assert.equal(first, second);
        assert.equal(first, puzzle.answerIndex);
      }
    ), { numRuns: 100 });
  });
});

describe('Property 3: Order independence', () => {
  it('findAnswerCard identifies same physical card after shuffling', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      (difficulty, puzzleSeed, shuffleSeed) => {
        const puzzle = generatePuzzle(difficulty, seededRng(puzzleSeed));
        const original = puzzle.cards[puzzle.answerIndex];
        const shuffled = shuffleArray(puzzle.cards, seededRng(shuffleSeed));
        const idx = findAnswerCard(shuffled);
        assert.ok(idx >= 0);
        assert.strictEqual(shuffled[idx], original);
      }
    ), { numRuns: 100 });
  });
});

describe('Property 4: Card count matches difficulty tier', () => {
  it('correct card count per tier', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      (difficulty, seed) => {
        const expected = difficulty <= 33 ? 3 : difficulty <= 66 ? 4 : 5;
        assert.equal(cardCountForDifficulty(difficulty), expected);
        const puzzle = generatePuzzle(difficulty, seededRng(seed));
        assert.equal(puzzle.cards.length, expected);
      }
    ), { numRuns: 100 });
  });
});

describe('Property 5: Timer monotonically decreases', () => {
  it('timer(d1) >= timer(d2) when d1 < d2', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 99 }),
      fc.integer({ min: 1, max: 99 }),
      (d1, offset) => {
        const d2 = Math.min(d1 + offset, 100);
        if (d2 <= d1) return;
        const t1 = timeLimitForDifficulty(d1);
        const t2 = timeLimitForDifficulty(d2);
        assert.ok(t1 >= t2);
        assert.ok(t1 >= 10 && t1 <= 20);
        assert.ok(t2 >= 10 && t2 <= 20);
      }
    ), { numRuns: 100 });
  });
});

describe('Property 6: Generator always produces valid puzzle', () => {
  it('no throw, valid structure', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 2 ** 31 - 1 }),
      (difficulty, seed) => {
        const puzzle = generatePuzzle(difficulty, seededRng(seed));
        assert.ok(puzzle.cards.length >= 3 && puzzle.cards.length <= 5);
        assert.ok(puzzle.answerIndex >= 0 && puzzle.answerIndex < puzzle.cards.length);
      }
    ), { numRuns: 100 });
  });
});
