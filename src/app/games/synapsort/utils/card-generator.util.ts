import {
  Card,
  ColorName,
  COLOR_NAMES,
  CompoundRule,
  ConflictType,
  DifficultyParams,
  MIN_COUNT,
  MAX_COUNT,
  Pile,
  RoundStructure,
  RuleScheduleEntry,
  ShapeName,
  SHAPE_NAMES,
  SortAttempt,
} from '../models/game.models';

// ── Seeded PRNG (mulberry32) ──

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ── Pile Generation ──

function generatePiles(pileCount: number, rng: () => number): Pile[] {
  const shapes = shuffle(SHAPE_NAMES, rng).slice(0, pileCount) as ShapeName[];
  const colors = shuffle(COLOR_NAMES, rng).slice(0, pileCount) as ColorName[];
  const allCounts = Array.from(
    { length: MAX_COUNT - MIN_COUNT + 1 },
    (_, i) => i + MIN_COUNT,
  );
  const counts = shuffle(allCounts, rng).slice(0, pileCount);

  return shapes.map((shape, i) => ({
    referenceCard: { shape, color: colors[i], count: counts[i] },
  }));
}

// ── Rule Schedule Generation ──

function generateCompoundRule(rng: () => number): CompoundRule {
  const attrs: ('shape' | 'color' | 'count')[] = ['shape', 'color', 'count'];
  const shuffled = shuffle(attrs, rng);
  return { attributes: [shuffled[0], shuffled[1]] };
}

function generateRuleSchedule(
  params: DifficultyParams,
  cardCount: number,
  rng: () => number,
): RuleScheduleEntry[] {
  const { enabledRules, switchThresholdMin, switchThresholdMax } = params;
  const schedule: RuleScheduleEntry[] = [];

  // Build cycling order: use all enabled rules before repeating, no immediate repeats
  let rulePool: ConflictType[] = [];
  let lastRule: ConflictType | null = null;

  // Generate enough entries to cover the entire cardCount (over-generate)
  const maxEntries = cardCount * 3;

  for (let i = 0; i < maxEntries; i++) {
    if (rulePool.length === 0) {
      rulePool = shuffle(enabledRules, rng);
      // Avoid immediate repeat across pool boundaries
      if (lastRule !== null && rulePool.length > 1 && rulePool[0] === lastRule) {
        rulePool.push(rulePool.shift()!);
      }
    }

    let rule = rulePool.shift()!;

    // Double-check no immediate repeat (edge case with single-rule pools)
    if (rule === lastRule && rulePool.length > 0) {
      const swap = rulePool.shift()!;
      rulePool.unshift(rule);
      rule = swap;
    }

    lastRule = rule;
    const entry: RuleScheduleEntry = {
      rule,
      switchThreshold: randInt(switchThresholdMin, switchThresholdMax, rng),
    };
    if (rule === 'compound') {
      entry.compoundRule = generateCompoundRule(rng);
    }
    schedule.push(entry);

    // Check if we have enough coverage
    const totalCoverage = schedule.reduce((sum, e) => sum + e.switchThreshold, 0);
    if (totalCoverage >= cardCount * 2) break;
  }

  return schedule;
}

// ── Card Matching Logic ──

function doesMatchRule(
  card: Card,
  ref: Card,
  rule: ConflictType,
  compoundRule?: CompoundRule,
): boolean {
  switch (rule) {
    case 'shape':
      return card.shape === ref.shape;
    case 'color':
      return card.color === ref.color;
    case 'count':
      return card.count === ref.count;
    case 'compound': {
      if (!compoundRule) return false;
      return compoundRule.attributes.every(attr => {
        switch (attr) {
          case 'shape': return card.shape === ref.shape;
          case 'color': return card.color === ref.color;
          case 'count': return card.count === ref.count;
        }
      });
    }
  }
}

/**
 * Returns the index of the single pile matching the card under the given rule,
 * or -1 if zero or multiple piles match.
 */
function findMatchingPile(
  card: Card,
  piles: Pile[],
  rule: ConflictType,
  compoundRule?: CompoundRule,
): number {
  const matches: number[] = [];
  for (let i = 0; i < piles.length; i++) {
    if (doesMatchRule(card, piles[i].referenceCard, rule, compoundRule)) {
      matches.push(i);
    }
  }
  return matches.length === 1 ? matches[0] : -1;
}

/**
 * Compute correctPileByRule for all enabled rules (plus compound if applicable).
 * For compound, uses the provided compoundRule from the active schedule entry.
 */
