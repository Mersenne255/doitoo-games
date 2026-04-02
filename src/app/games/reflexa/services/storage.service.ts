import { Injectable } from '@angular/core';
import { ReflexaConfig, DEFAULT_CONFIG } from '../models/game.models';

const STORAGE_KEY = 'reflexa_config';

/** Clamp config values to valid ranges. */
export function validateConfig(config: Partial<ReflexaConfig>): ReflexaConfig {
  return {
    difficulty: Math.round(Math.min(20, Math.max(1, config.difficulty ?? DEFAULT_CONFIG.difficulty))),
    trialCount: Math.round(Math.min(100, Math.max(10, config.trialCount ?? DEFAULT_CONFIG.trialCount))),
  };
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  saveConfig(config: ReflexaConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // quota exceeded or storage unavailable — silently fail
    }
  }

  loadConfig(): ReflexaConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return validateConfig(parsed);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}
