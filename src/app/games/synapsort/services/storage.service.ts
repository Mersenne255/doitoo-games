import { Injectable } from '@angular/core';
import { SynapSortConfig, DEFAULT_CONFIG, SpeedMode } from '../models/game.models';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'synapsort-config';

  saveConfig(config: SynapSortConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // silently ignore
    }
  }

  loadConfig(): SynapSortConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return {
        difficulty: clamp(Math.round(Number(parsed.difficulty)) || DEFAULT_CONFIG.difficulty, 1, 20),
        cardCount: roundToStep(clamp(Number(parsed.cardCount) || DEFAULT_CONFIG.cardCount, 15, 40), 5),
        speedMode: VALID_SPEED_MODES.includes(parsed.speedMode) ? parsed.speedMode : DEFAULT_CONFIG.speedMode,
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}
