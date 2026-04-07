import { describe, it, expect } from 'vitest';
import {
  shapePathData, getLayerTransform, getLayerSvg, getFillAttr, SIZE_SCALE,
} from '../../utils/cell-render.util';
import { ShapeLayer } from '../../models/game.models';

describe('CellRendererComponent helpers', () => {
  const solidRedCircle: ShapeLayer = {
    shape: 'circle', size: 'medium', rotation: 0, fill: 'solid', color: 'red',
  };

  const emptyBlueSquare: ShapeLayer = {
    shape: 'square', size: 'large', rotation: 45, fill: 'empty', color: 'blue',
  };

  const instanceId = 'test01';

  it('should produce SVG with fill for solid shapes', () => {
    const svg = getLayerSvg(solidRedCircle, instanceId, 0);
    expect(svg).toContain('fill="#ef4444"');
    expect(svg).toContain('stroke="#ef4444"');
    expect(svg).toContain('<circle');
  });

  it('should produce SVG with no fill for empty shapes', () => {
    const svg = getLayerSvg(emptyBlueSquare, instanceId, 0);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="#3b82f6"');
    expect(svg).toContain('stroke-width="3"');
  });

  it('should produce striped fill using pattern URL', () => {
    const layer: ShapeLayer = { ...solidRedCircle, fill: 'striped' };
    const svg = getLayerSvg(layer, instanceId, 2);
    expect(svg).toContain(`url(#stripe-${instanceId}-2)`);
  });

  it('should produce dotted fill using pattern URL', () => {
    const layer: ShapeLayer = { ...solidRedCircle, fill: 'dotted' };
    const svg = getLayerSvg(layer, instanceId, 1);
    expect(svg).toContain(`url(#dot-${instanceId}-1)`);
  });

  it('should generate correct transform for single layer', () => {
    const transform = getLayerTransform(solidRedCircle, 0, 1);
    expect(transform).toContain('scale(0.7)');
    expect(transform).toContain('translate(50, 50)');
    expect(transform).toContain('rotate(0, 50, 50)');
  });

  it('should offset layers when multiple exist', () => {
    const t0 = getLayerTransform(solidRedCircle, 0, 2);
    const t1 = getLayerTransform(solidRedCircle, 1, 2);
    expect(t0).toContain('translate(47.5, 47.5)');
    expect(t1).toContain('translate(52.5, 52.5)');
  });

  it('should apply rotation in transform', () => {
    const transform = getLayerTransform(emptyBlueSquare, 0, 1);
    expect(transform).toContain('rotate(45, 50, 50)');
    expect(transform).toContain('scale(0.9)');
  });

  it('should render all 10 shape types without error', () => {
    const shapes = [
      'circle', 'square', 'triangle', 'diamond', 'pentagon',
      'hexagon', 'star', 'cross', 'arrow', 'heart',
    ] as const;
    for (const shape of shapes) {
      const svg = shapePathData(shape);
      expect(svg.length).toBeGreaterThan(0);
    }
  });

  it('cross shape should contain two rect elements', () => {
    const layer: ShapeLayer = { ...solidRedCircle, shape: 'cross' };
    const svg = getLayerSvg(layer, instanceId, 0);
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(2);
  });

  it('heart shape should contain a path element', () => {
    const layer: ShapeLayer = { ...solidRedCircle, shape: 'heart' };
    const svg = getLayerSvg(layer, instanceId, 0);
    expect(svg).toContain('<path');
  });

  it('should use small scale factor of 0.5', () => {
    const layer: ShapeLayer = { ...solidRedCircle, size: 'small' };
    const transform = getLayerTransform(layer, 0, 1);
    expect(transform).toContain('scale(0.5)');
  });

  it('getFillAttr returns correct values for all fill types', () => {
    expect(getFillAttr('solid', 'red', instanceId, 0)).toBe('#ef4444');
    expect(getFillAttr('empty', 'red', instanceId, 0)).toBe('none');
    expect(getFillAttr('striped', 'red', instanceId, 3)).toBe(`url(#stripe-${instanceId}-3)`);
    expect(getFillAttr('dotted', 'blue', instanceId, 1)).toBe(`url(#dot-${instanceId}-1)`);
  });
});
