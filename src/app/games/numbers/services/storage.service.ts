import { Injectable } from '@angular/core';
import { AllConfigs, GameMode } from '../models/game.models';

const GAME_ID = 'doitoo-numbers';
const PREFIX = GAME_ID + ':';
const CONFIGS_KEY = PREFIX + 'configs';
const MODE_KEY = PREFIX + 'mode';

const DEFAULT_CONFIGS: AllConfigs = {
  sequence: { numberLength: 8, timing: 1 },
  reverse:  { numberLength: 8, timing: 1 },
  complete: { numberLength: 8, timing: 2 },
};

const DEFAULT_MODE: GameMode = 'sequence';

@Injectable({ providedIn: 'root' })
export class StorageService {

  constructor() {
    // Migrate old unprefixed keys to namespaced keys
    this.migrateKeys();
  }

  private migrateKeys(): void {
    try {
      for (const oldKey of ['configs', 'mode']) {
        const raw = localStorage.getItem(oldKey);
        if (raw !== null && localStorage.getItem(PREFIX + oldKey) === null) {
          localStorage.setItem(PREFIX + oldKey, raw);
          localStorage.removeItem(oldKey);
        }
      }
    } catch { /* ignore */ }
  }

  loadConfigs(): AllConfigs {
    try {
      const raw = localStorage.getItem(CONFIGS_KEY);
      if (raw === null) return structuredClone(DEFAULT_CONFIGS);
      const parsed = JSON.parse(raw) as Partial<AllConfigs>;
      // merge with defaults so new modes always have values
      const configs: AllConfigs = {
        sequence: { ...DEFAULT_CONFIGS.sequence, ...parsed.sequence },
        reverse:  { ...DEFAULT_CONFIGS.reverse,  ...parsed.reverse },
        complete: { ...DEFAULT_CONFIGS.complete, ...parsed.complete },
      };
      // migrate old ms values to seconds (any timing >= 50 is likely ms)
      for (const key of Object.keys(configs) as GameMode[]) {
        if (configs[key].timing >= 50) {
          configs[key].timing = configs[key].timing / 1000;
        }
      }
      return configs;
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
