/**
 * Visual configuration for PhantomLink.
 * Symbol set and color palette are defined here.
 * Max symbol count = COLORS.length - 1 (one spare color guarantees no conflicts on swap).
 */

export const SYMBOLS = [
  { name: 'triangle',  display: '▲' },
  { name: 'star',      display: '✸' },
  { name: 'diamond',   display: '◆' },
  { name: 'hexagon',   display: '☯' },
  { name: 'cross',     display: '✚' },
  { name: 'crescent',  display: '☻' },
  { name: 'arrow',     display: '♞' },
  { name: 'heart',     display: '♥' },
  { name: 'bolt',      display: '☮' },
  { name: 'square',    display: '■' },
  { name: 'spade',     display: '♠' },
] as const;

export type VisualSymbolName = typeof SYMBOLS[number]['name'];

export const COLORS = [
  { name: 'red',    hex: '#ff0000' },
  { name: 'orange', hex: '#ff6a00' },
  { name: 'yellow', hex: '#fff200' },
  { name: 'green',  hex: '#11ff00' },
  { name: 'cyan',   hex: '#4acce1' },
  { name: 'blue',   hex: '#0800ff' },
  { name: 'purple', hex: '#6f00d8' },
  { name: 'pink',   hex: '#ff89c2' },
  { name: 'white',  hex: '#f1f5f9' },
] as const;

export type VisualColorName = typeof COLORS[number]['name'];

/**
 * Max symbols = COLORS.length - 1.
 * We always need one spare color so a swap is always possible without conflicts.
 */
export const MAX_SYMBOL_COUNT = COLORS.length - 1;

// Runtime guard: ensure we have enough symbols and colors
if (SYMBOLS.length < 2) {
  throw new Error(`PhantomLink: need at least 2 symbols, got ${SYMBOLS.length}`);
}
if (COLORS.length < 3) {
  throw new Error(`PhantomLink: need at least 3 colors (2 symbols + 1 spare), got ${COLORS.length}`);
}
if (SYMBOLS.length < MAX_SYMBOL_COUNT) {
  throw new Error(
    `PhantomLink: not enough symbols (${SYMBOLS.length}) for MAX_SYMBOL_COUNT (${MAX_SYMBOL_COUNT}). ` +
    `Add more symbols or remove colors.`
  );
}

/** Quick lookup maps derived from the arrays above. */
export const SYMBOL_DISPLAY: Record<string, string> = Object.fromEntries(
  SYMBOLS.map(s => [s.name, s.display]),
);

export const COLOR_HEX: Record<string, string> = Object.fromEntries(
  COLORS.map(c => [c.name, c.hex]),
);
