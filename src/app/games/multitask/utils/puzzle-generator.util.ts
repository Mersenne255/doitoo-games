import {
  Shape,
  ShapeColor,
  BorderColor,
  ShapeCard,
  Puzzle,
  cardCountForDifficulty,
} from '../models/game.models';

export const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
export const SHAPE_COLORS: ShapeColor[] = ['red', 'blue', 'green', 'charcoal'];
export const BORDER_COLORS: BorderColor[] = ['white', 'gold', 'cyan', 'magenta'];
export const INNER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomCard(rng: () => number): ShapeCard {
  return {
    shape: pickRandom(SHAPES, rng),
    shapeColor: pickRandom(SHAPE_COLORS, rng),
    borderColor: pickRandom(BORDER_COLORS, rng),
    innerLetter: INNER_LETTERS[Math.floor(rng() * INNER_LETTERS.length)],
  };
}

function setCardProperty(card: ShapeCard, key: keyof ShapeCard, value: string): void {
  (card as any)[key] = value;
}

const ALL_KEYS: (keyof ShapeCard)[] = ['shape', 'shapeColor', 'borderColor', 'innerLetter'];

const DOMAINS: Record<keyof ShapeCard, readonly string[]> = {
  shape: SHAPES,
  shapeColor: SHAPE_COLORS,
  borderColor: BORDER_COLORS,
  innerLetter: INNER_LETTERS.split(''),
};

// ── Verification (active-keys aware) ────────────────────────────────

export function sharesPropertyWith(a: ShapeCard, b: ShapeCard, keys?: (keyof ShapeCard)[]): boolean {
  const k = keys ?? ALL_KEYS;
  return k.some(key => a[key] === b[key]);
}

export function isAnswerCard(card: ShapeCard, allCards: ShapeCard[], keys?: (keyof ShapeCard)[]): boolean {
  return allCards.filter(c => c !== card).every(other => sharesPropertyWith(card, other, keys));
}

export function findAnswerCard(cards: ShapeCard[], keys?: (keyof ShapeCard)[]): number {
  return cards.findIndex(card => isAnswerCard(card, cards, keys));
}

// ── Progressive property count ──────────────────────────────────────

/**
 * How many properties are active at a given difficulty:
 * - 3 cards (diff 1-33):  1-11 → 2 props, 12-22 → 3 props, 23-33 → 4 props
 * - 4 cards (diff 34-66): 34-50 → 3 props, 51-66 → 4 props
 * - 5 cards (diff 67-100): always 4 props
 */
export function activePropertyCount(difficulty: number): number {
  const d = Math.max(1, Math.min(100, difficulty));
  if (d <= 33) {
    if (d <= 11) return 2;
    if (d <= 22) return 3;
    return 4;
  }
  if (d <= 66) {
    if (d <= 50) return 3;
    return 4;
  }
  return 4;
}

function selectActiveKeys(count: number, difficulty: number, rng: () => number): (keyof ShapeCard)[] {
  if (count >= 4) return shuffle([...ALL_KEYS], rng);

  const d = Math.max(1, Math.min(100, difficulty));

  if (d <= 11) {
    // 2 props: always shape + shapeColor
    return ['shape', 'shapeColor'];
  }
  if (d <= 22) {
    // 3 props: shape, shapeColor, borderColor — randomly ordered
    return shuffle(['shape', 'shapeColor', 'borderColor'] as (keyof ShapeCard)[], rng);
  }
  // d 34–50: 3 props: shape, shapeColor, borderColor
  return shuffle(['shape', 'shapeColor', 'borderColor'] as (keyof ShapeCard)[], rng);
}

// ── Main generator ──────────────────────────────────────────────────

const MAX_ATTEMPTS = 50;

export function generatePuzzle(
  difficulty: number,
  rng: () => number = Math.random,
): Puzzle {
  const d = Math.max(1, Math.min(100, difficulty));
  const cardCount = cardCountForDifficulty(d);
  const numActive = activePropertyCount(d);
  const activeKeys = selectActiveKeys(numActive, d, rng);

  // Cross-sharing scales with difficulty
  const crossShareChance = (d - 1) / 99;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const answer = randomCard(rng);

    // Fix inactive properties to the answer's values on all cards
    const cards: ShapeCard[] = [answer];

    for (let i = 1; i < cardCount; i++) {
      const sharedKey = activeKeys[(i - 1) % activeKeys.length];
      const distractor: ShapeCard = { ...answer }; // starts with all props = answer

      // Vary active properties (except the shared one)
      for (const key of activeKeys) {
        if (key === sharedKey) continue;
        const domain = DOMAINS[key];
        const others = domain.filter(v => v !== answer[key]);
        setCardProperty(distractor, key, pickRandom(others, rng));
      }

      cards.push(distractor);
    }

    // Cross-distractor sharing (difficulty scaling)
    const distractors = cards.slice(1);
    const maxPairs = distractors.length * (distractors.length - 1) / 2;
    const numPairs = Math.round(crossShareChance * maxPairs);
    for (let p = 0; p < numPairs; p++) {
      const iA = Math.floor(rng() * distractors.length);
      let iB = Math.floor(rng() * distractors.length);
      if (iB === iA) iB = (iA + 1) % distractors.length;
      // Only share active properties
      const key = activeKeys[Math.floor(rng() * activeKeys.length)];
      setCardProperty(distractors[iB], key, distractors[iA][key]);
    }

    // Verify using only active keys
    const answerCards = cards.filter(c => isAnswerCard(c, cards, activeKeys));
    if (answerCards.length === 1 && answerCards[0] === answer) {
      const shuffled = shuffle(cards, rng);
      return { cards: shuffled, answerIndex: shuffled.indexOf(answer), activeKeys };
    }
  }

  // Fallback
  const answer = randomCard(rng);
  const cards: ShapeCard[] = [answer];
  for (let i = 1; i < cardCount; i++) {
    const sk = activeKeys[(i - 1) % activeKeys.length];
    const d2: ShapeCard = { ...answer };
    for (const key of activeKeys) {
      if (key === sk) continue;
      const domain = DOMAINS[key];
      const filtered = domain.filter(v => v !== answer[key]);
      setCardProperty(d2, key, filtered[i % filtered.length]);
    }
    cards.push(d2);
  }
  const shuffled = shuffle(cards, rng);
  return { cards: shuffled, answerIndex: shuffled.indexOf(answer), activeKeys };
}
