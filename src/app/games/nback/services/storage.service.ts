import { Injectable } from '@angular/core';
import { NBackConfig, DEFAULT_CONFIG, SessionRecord } from '../models/game.models';
import { validateConfig } from '../utils/config-validation.util';

const GAME_ID = 'doitoo-nback';
const PREFIX = GAME_ID + ':';
const CONFIG_KEY = PREFIX + 'config';
const HISTORY_KEY = PREFIX + 'history';

@Injectable({ providedIn: 'root' })
export class StorageService {

  loadConfig(): NBackConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw === null) return { ...DEFAULT_CONFIG };
      const parsed = JSON.parse(raw);
      return validateConfig(parsed);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: NBackConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch { /* quota exceeded */ }
  }

  loadHistory(): SessionRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveHistory(records: SessionRecord[]): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    } catch { /* quota exceeded */ }
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch { /* ignore */ }
  }
}
