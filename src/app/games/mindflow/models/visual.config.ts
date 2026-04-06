/** Visual size configuration for all MindFlow board elements */
export const VISUAL_CONFIG = {

  /** Connecting lines between nodes */
  paths: {
    color: 'rgba(255, 255, 255, 0.7)',
    lineWidth: 2.5,
  },

  /** Station (destination) nodes */
  station: {
    glowRadius: 0,
    glowLineWidth: 0,
    glowAlpha: 0.25,
    shapeSize: 20,
    /** Per-shape-type size overrides for station outlines */
    shapeSizeByType: {
      circle: 20,
      square: 18,
      triangle: 22,
      diamond: 20,
      hexagon: 20,
    } as Record<string, number>,
    outlineWidth: 4,
  },

  /** Spawn point nodes */
  spawnPoint: {
    outerRadius: 20,
    outerLineWidth: 4,
    outerColor: 'rgba(255, 255, 255, 1)',
    innerRadius: 8,
    innerColor: 'rgba(255, 255, 255, 1)',
  },

  /** Junction / switch nodes */
  junction: {
    circleRadius: 24,
    circleColor: '#ffffff',
    hitRadius: 28,
    /** Arrow (chevron) inside the junction */
    arrow: {
      color: '#000000',
      tipExtent: 0.92,      // front tip distance as fraction of radius
      backExtent: 0.88,     // rear points distance as fraction of radius
      backWidth: 0.58,      // rear points half-width as fraction of radius
      notchDepth: 0.30,     // V-notch center as fraction of radius
    },
    /** Small dot indicators for inactive paths */
    indicator: {
      radius: 4,
      color: 'rgba(0, 0, 0, 1)',
    },
  },

  /** Active shapes moving along paths */
  activeShape: {
    size: 14,
    /** Per-shape-type size overrides for active (moving) shapes */
    sizeByType: {
      circle: 14,
      square: 12,
      triangle: 18,
      diamond: 16,
      hexagon: 14,
    } as Record<string, number>,
  },

  /** Delivery feedback ring animation */
  feedback: {
    startRadius: 20,
    expandBy: 30,
    lineWidth: 3,
    duration: undefined as number | undefined, // uses FeedbackAnimation.duration
    correctColor: 'rgba(34, 197, 94, {alpha})',
    incorrectColor: 'rgba(239, 68, 68, {alpha})',
  },
} as const;
