import { Injectable } from '@angular/core';
import {
  SlotConfig, DEFAULT_MATH_CONFIG, ProgressionSpeed,
  MathOperator, MinigameConfig, MINIGAME_REGISTRY,
  CometConfig, DEFAULT_COMET_CONFIG,
  MIN_GAP_SIZE, MAX_GAP_SIZE, DEFAULT_GAP_SIZE,
} from '../models/game.models';

const PREFIX = 'doitoo-multitask:';
const CONFIG_KEY = PREFIX + 'config';

export interface SavedConfig {
  slotConfigs: [SlotConfig, SlotConfig, SlotConfig];
  progressionSpeed: ProgressionSpeed;
  startingDifficulty: number;
}

const VALID_SPEEDS: ProgressionSpeed[] = ['slow', 'medium', 'fast'];
const VALID_OPS: MathOperator[] = ['+', '−', '×', '/'];

function defaultSaved(): SavedConfig {
  const first = MINIGAME_REGISTRY[0];
  const assigned: SlotConfig = { minigameId: first.id, config: { ...first.defaultConfig } };
  const empty: SlotConfig = { minigameId: null, config: { ...DEFAULT_MATH_CONFIG } };
  return {
    slotConfigs: [{ ...assigned }, { ...assigned }, { ...empty }],
    progressionSpeed: 'medium',
    startingDifficulty: 1,
  };
}

@Injectable({ providedIn: 'root' })
export class StorageService {

  load(): SavedConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return defaultSaved();
      const parsed = JSON.parse(raw);
      return this.validate(parsed);
    } catch {
      return defaultSaved();
    }
  }

  save(config: SavedConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch { /* quota exceeded */ }
  }

  private validate(raw: any): SavedConfig {
    const def = defaultSaved();
    if (!raw || typeof raw !== 'object') return def;

    const speed = VALID_SPEEDS.includes(raw.progressionSpeed) ? raw.progressionSpeed : def.progressionSpeed;
    const difficulty = typeof raw.startingDifficulty === 'number'
      ? Math.max(1, Math.min(100, raw.startingDifficulty)) : def.startingDifficulty;

    const slots = Array.isArray(raw.slotConfigs) && raw.slotConfigs.length === 3
      ? raw.slotConfigs.map((s: any, i: number) => this.validateSlot(s, i === 0))
      : def.slotConfigs;

    return {
      slotConfigs: slots as [SlotConfig, SlotConfig, SlotConfig],
      progressionSpeed: speed,
      startingDifficulty: difficulty,
    };
  }

  private validateSlot(raw: any, required: boolean): SlotConfig {
    if (!raw || typeof raw !== 'object') {
      return required
        ? { minigameId: MINIGAME_REGISTRY[0].id, config: { ...MINIGAME_REGISTRY[0].defaultConfig } }
        : { minigameId: null, config: { ...DEFAULT_MATH_CONFIG } };
    }

    const entry = MINIGAME_REGISTRY.find(m => m.id === raw.minigameId);
    const minigameId = entry ? raw.minigameId : (required ? MINIGAME_REGISTRY[0].id : null);

    return {
      minigameId,
      config: this.validateConfig(minigameId, raw.config),
    };
  }

  private validateConfig(minigameId: string | null, raw: any): MinigameConfig {
    switch (minigameId) {
      case 'comet': {
        const gapSize = typeof raw?.gapSize === 'number'
          && raw.gapSize >= MIN_GAP_SIZE
          && raw.gapSize <= MAX_GAP_SIZE
          ? raw.gapSize
          : DEFAULT_GAP_SIZE;
        return { gapSize } as CometConfig;
      }
      case 'math-equations':
      default: {
        const ops = Array.isArray(raw?.allowedOperators)
          ? raw.allowedOperators.filter((o: any) => VALID_OPS.includes(o))
          : ['+' as MathOperator];
        return { allowedOperators: ops.length > 0 ? ops : ['+'] };
      }
    }
  }
}
