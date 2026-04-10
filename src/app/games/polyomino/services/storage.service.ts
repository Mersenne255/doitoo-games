import { Injectable } from '@angular/core';
import { DEFAULT_CONFIG, PolyominoConfig, SavedGameState } from '../models/game.models';

const GAME_ID = 'doitoo-polyomino';
const PREFIX = GAME_ID + ':';
const CONFIG_KEY = PREFIX + 'config';
const STATE_KEY = PREFIX + 'state';

@Injectable({ providedIn: 'root' })
export class StorageService {

  loadConfig(): PolyominoConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw === null) return structuredClone(DEFAULT_CONFIG);
      const parsed = JSON.parse(raw) as Partial<PolyominoConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  saveConfig(config: PolyominoConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch { /* quota exceeded */ }
  }

  loadGameState(): SavedGameState | null {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as SavedGameState;
    } catch {
      return null;
    }
  }

  saveGameState(state: SavedGameState): void {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch { /* quota exceeded */ }
  }

  clearGameState(): void {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch { /* ignore */ }
  }
}
