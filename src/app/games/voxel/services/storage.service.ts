import { Injectable } from '@angular/core';
import { DEFAULT_CONFIG, SpeedMode, VoxelConfig } from '../models/game.models';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];
const VALID_TRIAL_COUNTS = [5, 10, 15, 20];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'voxel-config';

  saveConfig(config: VoxelConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // quota exceeded or storage unavailable — silently ignore
    }
  }

  loadConfig(): VoxelConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };

      const parsed = JSON.parse(raw);

      const difficulty = clamp(Number(parsed.difficulty) || DEFAULT_CONFIG.difficulty, 1, 100);
      const trialCount = clampStep(Number(parsed.trialCount) || DEFAULT_CONFIG.trialCount, 5, 20, 5);
      const speedMode: SpeedMode = VALID_SPEED_MODES.includes(parsed.speedMode)
        ? parsed.speedMode
        : DEFAULT_CONFIG.speedMode;
      const multiColorMode = Boolean(parsed.multiColorMode);

      return { difficulty, trialCount, speedMode, multiColorMode };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampStep(value: number, min: number, max: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, rounded));
}
