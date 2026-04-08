import { Injectable } from '@angular/core';
import { PhantomLinkConfig, DEFAULT_CONFIG } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'phantomlink-config';

  saveConfig(config: PhantomLinkConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch {
      // silently ignore
    }
  }

  loadConfig(): PhantomLinkConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return {
        symbolCount: clamp(Number(parsed.symbolCount) || DEFAULT_CONFIG.symbolCount, 2, 8),
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