function computeCorrectPileByRule(
  card: Card,
  piles: Pile[],
  enabledRules: ConflictType[],
  activeCompoundRule?: CompoundRule,
): Record<ConflictType, number> {
  const result: Partial<Record<ConflictType, number>> = {};

  for (const rule of enabledRules) {
    if (rule === 'compound') {
      result['compound'] = activeCompoundRule
        ? findMatchingPile(card, piles, 'compound', activeCompoundRule)
        : -1;
    } else {
      result[rule] = findMatchingPile(card, piles, rule);
    }
  }

  // Fill in any missing keys with computed values
  if (result['shape'] === undefined) result['shape'] = findMatchingPile(card, piles, 'shape');
  if (result['color'] === undefined) result['color'] = findMatchingPile(card, piles, 'color');
  if (result['count'] === undefined) result['count'] = findMatchingPile(card, piles, 'count');
  if (result['compound'] === undefined) result['compound'] = -1;

  return result as Record<ConflictType, number>;
}

// ── Card Generation ──

/**
 * Generate a card that matches exactly one pile under the given rule.
 * The card's attribute for the active rule dimension is set to match the target pile,
 * while other attributes are chosen to avoid matching other piles on the active dimension.
 */
function generateCardForRule(
  targetPileIndex: number,
  piles: Pile[],
  rule: ConflictType,
  compoundRule: CompoundRule | undefined,
  rng: () => number,
): Card {
  const target = piles[targetPileIndex].referenceCard;

  if (rule === 'compound' && compoundRule) {
    return generateCompoundCard(targetPileIndex, piles, compoundRule, rng);
  }

  // For simple rules: set the matching attribute from the target pile,
  // pick other attributes freely (but ensure no accidental match on the active dimension)
  const allShapes = [...SHAPE_NAMES] as ShapeName[];
  const allColors = [...COLOR_NAMES] as ColorName[];
  const allCounts = Array.from({ length: MAX_COUNT - MIN_COUNT + 1 }, (_, i) => i + MIN_COUNT);

  let shape: ShapeName;
  let color: ColorName;
  let count: number;

  switch (rule) {
    case 'shape':
      shape = target.shape;
      color = pickRandom(allColors, rng);
      count = pickRandom(allCounts, rng);
      break;
    case 'color':
      color = target.color;
      shape = pickRandom(allShapes, rng);
      count = pickRandom(allCounts, rng);
      break;
    case 'count':
      count = target.count;
      shape = pickRandom(allShapes, rng);
      color = pickRandom(allColors, rng);
      break;
    default:
      shape = pickRandom(allShapes, rng);
      color = pickRandom(allColors, rng);
      count = pickRandom(allCounts, rng);
  }

  return { shape, color, count };
}

function generateCompoundCard(
  targetPileIndex: number,
  piles: Pile[],
  compoundRule: CompoundRule,
  rng: () => number,
): Card {
  const target = piles[targetPileIndex].referenceCard;
  const allShapes = [...SHAPE_NAMES] as ShapeName[];
  const allColors = [...COLOR_NAMES] as ColorName[];
  const allCounts = Array.from({ length: MAX_COUNT - MIN_COUNT + 1 }, (_, i) => i + MIN_COUNT);

  let shape: ShapeName = pickRandom(allShapes, rng);
  let color: ColorName = pickRandom(allColors, rng);
  let count: number = pickRandom(allCounts, rng);

  // Set the compound attributes to match the target
  for (const attr of compoundRule.attributes) {
    switch (attr) {
      case 'shape': shape = target.shape; break;
      case 'color': color = target.color; break;
      case 'count': count = target.count; break;
    }
  }

  // For the non-compound attribute, ensure it doesn't accidentally create
  // a second compound match with another pile
  const freeAttr = (['shape', 'color', 'count'] as const).find(
    a => !compoundRule.attributes.includes(a),
  )!;

  // Try to pick a value for the free attribute that doesn't create ambiguity
  const card: Card = { shape, color, count };
  const match = findMatchingPile(card, piles, 'compound', compoundRule);
  if (match === targetPileIndex) return card;

  // If ambiguous, try different values for the free attribute
  for (let attempt = 0; attempt < 20; attempt++) {
    switch (freeAttr) {
      case 'shape': card.shape = pickRandom(allShapes, rng); break;
      case 'color': card.color = pickRandom(allColors, rng); break;
      case 'count': card.count = pickRandom(allCounts, rng); break;
    }
    if (findMatchingPile(card, piles, 'compound', compoundRule) === targetPileIndex) {
      return { ...card };
    }
  }

  return { ...card };
}

/**
 * Generate an ambiguous card: one that matches DIFFERENT piles under different rules.
 * The card matches targetPileIndex under the active rule, but matches a different pile
 * under at least one other enabled rule.
 */
