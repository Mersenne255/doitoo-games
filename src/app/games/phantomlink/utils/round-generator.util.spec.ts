import { describe, it, expect } from 'vitest';
import { generateRound, pickNewColor } from './round-generator.util';
import { COLOR_NAMES, SYMBOL_NAMES } from '../models/game.models';
import { MAX_SYMBOL_COUNT, COLORS, SYMBOLS } from '../models/visual.config';

describe('PhantomLink round-generator', () => {

  describe('visual config constraints', () => {
    it('MAX_SYMBOL_COUNT equals COLORS.length - 1', () => {
      expect(MAX_SYMBOL_COUNT).toBe(COLORS.length - 1);
    });

    it('SYMBOLS has at least MAX_SYMBOL_COUNT entries', () => {
      expect(SYMBOLS.length).toBeGreaterThanOrEqual(MAX_SYMBOL_COUNT);
    });

    it('all symbol names are unique', () => {
      const names = SYMBOLS.map(s => s.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('all color names are unique', () => {
      const names = COLORS.map(c => c.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('all color hex values are unique', () => {
      const hexes = COLORS.map(c => c.hex);
      expect(new Set(hexes).size).toBe(hexes.length);
    });
  });

  describe('initial binding map', () => {
    it('assigns unique colors to each symbol (no two symbols share a color)', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        for (let seed = 0; seed < 50; seed++) {
          const round = generateRound(20, symCount, seed);
          const colors = Object.values(round.initialBindingMap);
          expect(new Set(colors).size, `symCount=${symCount} seed=${seed}`).toBe(colors.length);
        }
      }
    });

    it('uses exactly symbolCount symbols', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        const round = generateRound(20, symCount, 42);
        expect(Object.keys(round.initialBindingMap).length).toBe(symCount);
      }
    });

    it('all symbols come from SYMBOL_NAMES', () => {
      const round = generateRound(20, MAX_SYMBOL_COUNT, 42);
      for (const sym of Object.keys(round.initialBindingMap)) {
        expect((SYMBOL_NAMES as readonly string[]).includes(sym), `unknown symbol: ${sym}`).toBe(true);
      }
    });

    it('all colors come from COLOR_NAMES', () => {
      const round = generateRound(20, MAX_SYMBOL_COUNT, 42);
      for (const color of Object.values(round.initialBindingMap)) {
        expect((COLOR_NAMES as readonly string[]).includes(color), `unknown color: ${color}`).toBe(true);
      }
    });
  });

  describe('binding changes — no color conflicts', () => {
    it('new color differs from old color in every change', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        for (let seed = 0; seed < 50; seed++) {
          const round = generateRound(30, symCount, seed);
          for (const evt of round.bindingChanges) {
            for (const change of evt.changes) {
              expect(change.newColor, `seed=${seed} sym=${change.symbol}`).not.toBe(change.oldColor);
            }
          }
        }
      }
    });

    it('new color is not used by any other symbol at the time of change', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        for (let seed = 0; seed < 50; seed++) {
          const round = generateRound(30, symCount, seed);
          // Replay binding state
          const bindings: Record<string, string> = { ...round.initialBindingMap };

          for (const evt of round.bindingChanges) {
            for (const change of evt.changes) {
              // Before applying: check newColor is not bound to any OTHER symbol
              const otherBound = Object.entries(bindings)
                .filter(([sym]) => sym !== change.symbol)
                .map(([, col]) => col);
              expect(
                otherBound.includes(change.newColor),
                `seed=${seed} symCount=${symCount} sym=${change.symbol} newColor=${change.newColor} conflicts with ${otherBound}`,
              ).toBe(false);

              // Apply the change
              bindings[change.symbol] = change.newColor;
            }
          }
        }
      }
    });

    it('after every change, all bound colors remain unique', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        for (let seed = 0; seed < 50; seed++) {
          const round = generateRound(30, symCount, seed);
          const bindings: Record<string, string> = { ...round.initialBindingMap };

          for (const evt of round.bindingChanges) {
            for (const change of evt.changes) {
              bindings[change.symbol] = change.newColor;
            }
            const colors = Object.values(bindings);
            expect(
              new Set(colors).size,
              `seed=${seed} symCount=${symCount} after change at trial ${evt.beforeTrialIndex}`,
            ).toBe(colors.length);
          }
        }
      }
    });
  });

  describe('binding change always targets the just-guessed symbol', () => {
    it('each binding change targets the symbol from the previous trial', () => {
      for (let seed = 0; seed < 20; seed++) {
        const round = generateRound(30, 4, seed);
        for (const evt of round.bindingChanges) {
          const prevTrialIndex = evt.beforeTrialIndex - 1;
          const prevTrial = round.trials[prevTrialIndex];
          expect(
            evt.changes[0].symbol,
            `seed=${seed} change before trial ${evt.beforeTrialIndex}`,
          ).toBe(prevTrial.symbol);
        }
      }
    });
  });

  describe('trials', () => {
    it('every trial has exactly one correct answer in options', () => {
      for (let seed = 0; seed < 50; seed++) {
        const round = generateRound(30, 5, seed);
        for (const trial of round.trials) {
          const correctCount = trial.options.filter(o => o === trial.correctColor).length;
          expect(correctCount, `seed=${seed} symbol=${trial.symbol}`).toBe(1);
        }
      }
    });

    it('all option colors come from COLOR_NAMES', () => {
      const round = generateRound(30, MAX_SYMBOL_COUNT, 42);
      for (const trial of round.trials) {
        for (const opt of trial.options) {
          expect((COLOR_NAMES as readonly string[]).includes(opt), `unknown option color: ${opt}`).toBe(true);
        }
      }
    });

    it('no duplicate options in any trial', () => {
      for (let seed = 0; seed < 50; seed++) {
        const round = generateRound(30, 5, seed);
        for (const trial of round.trials) {
          expect(new Set(trial.options).size, `seed=${seed}`).toBe(trial.options.length);
        }
      }
    });

    it('phantom color is included in options when present', () => {
      for (let seed = 0; seed < 50; seed++) {
        const round = generateRound(30, 4, seed);
        for (const trial of round.trials) {
          if (trial.phantomColor && trial.phantomColor !== trial.correctColor) {
            expect(
              trial.options.includes(trial.phantomColor),
              `seed=${seed} symbol=${trial.symbol} phantom=${trial.phantomColor}`,
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('pickNewColor guarantees', () => {
    it('never returns the old color', () => {
      let rngVal = 0;
      const rng = () => { rngVal = (rngVal + 0.13) % 1; return rngVal; };
      for (const old of COLOR_NAMES as readonly string[]) {
        for (let i = 0; i < 20; i++) {
          const result = pickNewColor(old as any, [old as any], rng);
          expect(result).not.toBe(old);
        }
      }
    });

    it('never returns a color already bound to another symbol', () => {
      let rngVal = 0;
      const rng = () => { rngVal = (rngVal + 0.07) % 1; return rngVal; };
      // Simulate max symbols bound (MAX_SYMBOL_COUNT colors used)
      const bound = (COLOR_NAMES as readonly string[]).slice(0, MAX_SYMBOL_COUNT) as any[];
      const old = bound[0];
      for (let i = 0; i < 50; i++) {
        const result = pickNewColor(old, bound, rng);
        expect(result).not.toBe(old);
        expect(bound.filter((b: string) => b !== old).includes(result)).toBe(false);
      }
    });
  });

  describe('resilience to config changes', () => {
    it('at minimum config (3 symbols), color uniqueness holds across 100 seeds', () => {
      for (let seed = 0; seed < 100; seed++) {
        const round = generateRound(50, 3, seed);
        const bindings: Record<string, string> = { ...round.initialBindingMap };
        for (const evt of round.bindingChanges) {
          for (const change of evt.changes) {
            bindings[change.symbol] = change.newColor;
          }
          const colors = Object.values(bindings);
          expect(new Set(colors).size, `seed=${seed}`).toBe(colors.length);
        }
      }
    });

    it('at maximum config (MAX_SYMBOL_COUNT symbols), color uniqueness holds across 100 seeds', () => {
      for (let seed = 0; seed < 100; seed++) {
        const round = generateRound(50, MAX_SYMBOL_COUNT, seed);
        const bindings: Record<string, string> = { ...round.initialBindingMap };
        for (const evt of round.bindingChanges) {
          for (const change of evt.changes) {
            bindings[change.symbol] = change.newColor;
          }
          const colors = Object.values(bindings);
          expect(new Set(colors).size, `seed=${seed}`).toBe(colors.length);
        }
      }
    });

    it('symbolCount is clamped to MAX_SYMBOL_COUNT even if requested higher', () => {
      const round = generateRound(20, 999, 42);
      expect(Object.keys(round.initialBindingMap).length).toBe(MAX_SYMBOL_COUNT);
    });

    it('symbolCount is clamped to 3 even if requested lower', () => {
      const round = generateRound(20, 0, 42);
      expect(Object.keys(round.initialBindingMap).length).toBe(3);
    });

    it('spare color always exists: COLORS.length > symbolCount for all valid counts', () => {
      for (let symCount = 3; symCount <= MAX_SYMBOL_COUNT; symCount++) {
        expect(COLORS.length, `symCount=${symCount}`).toBeGreaterThan(symCount);
      }
    });
  });

  describe('determinism', () => {
    it('same inputs produce identical output', () => {
      const a = generateRound(30, 5, 12345);
      const b = generateRound(30, 5, 12345);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
  });
});
