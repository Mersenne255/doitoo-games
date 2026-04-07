import { ShapeLayer, ShapeSize, ShapeFill, ShapeColor, ShapeType, COLOR_HEX } from '../models/game.models';

export const SIZE_SCALE: Record<ShapeSize, number> = {
  small: 0.5,
  medium: 0.7,
  large: 0.9,
};

export function regularPolygon(sides: number, cx: number, cy: number, r: number, startAngle: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (startAngle + (360 / sides) * i) * (Math.PI / 180);
    pts.push(`${Math.round(cx + r * Math.cos(angle))},${Math.round(cy + r * Math.sin(angle))}`);
  }
  return pts.join(' ');
}

export function pentagonPoints(): string {
  return regularPolygon(5, 50, 50, 40, -90);
}

export function hexagonPoints(): string {
  return regularPolygon(6, 50, 50, 40, -90);
}

export function starPoints(): string {
  const cx = 50, cy = 50, outer = 40, inner = 16;
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (-90 + 72 * i) * (Math.PI / 180);
    pts.push(`${Math.round(cx + outer * Math.cos(outerAngle))},${Math.round(cy + outer * Math.sin(outerAngle))}`);
    const innerAngle = (-90 + 72 * i + 36) * (Math.PI / 180);
    pts.push(`${Math.round(cx + inner * Math.cos(innerAngle))},${Math.round(cy + inner * Math.sin(innerAngle))}`);
  }
  return pts.join(' ');
}

export function shapePathData(shape: ShapeType): string {
  switch (shape) {
    case 'circle':
      return '<circle cx="50" cy="50" r="40"/>';
    case 'square':
      return '<rect x="10" y="10" width="80" height="80"/>';
    case 'triangle':
      return '<polygon points="50,10 90,90 10,90"/>';
    case 'diamond':
      return '<polygon points="50,10 90,50 50,90 10,50"/>';
    case 'pentagon':
      return `<polygon points="${pentagonPoints()}"/>`;
    case 'hexagon':
      return `<polygon points="${hexagonPoints()}"/>`;
    case 'star':
      return `<polygon points="${starPoints()}"/>`;
    case 'cross':
      return '<rect x="35" y="10" width="30" height="80"/><rect x="10" y="35" width="80" height="30"/>';
    case 'arrow':
      return '<polygon points="50,10 80,50 60,50 60,90 40,90 40,50 20,50"/>';
    case 'heart':
      return '<path d="M50,85 C20,65 5,45 15,30 C25,15 40,15 50,30 C60,15 75,15 85,30 C95,45 80,65 50,85Z"/>';
  }
}

/**
 * Grid positions for laying out multiple shapes within a cell.
 * Each shape gets its own quadrant/position so they don't overlap.
 */
const GRID_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 50], [70, 50]],
  3: [[50, 25], [25, 70], [75, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
};

export function getLayerTransform(layer: ShapeLayer, index: number, total: number): string {
  const positions = GRID_POSITIONS[total] ?? GRID_POSITIONS[1];
  const [cx, cy] = positions[index] ?? [50, 50];

  // Scale down shapes when there are multiple so they fit
  let scale: number;
  if (total === 1) {
    scale = SIZE_SCALE[layer.size];
  } else {
    // Smaller shapes for multi-count cells
    const baseScale = total <= 2 ? 0.42 : 0.32;
    scale = baseScale;
  }

  return `translate(${cx}, ${cy}) scale(${scale}) translate(-50, -50) rotate(${layer.rotation}, 50, 50)`;
}

export function getFillAttr(fill: ShapeFill, color: ShapeColor, instanceId: string, index: number): string {
  switch (fill) {
    case 'solid':
      return COLOR_HEX[color];
    case 'empty':
      return 'none';
    case 'striped':
      return `url(#stripe-${instanceId}-${index})`;
    case 'dotted':
      return `url(#dot-${instanceId}-${index})`;
  }
}

export function getLayerSvg(layer: ShapeLayer, instanceId: string, index: number): string {
  const fill = getFillAttr(layer.fill, layer.color, instanceId, index);
  const stroke = COLOR_HEX[layer.color];
  const strokeWidth = layer.fill === 'empty' ? '3' : '1.5';
  const raw = shapePathData(layer.shape);
  return raw.replace(/<(circle|rect|polygon|path|line)\b/g,
    `<$1 fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"`);
}