function generateAmbiguousCard(
  targetPileIndex: number,
  piles: Pile[],
  activeRule: ConflictType,
  activeCompoundRule: CompoundRule | undefined,
  enabledRules: ConflictType[],
  rng: () => number,
): Card {
  const target = piles[targetPileIndex].referenceCard;
  const allShapes = [...SHAPE_NAMES] as ShapeName[];
  const allColors = [...COLOR_NAMES] as ColorName[];
  const allCounts = Array.from({ length: MAX_COUNT - MIN_COUNT + 1 }, (_, i) => i + MIN_COUNT);

  // Try to construct a card that matches target on the active rule dimension
  // but matches a DIFFERENT pile on at least one other dimension
  for (let attempt = 0; attempt < 50; attempt++) {
    let shape: ShapeName = pickRandom(allShapes, rng);
    let color: ColorName = pickRandom(allColors, rng);
    let count: number = pickRandom(allCounts, rng);

    // Set the active rule dimension to match target
    if (activeRule === 'compound' && activeCompoundRule) {
      for (const attr of activeCompoundRule.attributes) {
        switch (attr) {
          case 'shape': shape = target.shape; break;
          case 'color': color = target.color; break;
          case 'count': count = target.count; break;
        }
      }
    } else {
      switch (activeRule) {
        case 'shape': shape = target.shape; break;
        case 'color': color = target.color; break;
        case 'count': count = target.count; break;
      }
    }

    // For non-active dimensions, try to match a DIFFERENT pile
    const otherPiles = piles
      .map((_, i) => i)
      .filter(i => i !== targetPileIndex);

    if (otherPiles.length > 0) {
      const otherIdx = pickRandom(otherPiles, rng);
      const other = piles[otherIdx].referenceCard;

      // Pick a non-active rule to create the ambiguity on
      const otherRules = enabledRules.filter(r => r !== activeRule && r !== 'compound');
      if (otherRules.length > 0) {
        const ambigRule = pickRandom(otherRules, rng);
        switch (ambigRule) {
          case 'shape':
            if (activeRule !== 'shape' &&
                !(activeRule === 'compound' && activeCompoundRule?.attributes.includes('shape'))) {
              shape = other.shape;
            }
            break;
          case 'color':
            if (activeRule !== 'color' &&
                !(activeRule === 'compound' && activeCompoundRule?.attributes.includes('color'))) {
              color = other.color;
            }
            break;
          case 'count':
            if (activeRule !== 'count' &&
                !(activeRule === 'compound' && activeCompoundRule?.attributes.includes('count'))) {
              count = other.count;
            }
            break;
        }
      }
    }

    const card: Card = { shape, color, count };

    // Validate: exactly one pile matches under active rule
    const activeMatch = findMatchingPile(card, piles, activeRule, activeCompoundRule);
    if (activeMatch !== targetPileIndex) continue;

    // Check if it's actually ambiguous (different pile under some other rule)
    const pileByRule = computeCorrectPileByRule(card, piles, enabledRules, activeCompoundRule);
    const pileIndices = new Set(
      enabledRules
        .map(r => pileByRule[r])
        .filter(idx => idx >= 0),
    );
    if (pileIndices.size > 1) {
      return card;
    }
  }

  // Fallback: return a non-ambiguous card matching the target
  return generateCardForRule(targetPileIndex, piles, activeRule, activeCompoundRule, rng);
}

// ── Active Rule Resolution ──

interface ActiveRuleInfo {
  scheduleIndex: number;
  rule: ConflictType;
  compoundRule?: CompoundRule;
}

/**
 * Determine which rule schedule entry is active at a given card index,
 * based on cumulative switch thresholds.
 */
function getActiveRule(
  cardIndex: number,
  ruleSchedule: RuleScheduleEntry[],
): ActiveRuleInfo {
  let cumulative = 0;
  for (let i = 0; i < ruleSchedule.length; i++) {
    cumulative += ruleSchedule[i].switchThreshold;
    if (cardIndex < cumulative) {
      return {
        scheduleIndex: i,
        rule: ruleSchedule[i].rule,
        compoundRule: ruleSchedule[i].compoundRule,
      };
    }
  }
  // Past all entries — use the last one
  const last = ruleSchedule[ruleSchedule.length - 1];
  return {
    scheduleIndex: ruleSchedule.length - 1,
    rule: last.rule,
    compoundRule: last.compoundRule,
  };
}

/**
 * Get the card indices where rule switches occur (boundaries).
 */
function getSwitchBoundaries(ruleSchedule: RuleScheduleEntry[]): number[] {
  const boundaries: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < ruleSchedule.length - 1; i++) {
    cumulative += ruleSchedule[i].switchThreshold;
    boundaries.push(cumulative);
  }
  return boundaries;
}

