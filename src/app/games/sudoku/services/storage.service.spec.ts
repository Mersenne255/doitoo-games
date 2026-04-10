import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { StorageService } from './storage.service';
import { SudokuConfig, DEFAULT_CONFIG, BoxDimension, SpeedMode } from '../models/game.models';

// Minimal localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
} as Storage;

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('StorageService', () => {
  let svc: StorageService;

  beforeEach(() => {
    localStorageMock.clear();
    svc = new StorageService();
  });

  it('returns default config when nothing stored', () => {
    expect(svc.loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('returns default config on invalid JSON', () => {
    localStorageMock.setItem('doitoo-sudoku:config', '{bad json');
    expect(svc.loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('round-trips a config', () => {
    const cfg: SudokuConfig = { difficulty: 75, puzzleCount: 5, boxDimension: [2, 3], speedMode: 'intense', errorHighlighting: false };
    svc.saveConfig(cfg);
    expect(svc.loadConfig()).toEqual(cfg);
  });

  /** Property 1: config round-trip */
  it('Property 1: serialize then deserialize preserves config', () => {
    const configArb = fc.record({
      difficulty: fc.integer({ min: 1, max: 100 }),
      puzzleCount: fc.integer({ min: 1, max: 10 }),
      boxDimension: fc.constantFrom<BoxDimension>([2, 2], [2, 3], [3, 3]),
      speedMode: fc.constantFrom<SpeedMode>('relaxed', 'standard', 'intense'),
      errorHighlighting: fc.boolean(),
    }) as fc.Arbitrary<SudokuConfig>;

    fc.assert(
      fc.property(configArb, (cfg) => {
        localStorageMock.clear();
        svc.saveConfig(cfg);
        expect(svc.loadConfig()).toEqual(cfg);
      }),
      { numRuns: 10 },
    );
  });
});
