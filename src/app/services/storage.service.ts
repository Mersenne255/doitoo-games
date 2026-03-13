import { Injectable } from '@angular/core';
import { AllConfigs, GameMode } from '../models/game.models';

const CONFIGS_KEY = 'configs';
const MODE_KEY = 'mode';

const DEFAULT_CONFIGS: AllConfigs = {
  sequence: { numberLength: 8, timing: 1000 },
  reverse:  { numberLength: 8, timing: 1000 },
  complete: { numberLength: 8, timing: 2000 },
};

const DEFAULT_MODE: GameMode = 'sequence';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadConfigs(): AllConfigs {
    try {
      const raw = localStorage.getItem(CONFIGS_KEY);
      if (raw === null) return structuredClone(DEFAULT_CONFIGS);
      const parsed = JSON.parse(raw) as Partial<AllConfigs>;
      // merge with defaults so new modes always have values
      return {
        sequence: { ...DEFAULT_CONFIGS.sequence, ...parsed.sequence },
        reverse:  { ...DEFAULT_CONFIGS.reverse,  ...parsed.reverse },
        complete: { ...DEFAULT_CONFIGS.complete, ...parsed.complete },
      };
    } catch {
      return structuredClone(DEFAULT_CONFIGS);
    }
  }

  saveConfigs(configs: AllConfigs): void {
    try {
      localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
    } catch { /* quota exceeded */ }
  }

  loadMode(): GameMode {
    try {
      const raw = localStorage.getItem(MODE_KEY);
      if (raw === null) return DEFAULT_MODE;
      return JSON.parse(raw) as GameMode;
    } catch {
      return DEFAULT_MODE;
    }
  }

  saveMode(mode: GameMode): void {
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify(mode));
    } catch { /* ignore */ }
  }
}
