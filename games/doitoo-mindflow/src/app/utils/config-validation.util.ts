import { BaseSpeed, DEFAULT_CONFIG, MindFlowConfig } from '../models/game.models';

const VALID_SPEEDS: BaseSpeed[] = ['slow', 'medium', 'fast'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function validateConfig(partial: Partial<MindFlowConfig>): MindFlowConfig {
  return {
    trainCount: clamp(partial.trainCount ?? DEFAULT_CONFIG.trainCount, 2, 20),
    shapeCount: clamp(partial.shapeCount ?? DEFAULT_CONFIG.shapeCount, 5, 100),
    baseSpeed: VALID_SPEEDS.includes(partial.baseSpeed as BaseSpeed)
      ? (partial.baseSpeed as BaseSpeed)
      : DEFAULT_CONFIG.baseSpeed,
    spawnInterval: clamp(partial.spawnInterval ?? DEFAULT_CONFIG.spawnInterval, 1, 10),
  };
}
