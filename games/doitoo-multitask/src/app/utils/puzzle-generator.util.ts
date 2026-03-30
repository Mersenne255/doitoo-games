import {
  Shape,
  ShapeColor,
  BorderColor,
  ShapeCard,
  Puzzle,
  cardCountForDifficulty,
} from '../models/game.models';

export const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
export const SHAPE_COLORS: ShapeColor[] = ['red', 'blue', 'green', 'amber', 'purple', 'orange'];
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

const PROPERTY_KEYS: (keyof ShapeCard)[] = ['shape', 'shapeColor', 'borderColor', 'innerLetter'];

const DOMAINS: Record<keyof ShapeCard, readonly string[]> = {
  shape: SHAPES,
  shapeColor: SHAPE_COLORS,
  borderColor: BORDER_COLORS,
  innerLetter: INNER_LETTERS.split(''),
};

export function sharesPropertyWith(a: ShapeCard, b: ShapeCard): boolean {
  return a.shape === b.shape
    || a.shapeColor === b.shapeColor
    || a.borderColor === b.borderColor
    || a.innerLetter === b.innerLetter;
}

export function isAnswerCard(card: ShapeCard, allCards: ShapeCard[]): boolean {
  return allCards.filter(c => c !== card).every(other => sharesPropertyWith(card, other));
}

export function findAnswerCard(cards: ShapeCard[]): number {
  return cards.findIndex(card => isAnswerCard(card, cards));
}

function getTierBounds(difficulty: number): { tierStart: number; tierEnd: number } {
  const d = Math.max(1, Math.min(100, difficulty));
  if (d <= 33) return { tierStart: 1, tierEnd: 33 };
  if (d <= 66) return { tierStart: 34, tierEnd: 66 };
  return { tierStart: 67, tierEnd: 100 };
}

const MAX_ATTEMPTS = 50;

/**
 * Generate a puzzle. After building the base (each distractor shares one
 * property with the answer), we add cross-distractor sharing: randomly copy
 * property values between pairs of distractors. This creates "noise" where
 * multiple cards share properties, but only the answer shares with ALL others.
 */
export function generatePuzzle(
  difficulty: number,
  rng: () => number = Math.random,
): Puzzle {
  const d = Math.max(1, Math.min(100, difficulty));
  const cardCount = cardCountForDifficulty(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const answer = randomCard(rng);
    const cards: ShapeCard[] = [answer];

    // Step 1: Build base distractors — each shares one property with answer
    for (let i = 1; i < cardCount; i++) {
      const sharedKey = PROPERTY_KEYS[(i - 1) % PROPERTY_KEYS.length];
      const distractor: ShapeCard = { ...answer };

      for (const key of PROPERTY_KEYS) {
        if (key === sharedKey) continue;
        const domain = DOMAINS[key];
        const others = domain.filter(v => v !== answer[key]);
        setCardProperty(distractor, key, pickRandom(others, rng));
      }

      cards.push(distractor);
    }

    // Step 2: Add cross-distractor sharing scaled by difficulty.
    // At level 1: 0 cross-shares. At level 100: many cross-shares.
    const distractors = cards.slice(1);
    const crossShareChance = (d - 1) / 99; // 0 at lvl 1, 1 at lvl 100
    const maxPairs = distractors.length * (distractors.length - 1) / 2;
    const numPairs = Math.round(crossShareChance * maxPairs);

    for (let p = 0; p < numPairs; p++) {
      const iA = Math.floor(rng() * distractors.length);
      let iB = Math.floor(rng() * distractors.length);
      if (iB === iA) iB = (iA + 1) % distractors.length;
      const key = PROPERTY_KEYS[Math.floor(rng() * PROPERTY_KEYS.length)];
      setCardProperty(distractors[iB], key, distractors[iA][key]);
    }

    // Step 3: Verify — must still have exactly one answer card.
    // The cross-sharing might accidentally make a distractor into an answer.
    const answerCards = cards.filter(c => isAnswerCard(c, cards));
    if (answerCards.length === 1 && answerCards[0] === answer) {
      const shuffled = shuffle(cards, rng);
      return { cards: shuffled, answerIndex: shuffled.indexOf(answer) };
    }
  }

  // Fallback — simple but valid
  const answer = randomCard(rng);
  const cards: ShapeCard[] = [answer];
  for (let i = 1; i < cardCount; i++) {
    const sk = PROPERTY_KEYS[(i - 1) % PROPERTY_KEYS.length];
    const d2: ShapeCard = { ...answer };
    for (const key of PROPERTY_KEYS) {
      if (key === sk) continue;
      const domain = DOMAINS[key];
      const filtered = domain.filter(v => v !== answer[key]);
      setCardProperty(d2, key, filtered[i % filtered.length]);
    }
    cards.push(d2);
  }
  const shuffled = shuffle(cards, rng);
  return { cards: shuffled, answerIndex: shuffled.indexOf(answer) };
}
