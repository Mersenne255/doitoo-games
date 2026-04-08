import { Injectable } from '@angular/core';
import { CiphergridConfig, DEFAULT_CONFIG, SpeedMode } from '../models/game.models';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'ciphergrid-config';

  saveConfig(config: CiphergridConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // quota exceeded or storage unavailable — silently ignore
    }
  }

  loadConfig(): CiphergridConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };

      const parsed = JSON.parse(raw);

      const difficulty = clamp(Number(parsed.difficulty) || DEFAULT_CONFIG.difficulty, 1, 20);
      const puzzleCount = clamp(Number(parsed.puzzleCount) || DEFAULT_CONFIG.puzzleCount, 3, 15);
      const speedMode: SpeedMode = VALID_SPEED_MODES.includes(parsed.speedMode)
        ? parsed.speedMode
        : DEFAULT_CONFIG.speedMode;

      return { difficulty, puzzleCount, speedMode };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
