import { Injectable } from '@angular/core';
import { ChromaclashConfig, DEFAULT_CONFIG, SpeedMode } from '../models/game.models';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'chromaclash-config';

  saveConfig(config: ChromaclashConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // quota exceeded or storage unavailable — silently ignore
    }
  }

  loadConfig(): ChromaclashConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };

      const parsed = JSON.parse(raw);

      const difficulty = clamp(Number(parsed.difficulty) || DEFAULT_CONFIG.difficulty, 1, 20);
      const trialCount = clamp(Number(parsed.trialCount) || DEFAULT_CONFIG.trialCount, 10, 50);
      const speedMode: SpeedMode = VALID_SPEED_MODES.includes(parsed.speedMode)
        ? parsed.speedMode
        : DEFAULT_CONFIG.speedMode;

      return { difficulty, trialCount, speedMode };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
