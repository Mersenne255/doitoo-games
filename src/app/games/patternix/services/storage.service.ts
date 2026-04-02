import { Injectable } from '@angular/core';
import { PatternixConfig, DEFAULT_CONFIG } from '../models/game.models';
import { validateConfig } from '../utils/difficulty.util';

const CONFIG_KEY = 'patternix_config';

@Injectable({ providedIn: 'root' })
export class StorageService {

  loadConfig(): PatternixConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw === null) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return validateConfig(parsed);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: PatternixConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch { /* quota exceeded */ }
  }
}
