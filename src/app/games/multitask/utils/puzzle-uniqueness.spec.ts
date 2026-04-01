import { describe, it, assert } from 'vitest';
import { generatePuzzle, isAnswerCard } from './puzzle-generator.util';
import { ShapeCard } from '../models/game.models';

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALL_KEYS: (keyof ShapeCard)[] = ['shape', 'shapeColor', 'borderColor', 'innerLetter'];
const RUNS = 1000;

// Threshold levels at each tier boundary
const LEVELS = [1, 11, 12, 22, 23, 33, 34, 50, 51, 66, 67, 100];

function allowedKeys(d: number): (keyof ShapeCard)[] {
  if (d <= 11) return ['shape', 'shapeColor'];
  if (d <= 22) return ['shape', 'shapeColor', 'borderColor'];
  if (d <= 33) return ALL_KEYS;
  if (d <= 50) return ['shape', 'shapeColor', 'borderColor'];
  return ALL_KEYS;
}

function expectedCount(d: number): number {
  if (d <= 11) return 2;
  if (d <= 22) return 3;
  if (d <= 33) return 4;
  if (d <= 50) return 3;
  return 4;
}

describe('Puzzle uniqueness: exactly one answer (1000 runs per level)', () => {
  it('threshold levels: every puzzle has exactly one answer card', () => {
    for (const d of LEVELS) {
      for (let s = 0; s < RUNS; s++) {
        const puzzle = generatePuzzle(d, seededRng(s * 7919 + d));
        const answers = puzzle.cards.filter(c => isAnswerCard(c, puzzle.cards, puzzle.activeKeys));
        assert.equal(answers.length, 1, `diff=${d} seed=${s}: got ${answers.length} answers`);
        assert.equal(puzzle.cards.indexOf(answers[0]), puzzle.answerIndex, `diff=${d} seed=${s}: index mismatch`);
      }
    }
  });
});

describe('Active keys match allowed pool per difficulty tier', () => {
  it('threshold levels: active keys are within the allowed set', () => {
    for (const d of LEVELS) {
      const allowed = allowedKeys(d);
      const count = expectedCount(d);
      for (let s = 0; s < RUNS; s++) {
        const puzzle = generatePuzzle(d, seededRng(s * 7919 + d));
        assert.equal(puzzle.activeKeys.length, count, `diff=${d} seed=${s}: expected ${count} keys, got ${puzzle.activeKeys.length}`);
        for (const key of puzzle.activeKeys) {
          assert.ok(allowed.includes(key), `diff=${d} seed=${s}: '${key}' not in [${allowed}]`);
        }
      }
    }
  });
});
