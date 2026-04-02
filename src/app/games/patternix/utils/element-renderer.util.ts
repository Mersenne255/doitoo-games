import { ElementSize, FillPattern, PatternElement, ShapeType } from '../models/game.models';

// ── ShapeSvgData interface ──

export interface ShapeSvgData {
  path: string;
  size: number;
  color: string;
  rotation: number;
  fillStyle: { fill: string; stroke?: string; patternId?: string };
  viewBox: string;
}

// ── Size mapping ──

const SIZE_MAP: Record<ElementSize, number> = {
  small: 30,
  medium: 45,
  large: 60,
};

export function getSizePixels(size: ElementSize): number {
  return SIZE_MAP[size];
}

// ── Shape path generation (centered at origin) ──

export function getShapePath(shape: ShapeType, size: number): string {
  const half = size / 2;

  switch (shape) {
    case 'circle':
      // Represented as a circle element; path approximation using two arcs
      return `M ${-half},0 A ${half},${half} 0 1,0 ${half},0 A ${half},${half} 0 1,0 ${-half},0 Z`;

    case 'square':
      return `M ${-half},${-half} L ${half},${-half} L ${half},${half} L ${-half},${half} Z`;

    case 'triangle': {
      // Equilateral triangle pointing up, centered at origin
      const h = (Math.sqrt(3) / 2) * size;
      const topY = -h * (2 / 3);
      const bottomY = h * (1 / 3);
      return `M 0,${topY} L ${half},${bottomY} L ${-half},${bottomY} Z`;
    }

    case 'diamond':
      return `M 0,${-half} L ${half},0 L 0,${half} L ${-half},0 Z`;

    case 'hexagon': {
      // Regular hexagon centered at origin
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = half * Math.cos(angle);
        const y = half * Math.sin(angle);
        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      return `M ${points[0]} L ${points[1]} L ${points[2]} L ${points[3]} L ${points[4]} L ${points[5]} Z`;
    }

    case 'star': {
      // 5-pointed star centered at origin
      const outerR = half;
      const innerR = half * 0.4;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      return `M ${points[0]} L ${points[1]} L ${points[2]} L ${points[3]} L ${points[4]} L ${points[5]} L ${points[6]} L ${points[7]} L ${points[8]} L ${points[9]} Z`;
    }
  }
}


// ── Fill style ──

export function getFillStyle(fill: FillPattern, color: string): { fill: string; stroke?: string; patternId?: string } {
  const colorHex = color.slice(1); // strip '#'

  switch (fill) {
    case 'solid':
      return { fill: color };
    case 'empty':
      return { fill: 'none', stroke: color };
    case 'striped':
      return { fill: `url(#stripes-${colorHex})`, patternId: `stripes-${colorHex}` };
    case 'dotted':
      return { fill: `url(#dots-${colorHex})`, patternId: `dots-${colorHex}` };
  }
}

// ── Combined SVG data ──

export function getShapeSvgData(element: PatternElement): ShapeSvgData {
  const size = getSizePixels(element.size);
  const path = getShapePath(element.shape, size);
  const fillStyle = getFillStyle(element.fill, element.color);
  const margin = 4;
  const viewSize = size + margin * 2;

  return {
    path,
    size,
    color: element.color,
    rotation: element.rotation,
    fillStyle,
    viewBox: `${-viewSize / 2} ${-viewSize / 2} ${viewSize} ${viewSize}`,
  };
}
