import { Injectable } from '@angular/core';
import {
  MatrixIQConfig,
  DEFAULT_CONFIG,
  SpeedMode,
  DebugOverrides,
  RULE_TYPES,
  DIMENSIONS,
  RuleType,
  PatternDimension,
  RuleDirection,
} from '../models/game.models';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];
const VALID_RULE_TYPES: readonly string[] = RULE_TYPES;
const VALID_DIMENSIONS: readonly string[] = DIMENSIONS;
const VALID_DIRECTIONS: string[] = ['row-wise', 'column-wise'];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'matrixiq-config';

  saveConfig(config: MatrixIQConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // silently ignore
    }
  }

  loadConfig(): MatrixIQConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return {
        difficulty: clamp(Number(parsed.difficulty) || DEFAULT_CONFIG.difficulty, 1, 100),
        puzzleCount: clamp(Number(parsed.puzzleCount) || DEFAULT_CONFIG.puzzleCount, 5, 30),
        speedMode: VALID_SPEED_MODES.includes(parsed.speedMode) ? parsed.speedMode : DEFAULT_CONFIG.speedMode,
        debugOverrides: parseDebugOverrides(parsed.debugOverrides),
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function parseDebugOverrides(raw: unknown): DebugOverrides | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result: DebugOverrides = {
    ruleType: VALID_RULE_TYPES.includes(obj['ruleType'] as string) ? obj['ruleType'] as RuleType : null,
    dimension: VALID_DIMENSIONS.includes(obj['dimension'] as string) ? obj['dimension'] as PatternDimension : null,
    direction: VALID_DIRECTIONS.includes(obj['direction'] as string) ? obj['direction'] as RuleDirection : null,
    ruleCount: typeof obj['ruleCount'] === 'number' && obj['ruleCount'] >= 1 && obj['ruleCount'] <= 6
      ? obj['ruleCount'] as number : null,
  };
  const hasAny = result.ruleType || result.dimension || result.direction || result.ruleCount;
  return hasAny ? result : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
