import { CellContent, PatternRule, Puzzle } from '../models/game.models';
import { checkAllRulesSatisfied } from './rule-engine.util';

/**
 * Counts how many options satisfy all rules when placed at position [2,2].
 */
export function countValidOptions(
  options: CellContent[],
  rules: PatternRule[],
  grid: CellContent[][],
): number {
  let count = 0;
  for (const option of options) {
    const testGrid = grid.map((row, r) =>
      row.map((cell, c) => (r === 2 && c === 2 ? option : cell)),
    );
    if (checkAllRulesSatisfied(rules, testGrid)) {
      count++;
    }
  }
  return count;
}

/**
 * Returns true if exactly one option in the puzzle satisfies all active rules
 * when placed at position [2,2].
 */
export function validatePuzzle(puzzle: Puzzle): boolean {
  return countValidOptions(puzzle.options, puzzle.rules, puzzle.grid) === 1;
}
