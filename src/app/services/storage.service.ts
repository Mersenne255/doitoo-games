import { Injectable } from '@angular/core';
import { Config, GameMode } from '../models/game.models';

const CONFIG_KEY = 'config';
const MODE_KEY = 'mode';

const DEFAULT_CONFIG: Config = {
  numberLength: 8,
  interval: 1000,
  duration: 2000,
};

const DEFAULT_MODE: GameMode = 'sequence';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadConfig(): Config {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw === null) {
        return { ...DEFAULT_CONFIG };
      }
      return JSON.parse(raw) as Config;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: Config): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      // silently ignore save errors (e.g. quota exceeded)
    }
  }

  loadMode(): GameMode {
    try {
      const raw = localStorage.getItem(MODE_KEY);
      if (raw === null) {
        return DEFAULT_MODE;
      }
      return JSON.parse(raw) as GameMode;
    } catch {
      return DEFAULT_MODE;
    }
  }

  saveMode(mode: GameMode): void {
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify(mode));
    } catch {
      // silently ignore save errors
    }
  }
}
