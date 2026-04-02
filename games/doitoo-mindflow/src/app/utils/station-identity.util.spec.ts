import { describe, it, expect } from 'vitest';
import { generateStationIdentities } from './station-identity.util';
import { COLOR_PALETTE, SHAPE_TYPES } from '../models/game.models';

describe('generateStationIdentities', () => {
  const totalCombos = SHAPE_TYPES.length * COLOR_PALETTE.length; // 5 × 10 = 50

  it('should return the correct number of identities', () => {
    for (const count of [1, 2, 5, 10, 15, 20]) {
      const result = generateStationIdentities(count);
      expect(result.length).toBe(count);
    }
  });

  it('should return 0 identities for trainCount 0', () => {
    expect(generateStationIdentities(0).length).toBe(0);
  });

  it('should produce all unique shape+color pairs for counts up to 50', () => {
    for (const count of [2, 5, 10, 15, 20, 50]) {
      const result = generateStationIdentities(count);
      const keys = result.map(id => `${id.shapeType}:${id.color}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(count);
    }
  });

  it('should never produce duplicate identities for any count 2–20', () => {
    for (let count = 2; count <= 20; count++) {
      const result = generateStationIdentities(count);
      const keys = result.map(id => `${id.shapeType}:${id.color}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(count);
    }
  });

  it('should only use valid shape types', () => {
    const result = generateStationIdentities(20);
    for (const id of result) {
      expect(SHAPE_TYPES).toContain(id.shapeType);
    }
  });

  it('should only use valid colors from the palette', () => {
    const result = generateStationIdentities(20);
    for (const id of result) {
      expect(COLOR_PALETTE).toContain(id.color);
    }
  });

  it('should use the same shape for the first COLOR_PALETTE.length identities (all unique colors)', () => {
    const result = generateStationIdentities(COLOR_PALETTE.length);
    // First 10 are all the same shape (circle) with 10 different colors
    const shapes = result.map(id => id.shapeType);
    const uniqueShapes = new Set(shapes);
    expect(uniqueShapes.size).toBe(1);
    expect(shapes[0]).toBe(SHAPE_TYPES[0]);
  });

  it('should ensure no two stations share the same color for counts ≤ 10', () => {
    const result = generateStationIdentities(COLOR_PALETTE.length);
    const colors = result.map(id => id.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(COLOR_PALETTE.length);
  });

  it('should use all colors for each shape before moving to the next shape', () => {
    const result = generateStationIdentities(totalCombos);
    for (let s = 0; s < SHAPE_TYPES.length; s++) {
      const shapeIdentities = result.filter(id => id.shapeType === SHAPE_TYPES[s]);
      expect(shapeIdentities.length).toBe(COLOR_PALETTE.length);
      const colors = shapeIdentities.map(id => id.color);
      expect(new Set(colors).size).toBe(COLOR_PALETTE.length);
    }
  });

  it('should handle counts larger than total combos via fallback', () => {
    const result = generateStationIdentities(totalCombos + 3);
    // Fallback truncates to totalCombos when duplicates would occur
    expect(result.length).toBeGreaterThanOrEqual(totalCombos);
  });

  it('should produce deterministic results (same input = same output)', () => {
    const a = generateStationIdentities(15);
    const b = generateStationIdentities(15);
    expect(a).toEqual(b);
  });

  it('should not have any two stations with same color AND same shape for counts ≤ 50', () => {
    const result = generateStationIdentities(50);
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const same = result[i].shapeType === result[j].shapeType &&
                     result[i].color === result[j].color;
        expect(same).toBe(false);
      }
    }
  });
});

import { generateTrackLayout } from './track-generator.util';

describe('generateTrackLayout station identity uniqueness', () => {
  it('should produce unique station identities in the generated layout', () => {
    // Run multiple generations to catch intermittent issues
    for (let run = 0; run < 20; run++) {
      const result = generateTrackLayout({
        trainCount: 10,
        screenWidth: 800,
        screenHeight: 600,
        gridSize: { cols: 20, rows: 15 },
      });

      const layout = result.layout;
      const keys = layout.stations.map(
        s => `${s.identity.shapeType}:${s.identity.color}`
      );
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(layout.stations.length);
    }
  });

  it('should never have two stations with the same color for ≤10 stations', () => {
    for (let run = 0; run < 20; run++) {
      const result = generateTrackLayout({
        trainCount: 8,
        screenWidth: 800,
        screenHeight: 600,
        gridSize: { cols: 20, rows: 15 },
      });

      const colors = result.layout.stations.map(s => s.identity.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(result.layout.stations.length);
    }
  });
});
