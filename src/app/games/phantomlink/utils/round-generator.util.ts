import {
  BindingChangeEvent,
  BindingMap,
  ColorName,
  COLOR_NAMES,
  RoundStructure,
  SymbolName,
  SYMBOL_NAMES,
  Trial,
} from '../models/game.models';
import { MAX_SYMBOL_COUNT } from '../models/visual.config';

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick a new color that differs from oldColor and all currently bound colors.
 * Because symbolCount <= COLORS.length - 1, there is always at least one spare color.
 */
export function pickNewColor(
  oldColor: ColorName,
  currentlyBound: ColorName[],
  rng: () => number,
): ColorName {
  const excluded = new Set<ColorName>([oldColor, ...currentlyBound]);
  const candidates = (COLOR_NAMES as readonly ColorName[]).filter(c => !excluded.has(c));
  // This should never be empty because we guarantee symbolCount <= COLORS - 1
  if (candidates.length === 0) {
    // Absolute fallback: just differ from old
    return pickRandom((COLOR_NAMES as readonly ColorName[]).filter(c => c !== oldColor), rng);
  }
  return pickRandom(candidates, rng);
}

/**
 * Generates a round for PhantomLink.
 *
 * Mechanic: after each guess, the color of the just-guessed symbol changes.
 * The binding change is announced before the next trial.
 *
 * Because symbolCount <= COLORS.length - 1, there is always at least one
 * unused color available for the swap — no color conflicts possible.
 *
 * Pure function — same inputs always produce the same output.
 */
export function generateRound(
  trialCount: number,
  symbolCount: number,
  seed: number,
): RoundStructure {
  const rng = mulberry32(seed);
  const count = Math.max(10, trialCount);
  const symCount = Math.max(3, Math.min(MAX_SYMBOL_COUNT, symbolCount));

  // Pick random symbols and assign unique colors
  const shuffledSymbols = shuffle([...(SYMBOL_NAMES as readonly SymbolName[])], rng);
  const symbols = shuffledSymbols.slice(0, symCount);
  const shuffledColors = shuffle([...(COLOR_NAMES as readonly ColorName[])], rng);

  const initialBindingMap: Record<string, ColorName> = {};
  for (let i = 0; i < symbols.length; i++) {
    initialBindingMap[symbols[i]] = shuffledColors[i];
  }

  // Generate trials and binding changes together.
  // After each trial, the guessed symbol's color changes for the next trial.
  const trials: Trial[] = [];
  const bindingChanges: BindingChangeEvent[] = [];
  const currentBindings: Record<string, ColorName> = { ...initialBindingMap };
  const phantomBindings: Record<string, ColorName | null> = {};
  for (const sym of symbols) {
    phantomBindings[sym] = null;
  }

  for (let i = 0; i < count; i++) {
    // Pick a random symbol, but never the same as the previous trial
    let chosenSymbol: SymbolName;
    if (i > 0 && symbols.length > 1) {
      const prev = trials[i - 1].symbol;
      const candidates = symbols.filter(s => s !== prev);
      chosenSymbol = pickRandom(candidates, rng);
    } else {
      chosenSymbol = pickRandom(symbols, rng);
    }
    const correctColor = currentBindings[chosenSymbol];
    const phantomColor = phantomBindings[chosenSymbol] ?? null;
    const isPostChange = phantomColor !== null;

    const options = buildTrialOptions(correctColor, phantomColor, symCount, rng);
    trials.push({ symbol: chosenSymbol, correctColor, phantomColor, isPostChange, options });

    // Schedule a binding change for this symbol BEFORE the next trial
    if (i < count - 1) {
      const oldColor = currentBindings[chosenSymbol];
      const boundColors = Object.values(currentBindings) as ColorName[];
      const newColor = pickNewColor(oldColor, boundColors, rng);

      bindingChanges.push({
        beforeTrialIndex: i + 1,
        changes: [{ symbol: chosenSymbol, oldColor, newColor }],
        announced: true,
      });

      phantomBindings[chosenSymbol] = oldColor;
      currentBindings[chosenSymbol] = newColor;
    }
  }

  return {
    initialBindingMap: initialBindingMap as BindingMap,
    trials,
    bindingChanges,
  };
}

function buildTrialOptions(
  correctColor: ColorName,
  phantomColor: ColorName | null,
  symbolCount: number,
  rng: () => number,
): ColorName[] {
  const optionCount = Math.max(3, symbolCount);
  const optionSet = new Set<ColorName>([correctColor]);
  if (phantomColor && phantomColor !== correctColor) optionSet.add(phantomColor);

  const remaining = (COLOR_NAMES as readonly ColorName[]).filter(c => !optionSet.has(c));
  const shuffled = shuffle([...remaining], rng);
  for (const color of shuffled) {
    if (optionSet.size >= optionCount) break;
    optionSet.add(color);
  }
  return shuffle([...optionSet], rng);
}
