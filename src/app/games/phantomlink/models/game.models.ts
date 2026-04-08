// ── game.models.ts ──

import { GameStage } from '../../../shared/models/game-stage.type';
export type { GameStage };

import {
  SYMBOLS, COLORS, MAX_SYMBOL_COUNT,
  VisualSymbolName, VisualColorName,
  SYMBOL_DISPLAY, COLOR_HEX,
} from './visual.config';

// Re-export visual config for convenience
export {
  SYMBOLS, COLORS, MAX_SYMBOL_COUNT,
  SYMBOL_DISPLAY, COLOR_HEX,
};
export type SymbolName = VisualSymbolName;
export type ColorName = VisualColorName;

export const SYMBOL_NAMES = SYMBOLS.map(s => s.name) as unknown as readonly SymbolName[];
export const COLOR_NAMES = COLORS.map(c => c.name) as unknown as readonly ColorName[];

// ── Configuration ──
export interface PhantomLinkConfig {
  symbolCount: number;             // 3–MAX_SYMBOL_COUNT
}

export const DEFAULT_CONFIG: PhantomLinkConfig = {
  symbolCount: 3,
};

// ── Binding Map ──
export type BindingMap = Record<string, ColorName>;

// ── Binding Change Event ──
export interface BindingChangeEvent {
  beforeTrialIndex: number;
  changes: BindingChange[];
  announced: boolean;
}

export interface BindingChange {
  symbol: SymbolName;
  oldColor: ColorName;
  newColor: ColorName;
}

// ── Trial ──
export interface Trial {
  symbol: SymbolName;
  correctColor: ColorName;
  phantomColor: ColorName | null;
  isPostChange: boolean;
  options: ColorName[];
}

// ── Trial Result ──
export interface TrialResult {
  trial: Trial;
  selectedColor: ColorName | null;
  correct: boolean;
  isPhantomError: boolean;
  responseTimeMs: number | null;
}

// ── Round Structure ──
export interface RoundStructure {
  initialBindingMap: BindingMap;
  trials: Trial[];
  bindingChanges: BindingChangeEvent[];
}

// ── Scoring State ──
export interface ScoringState {
  currentStreak: number;
  longestStreak: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  phantomErrorCount: number;
  postChangeTrialCount: number;
  postChangeCorrectCount: number;
  totalResponseTimeMs: number;
  respondedCount: number;
  totalScore: number;
}

// ── Round Result ──
export interface RoundResult {
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  timedOutCount: number;
  averageResponseTimeMs: number;
  longestStreak: number;
  phantomErrorCount: number;
  phantomResistanceRate: number;
  totalScore: number;
  symbolCount: number;
}
