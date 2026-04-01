/**
 * Card packing algorithm.
 *
 * Given a container (width × height), a number of square cards, and a gap,
 * find the layout (columns × rows) that maximizes card size while fitting
 * all cards without overflow.
 *
 * Tries every possible column count from 1 to n and picks the one that
 * yields the largest card size.
 */

export interface PackingResult {
  /** Number of columns */
  cols: number;
  /** Number of rows */
  rows: number;
  /** Side length of each square card in px */
  cardSize: number;
}

/**
 * Compute the optimal grid layout for `count` square cards in a
 * `width` × `height` container with `gap` px between cards.
 *
 * Returns the layout with the largest possible card size.
 * Card size is clamped to [minSize, maxSize].
 */
export function computeCardPacking(
  width: number,
  height: number,
  count: number,
  gap: number = 8,
  minSize: number = 30,
  maxSize: number = 150,
): PackingResult {
  let bestCols = 1;
  let bestRows = count;
  let bestSize = 0;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const availW = width - gap * (cols - 1);
    const availH = height - gap * (rows - 1);
    if (availW <= 0 || availH <= 0) continue;
    const sizeByW = Math.floor(availW / cols);
    const sizeByH = Math.floor(availH / rows);
    const size = Math.min(sizeByW, sizeByH);
    if (size > bestSize) {
      bestSize = size;
      bestCols = cols;
      bestRows = rows;
    }
  }

  const clampedSize = Math.max(minSize, Math.min(bestSize, maxSize));

  return { cols: bestCols, rows: bestRows, cardSize: clampedSize };
}
