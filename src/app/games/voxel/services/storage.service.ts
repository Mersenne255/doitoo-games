import { Injectable } from '@angular/core';
import { DEFAULT_CONFIG, VoxelConfig } from '../models/game.models';

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

      const cubeCount = clamp(Number(parsed.cubeCount) || DEFAULT_CONFIG.cubeCount, 3, 50);
      const colorCount = clamp(Number(parsed.colorCount) || DEFAULT_CONFIG.colorCount, 1, 9);

      return { cubeCount, colorCount };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
