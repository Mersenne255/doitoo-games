import { BaseSpeed, DEFAULT_CONFIG, MindFlowConfig } from '../models/game.models';

const VALID_SPEEDS: BaseSpeed[] = ['slow', 'medium', 'fast'];

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

function clampDecimal(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return Math.round(clamped / step) * step;
}

export function validateConfig(partial: Partial<MindFlowConfig>): MindFlowConfig {
  return {
    destinations: clampInt(partial.destinations ?? DEFAULT_CONFIG.destinations, 2, 20),
    runners: clampInt(partial.runners ?? DEFAULT_CONFIG.runners, 5, 100),
    baseSpeed: VALID_SPEEDS.includes(partial.baseSpeed as BaseSpeed)
      ? (partial.baseSpeed as BaseSpeed)
      : DEFAULT_CONFIG.baseSpeed,
    spawnInterval: clampDecimal(partial.spawnInterval ?? DEFAULT_CONFIG.spawnInterval, 1, 5, 0.1),
  };
}
