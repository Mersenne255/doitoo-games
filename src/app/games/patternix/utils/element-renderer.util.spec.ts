import { describe, it, expect } from 'vitest';
import { PatternElement } from '../models/game.models';
import {
  getFillStyle,
  getShapePath,
  getShapeSvgData,
  getSizePixels,
  ShapeSvgData,
} from './element-renderer.util';

describe('element-renderer.util', () => {
  describe('getSizePixels', () => {
    it('should return 30 for small', () => {
      expect(getSizePixels('small')).toBe(30);
    });

    it('should return 45 for medium', () => {
      expect(getSizePixels('medium')).toBe(45);
    });

    it('should return 60 for large', () => {
      expect(getSizePixels('large')).toBe(60);
    });
  });

  describe('getShapePath', () => {
    it('should return a closed path string for circle', () => {
      const path = getShapePath('circle', 30);
      expect(path).toContain('A');
      expect(path).toContain('Z');
    });

    it('should return a closed path string for square', () => {
      const path = getShapePath('square', 30);
      expect(path).toContain('M');
      expect(path).toContain('Z');
      // Square corners at ±15
      expect(path).toContain('-15');
      expect(path).toContain('15');
    });

    it('should return a closed path string for triangle', () => {
      const path = getShapePath('triangle', 30);
      expect(path).toContain('M');
      expect(path).toContain('Z');
    });

    it('should return a closed path string for diamond', () => {
      const path = getShapePath('diamond', 30);
      expect(path).toContain('M 0,-15');
      expect(path).toContain('Z');
    });

    it('should return a closed path string for hexagon', () => {
      const path = getShapePath('hexagon', 30);
      expect(path).toContain('M');
      expect(path).toContain('Z');
    });

    it('should return a closed path string for star', () => {
      const path = getShapePath('star', 30);
      expect(path).toContain('M');
      expect(path).toContain('Z');
    });

    it('should scale paths with size', () => {
      const smallPath = getShapePath('square', 30);
      const largePath = getShapePath('square', 60);
      // Large square has corners at ±30, small at ±15
      expect(largePath).toContain('-30');
      expect(smallPath).not.toContain('-30');
    });
  });

  describe('getFillStyle', () => {
    it('should return solid fill with color', () => {
      const result = getFillStyle('solid', '#ef4444');
      expect(result).toEqual({ fill: '#ef4444' });
    });

    it('should return empty fill with stroke', () => {
      const result = getFillStyle('empty', '#3b82f6');
      expect(result).toEqual({ fill: 'none', stroke: '#3b82f6' });
    });

    it('should return striped fill with pattern reference', () => {
      const result = getFillStyle('striped', '#22c55e');
      expect(result.fill).toBe('url(#stripes-22c55e)');
      expect(result.patternId).toBe('stripes-22c55e');
    });

    it('should return dotted fill with pattern reference', () => {
      const result = getFillStyle('dotted', '#eab308');
      expect(result.fill).toBe('url(#dots-eab308)');
      expect(result.patternId).toBe('dots-eab308');
    });
  });

  describe('getShapeSvgData', () => {
    const element: PatternElement = {
      shape: 'circle',
      color: '#ef4444',
      size: 'medium',
      rotation: 90,
      fill: 'solid',
    };

    it('should return correct size for the element', () => {
      const data: ShapeSvgData = getShapeSvgData(element);
      expect(data.size).toBe(45);
    });

    it('should return the element color', () => {
      const data = getShapeSvgData(element);
      expect(data.color).toBe('#ef4444');
    });

    it('should return the element rotation', () => {
      const data = getShapeSvgData(element);
      expect(data.rotation).toBe(90);
    });

    it('should return a valid path string', () => {
      const data = getShapeSvgData(element);
      expect(data.path).toBeTruthy();
      expect(data.path).toContain('Z');
    });

    it('should return a viewBox string', () => {
      const data = getShapeSvgData(element);
      expect(data.viewBox).toBeTruthy();
      expect(data.viewBox).toContain(' ');
    });

    it('should return correct fillStyle for solid fill', () => {
      const data = getShapeSvgData(element);
      expect(data.fillStyle).toEqual({ fill: '#ef4444' });
    });

    it('should handle striped fill with patternId', () => {
      const stripedElement: PatternElement = { ...element, fill: 'striped' };
      const data = getShapeSvgData(stripedElement);
      expect(data.fillStyle.patternId).toBe('stripes-ef4444');
    });
  });
});
