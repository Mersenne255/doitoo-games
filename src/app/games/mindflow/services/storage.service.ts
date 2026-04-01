import { Injectable } from '@angular/core';
import { MindFlowConfig, DEFAULT_CONFIG } from '../models/game.models';
import { serializeConfig, deserializeConfig } from '../utils/config-serializer.util';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly STORAGE_KEY = 'mindflow-config';

  saveConfig(config: MindFlowConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, serializeConfig(config));
    } catch {
      // quota exceeded or storage unavailable
    }
  }

  loadConfig(): MindFlowConfig {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { ...DEFAULT_CONFIG };
      return deserializeConfig(raw);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}
