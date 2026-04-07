import { describe, it, expect } from 'vitest';
import { generateRound } from './card-generator.util';
import { mapDifficultyToParams } from './difficulty.util';
import { SHAPE_NAMES, COLOR_NAMES, ConflictType } from '../models/game.models';

describe('generateRound', () => {
  it('should be deterministic — same inputs produce same output', () => {
    const params = mapDifficultyToParams(1);
    const a = generateRound(25, params, 42);
    const b = generateRound(25, params, 42);
    expect(a).toEqual(b);
  });

  it('should generate the correct number of sort attempts', () => {
    const params = mapDifficultyToParams(1);
    const round = generateRound(25, params, 123);
    expect(round.sortAttempts.length).toBe(25);
  });

  it('should generate 3 piles for beginner difficulty', () => {
    const params = mapDifficultyToParams(1);
    const round = generateRound(25, params, 99);
    expect(round.piles.length).toBe(3);
  });

  it('should generate 4 piles for intermediate difficulty', () => {
    const params = mapDifficultyToParams(6);
    const round = generateRound(25, params, 99);
    expect(round.piles.length).toBe(4);
  });

  it('should have unique shapes, colors, and counts for 3-pile reference cards', () => {
    const params = mapDifficultyToParams(1);
    const round = generateRound(25, params, 42);
    const shapes = round.piles.map(p => p.referenceCard.shape);
    const colors = round.piles.map(p => p.referenceCard.color);
    const counts = round.piles.map(p => p.referenceCard.count);
    expect(new Set(shapes).size).toBe(3);
    expect(new Set(colors).size).toBe(3);
    expect(new Set(counts).size).toBe(3);
  });

  it('should have unique shapes, colors, and counts for 4-pile reference cards', () => {
    const params = mapDifficultyToParams(10);
    const round = generateRound(25, params, 42);
    const shapes = round.piles.map(p => p.referenceCard.shape);
    const colors = round.piles.map(p => p.referenceCard.color);
    const counts = round.piles.map(p => p.referenceCard.count);
    expect(new Set(shapes).size).toBe(4);
    expect(new Set(colors).size).toBe(4);
    expect(new Set(counts).size).toBe(4);
  });

  it('should have all card attributes from valid sets', () => {
    const params = mapDifficultyToParams(5);
    const round = generateRound(25, params, 77);
    for (const attempt of round.sortAttempts) {
      expect(SHAPE_NAMES).toContain(attempt.card.shape);
      expect(COLOR_NAMES).toContain(attempt.card.color);
      expect(attempt.card.count).toBeGreaterThanOrEqual(1);
      expect(attempt.card.count).toBeLessThanOrEqual(4);
    }
  });

  it('should have exactly one correct pile under the active rule for each card', () => {
    const params = mapDifficultyToParams(3);
    const round = generateRound(25, params, 42);
    let cumulative = 0;
    let schedIdx = 0;

    for (let i = 0; i < round.sortAttempts.length; i++) {
      // Advance schedule index based on cumulative thresholds
      while (schedIdx < round.ruleSchedule.length - 1 &&
             i >= cumulative + round.ruleSchedule[schedIdx].switchThreshold) {
        cumulative += round.ruleSchedule[schedIdx].switchThreshold;
        schedIdx++;
      }

      const activeRule = round.ruleSchedule[schedIdx].rule;
      const correctPile = round.sortAttempts[i].correctPileByRule[activeRule];
      expect(correctPile).toBeGreaterThanOrEqual(0);
      expect(correctPile).toBeLessThan(round.piles.length);
    }
  });

  it('should have no consecutive same rules in the schedule', () => {
    const params = mapDifficultyToParams(10);
    const round = generateRound(30, params, 42);
    for (let i = 1; i < round.ruleSchedule.length; i++) {
      // With multiple enabled rules, no consecutive repeats
      if (params.enabledRules.length > 1) {
        expect(round.ruleSchedule[i].rule).not.toBe(round.ruleSchedule[i - 1].rule);
      }
    }
  });

  it('should have switch thresholds within configured range', () => {
    const params = mapDifficultyToParams(5);
    const round = generateRound(25, params, 42);
    for (const entry of round.ruleSchedule) {
      expect(entry.switchThreshold).toBeGreaterThanOrEqual(params.switchThresholdMin);
      expect(entry.switchThreshold).toBeLessThanOrEqual(params.switchThresholdMax);
    }
  });

  it('should mark post-switch cards after rule switch boundaries', () => {
    const params = mapDifficultyToParams(3);
    const round = generateRound(25, params, 42);
    let cumulative = 0;
    for (let i = 0; i < round.ruleSchedule.length - 1; i++) {
      cumulative += round.ruleSchedule[i].switchThreshold;
      if (cumulative < round.sortAttempts.length) {
        // At least the card at the boundary should be marked isPostSwitch
        expect(round.sortAttempts[cumulative].isPostSwitch).toBe(true);
      }
    }
  });

  it('should generate ≥30% ambiguous cards at high distractor quality', () => {
    const params = mapDifficultyToParams(13); // advanced tier, high distractor quality
    const round = generateRound(25, params, 42);
    const ambiguousCount = round.sortAttempts.filter(a => a.isAmbiguous).length;
    expect(ambiguousCount / round.sortAttempts.length).toBeGreaterThanOrEqual(0.3);
  });

  it('should have compound rules with exactly 2 attributes', () => {
    const params = mapDifficultyToParams(15); // advanced tier with compound rules
    const round = generateRound(30, params, 42);
    for (const entry of round.ruleSchedule) {
      if (entry.rule === 'compound') {
        expect(entry.compoundRule).toBeDefined();
        expect(entry.compoundRule!.attributes.length).toBe(2);
      }
    }
  });

  it('should produce a JSON-serializable round structure', () => {
    const params = mapDifficultyToParams(5);
    const round = generateRound(25, params, 42);
    const json = JSON.stringify(round);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(round);
  });
});
