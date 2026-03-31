import {
  DEFAULT_CONFIG,
  ModalityType,
  NBackConfig,
  INTENSITY_OPTIONS,
} from '../models/game.models';

const VALID_MODALITIES: ModalityType[] = ['spatial', 'auditory', 'color', 'shape'];

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round a number to the nearest 0.5. */
function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Merge a partial config with DEFAULT_CONFIG, then clamp all fields
 * to valid ranges and enforce minimum 2 active modalities.
 */
export function validateConfig(partial: Partial<NBackConfig>): NBackConfig {
  const merged = { ...DEFAULT_CONFIG, ...partial };

  const gridSize = Math.round(clamp(merged.gridSize, 2, 5));
  const stepCount = Math.round(clamp(merged.stepCount, 5, 1000));
  const nLevel = Math.round(clamp(merged.nLevel, 1, Math.min(20, stepCount)));
  const stepDuration = roundToHalf(clamp(merged.stepDuration, 1, 10));
  const colorCount = Math.round(clamp(merged.colorCount, 2, 10));

  const intensity = INTENSITY_OPTIONS.includes(merged.intensity as number)
    ? (merged.intensity as number)
    : 30;

  // Filter to valid modalities and remove duplicates
  const seen = new Set<ModalityType>();
  const activeModalities: ModalityType[] = [];
  for (const m of (merged.activeModalities ?? [])) {
    if (VALID_MODALITIES.includes(m as ModalityType) && !seen.has(m as ModalityType)) {
      seen.add(m as ModalityType);
      activeModalities.push(m as ModalityType);
    }
  }

  return {
    gridSize,
    nLevel,
    stepDuration,
    colorCount,
    stepCount,
    intensity,
    activeModalities: activeModalities.length >= 1
      ? activeModalities
      : [...DEFAULT_CONFIG.activeModalities],
  };
}
