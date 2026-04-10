import { Injectable } from '@angular/core';
import { SudokuConfig, DEFAULT_CONFIG } from '../models/game.models';

const GAME_ID = 'doitoo-sudoku';
const PREFIX = GAME_ID + ':';
const CONFIG_KEY = PREFIX + 'config';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadConfig(): SudokuConfig {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw === null) return structuredClone(DEFAULT_CONFIG);
      const parsed = JSON.parse(raw) as Partial<SudokuConfig>;
      return {
        difficulty: parsed.difficulty ?? DEFAULT_CONFIG.difficulty,
        puzzleCount: parsed.puzzleCount ?? DEFAULT_CONFIG.puzzleCount,
        boxDimension: parsed.boxDimension ?? DEFAULT_CONFIG.boxDimension,
        speedMode: parsed.speedMode ?? DEFAULT_CONFIG.speedMode,
        errorHighlighting: parsed.errorHighlighting ?? DEFAULT_CONFIG.errorHighlighting,
      };
    } catch {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  saveConfig(config: SudokuConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch { /* quota exceeded */ }
  }
}