// ── Main Generator ──

/**
 * Generates a complete round structure for SynapSort.
 * Pure function — same inputs always produce the same output.
 */
export function generateRound(
  cardCount: number,
  params: DifficultyParams,
  seed: number,
): RoundStructure {
  const rng = mulberry32(seed);
  const count = Math.max(15, cardCount);

  // Step 1: Generate piles
  const piles = generatePiles(params.pileCount, rng);

  // Step 2: Generate rule schedule
  const ruleSchedule = generateRuleSchedule(params, count, rng);

  // Step 3: Determine switch boundaries
  const switchBoundaries = getSwitchBoundaries(ruleSchedule);

  // Step 4: Determine which cards need to be ambiguous post-switch
  const postSwitchIndices = new Set<number>();
  for (const boundary of switchBoundaries) {
    if (boundary < count) {
      // At least 2 cards after each switch must be ambiguous + isPostSwitch
      for (let offset = 0; offset < 2; offset++) {
        if (boundary + offset < count) {
          postSwitchIndices.add(boundary + offset);
        }
      }
    }
  }

  // Step 5: Determine if we need high ambiguity ratio
  const needHighAmbiguity =
    params.distractorQuality === 'high' || params.distractorQuality === 'maximum';
  const minAmbiguousCount = needHighAmbiguity ? Math.ceil(count * 0.3) : 0;

  // Step 6: Pre-select additional ambiguous card indices if needed
  const ambiguousIndices = new Set<number>(postSwitchIndices);
  if (needHighAmbiguity && ambiguousIndices.size < minAmbiguousCount) {
    // Add more ambiguous cards spread throughout the round
    const nonAmbiguous: number[] = [];
    for (let i = 0; i < count; i++) {
      if (!ambiguousIndices.has(i)) nonAmbiguous.push(i);
    }
    const shuffledNonAmbig = shuffle(nonAmbiguous, rng);
    const needed = minAmbiguousCount - ambiguousIndices.size;
    for (let i = 0; i < needed && i < shuffledNonAmbig.length; i++) {
      ambiguousIndices.add(shuffledNonAmbig[i]);
    }
  }

  // Step 7: Generate sort attempts
  const sortAttempts: SortAttempt[] = [];

  for (let i = 0; i < count; i++) {
    const activeInfo = getActiveRule(i, ruleSchedule);
    const isPostSwitch = postSwitchIndices.has(i);
    const shouldBeAmbiguous = ambiguousIndices.has(i);

    // Pick a random target pile
    const targetPileIndex = Math.floor(rng() * piles.length);

    let card: Card;
    if (shouldBeAmbiguous) {
      card = generateAmbiguousCard(
        targetPileIndex, piles, activeInfo.rule, activeInfo.compoundRule,
        params.enabledRules, rng,
      );
    } else {
      card = generateCardForRule(
        targetPileIndex, piles, activeInfo.rule, activeInfo.compoundRule, rng,
      );
    }

    // Validate: exactly one pile matches under active rule
    const activeMatch = findMatchingPile(card, piles, activeInfo.rule, activeInfo.compoundRule);
    if (activeMatch < 0) {
      // Regenerate with a guaranteed match
      card = generateCardForRule(
        targetPileIndex, piles, activeInfo.rule, activeInfo.compoundRule, rng,
      );
    }

    // Compute correctPileByRule for all rules
    // Find the active compound rule for compound entries
    const activeCompound = findActiveCompoundRule(ruleSchedule);
    const correctPileByRule = computeCorrectPileByRule(
      card, piles, params.enabledRules, activeInfo.compoundRule ?? activeCompound,
    );

    // Override the active rule's entry to ensure it's correct
    const finalActiveMatch = findMatchingPile(card, piles, activeInfo.rule, activeInfo.compoundRule);
    correctPileByRule[activeInfo.rule] = finalActiveMatch;

    // Determine ambiguity: card matches DIFFERENT piles under different rules
    const pileValues = params.enabledRules
      .map(r => correctPileByRule[r])
      .filter(idx => idx >= 0);
    const uniquePiles = new Set(pileValues);
    const isAmbiguous = uniquePiles.size > 1;

    sortAttempts.push({
      card,
      correctPileByRule,
      isAmbiguous,
      isPostSwitch,
    });
  }

  return { piles, sortAttempts, ruleSchedule };
}

/** Find the first compound rule in the schedule (for computing compound matches). */
function findActiveCompoundRule(schedule: RuleScheduleEntry[]): CompoundRule | undefined {
  for (const entry of schedule) {
    if (entry.compoundRule) return entry.compoundRule;
  }
  return undefined;
}
