import {
  DifficultyParams,
  SearchRule,
  SearchType,
  ShapeColor,
  ShapeForm,
  ShapeInstance,
  SHAPE_COLORS,
  SHAPE_FORMS,
  Trial,
  VisualNoiseLevel,
} from '../models/game.models';

/**
 * Mulberry32 seeded PRNG.
 * Returns a function that produces deterministic pseudo-random numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic sequence of trials for a FocusForge round.
 *
 * Pure function — same inputs always produce the same output.
 */
export function generateTrials(
  trialCount: number,
  params: DifficultyParams,
  seed: number,
): Trial[] {
  const rng = mulberry32(seed);

  // 1. Determine search type per trial based on popOutRatio
  const searchTypes = assignSearchTypes(trialCount, params.popOutRatio, rng);

  // 2. Divide into trial blocks and assign rules
  const blockAssignments = assignTrialBlocks(trialCount, params.ruleSwitchInterval, searchTypes, rng);

  // 3. Generate each trial
  const trials: Trial[] = [];
  let prevTargetRegion = -1;

  for (let i = 0; i < trialCount; i++) {
    const { rule, isRuleSwitchTrial, searchType } = blockAssignments[i];

    // Generate shapes for this trial
    const shapes = generateShapes(rule, searchType, params.fieldSize, rng);

    // Position shapes using grid-jitter, avoiding same target region as previous trial
    const positioned = positionShapes(shapes, params.fieldSize, params.visualNoise, rng, prevTargetRegion);

    // Track target region for next trial
    const targetIdx = positioned.findIndex(s => s.isTarget);
    prevTargetRegion = getGridRegion(positioned[targetIdx]);

    trials.push({
      rule,
      shapes: positioned,
      searchType,
      isRuleSwitchTrial,
    });
  }

  return trials;
}


// ── Helpers ──

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Step 1: Assign search types to each trial based on popOutRatio.
 * Computes exact count of feature trials, fills the rest as conjunction, then shuffles.
 */
function assignSearchTypes(
  trialCount: number,
  popOutRatio: number,
  rng: () => number,
): SearchType[] {
  const featureCount = Math.round(trialCount * popOutRatio);
  const types: SearchType[] = [];
  for (let i = 0; i < trialCount; i++) {
    types.push(i < featureCount ? 'feature' : 'conjunction');
  }
  return shuffle(types, rng);
}

interface TrialBlockAssignment {
  rule: SearchRule;
  searchType: SearchType;
  isRuleSwitchTrial: boolean;
}

/**
 * Step 2: Divide trials into blocks and assign rules.
 * If ruleSwitchInterval <= 0, all trials share one rule per search type.
 * Otherwise, blocks of ruleSwitchInterval trials each get a different rule.
 */
function assignTrialBlocks(
  trialCount: number,
  ruleSwitchInterval: number,
  searchTypes: SearchType[],
  rng: () => number,
): TrialBlockAssignment[] {
  const assignments: TrialBlockAssignment[] = [];

  if (ruleSwitchInterval <= 0) {
    // No rule switching — generate one rule per search type encountered
    const ruleCache = new Map<SearchType, SearchRule>();
    for (let i = 0; i < trialCount; i++) {
      const st = searchTypes[i];
      if (!ruleCache.has(st)) {
        ruleCache.set(st, generateSearchRule(st, rng));
      }
      assignments.push({
        rule: ruleCache.get(st)!,
        searchType: st,
        isRuleSwitchTrial: false,
      });
    }
    return assignments;
  }

  // With rule switching: divide into blocks
  let prevRule: SearchRule | null = null;
  for (let i = 0; i < trialCount; i++) {
    const blockIndex = Math.floor(i / ruleSwitchInterval);
    const isFirstInBlock = i % ruleSwitchInterval === 0;
    const st = searchTypes[i];

    if (isFirstInBlock) {
      // Generate a new rule different from the previous one
      let newRule: SearchRule;
      let attempts = 0;
      do {
        newRule = generateSearchRule(st, rng);
        attempts++;
      } while (
        prevRule !== null &&
        newRule.instruction === prevRule.instruction &&
        attempts < 10
      );
      prevRule = newRule;
    }

    assignments.push({
      rule: prevRule!,
      searchType: st,
      isRuleSwitchTrial: isFirstInBlock && blockIndex > 0,
    });
  }

  return assignments;
}


/**
 * Step 3: Generate a SearchRule for a given search type.
 * - Feature search: pick a single distinguishing dimension (form or color).
 *   Instruction like "Find the triangle" or "Find the red shape".
 * - Conjunction search: pick two features (form + color).
 *   Instruction like "Find the red triangle".
 */
function generateSearchRule(searchType: SearchType, rng: () => number): SearchRule {
  if (searchType === 'feature') {
    // Pick whether to distinguish by form or color
    const useForm = rng() < 0.5;
    if (useForm) {
      const form = pickRandom(SHAPE_FORMS, rng);
      return {
        instruction: `Find the ${form}`,
        searchType: 'feature',
        targetFeature: { form },
      };
    } else {
      const color = pickRandom(SHAPE_COLORS, rng);
      return {
        instruction: `Find the ${color} shape`,
        searchType: 'feature',
        targetFeature: { color },
      };
    }
  }

  // Conjunction search: form + color
  const form = pickRandom(SHAPE_FORMS, rng);
  const color = pickRandom(SHAPE_COLORS, rng);
  return {
    instruction: `Find the ${color} ${form}`,
    searchType: 'conjunction',
    targetFeature: { form, color },
  };
}

/**
 * Step 4–5: Generate shapes for a single trial.
 * Creates exactly 1 target + (fieldSize - 1) distractors.
 */
function generateShapes(
  rule: SearchRule,
  searchType: SearchType,
  fieldSize: number,
  rng: () => number,
): ShapeInstance[] {
  const target = createTarget(rule, rng);
  const distractors: ShapeInstance[] = [];

  for (let i = 0; i < fieldSize - 1; i++) {
    if (searchType === 'feature') {
      distractors.push(createFeatureDistractor(rule, target, rng));
    } else {
      distractors.push(createConjunctionDistractor(rule, target, rng));
    }
  }

  // Combine and shuffle so target isn't always first
  const shapes = shuffle([target, ...distractors], rng);
  return shapes;
}

/**
 * Create the target shape matching the rule.
 */
function createTarget(rule: SearchRule, rng: () => number): ShapeInstance {
  const form = rule.targetFeature.form ?? pickRandom(SHAPE_FORMS, rng);
  const color = rule.targetFeature.color ?? pickRandom(SHAPE_COLORS, rng);

  return {
    form,
    color,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1.0,
    isTarget: true,
  };
}

/**
 * Create a distractor for Feature_Search trials.
 * The distractor differs from the target on exactly the distinguishing dimension.
 * All other features match the target.
 */
function createFeatureDistractor(
  rule: SearchRule,
  target: ShapeInstance,
  rng: () => number,
): ShapeInstance {
  let form = target.form;
  let color = target.color;

  if (rule.targetFeature.form !== undefined) {
    // Distinguishing dimension is form — distractor has different form, same color
    const otherForms = SHAPE_FORMS.filter(f => f !== target.form);
    form = pickRandom(otherForms, rng);
  } else if (rule.targetFeature.color !== undefined) {
    // Distinguishing dimension is color — distractor has different color, same form
    const otherColors = SHAPE_COLORS.filter(c => c !== target.color);
    color = pickRandom(otherColors, rng);
  }

  return {
    form,
    color,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1.0,
    isTarget: false,
  };
}

/**
 * Create a distractor for Conjunction_Search trials.
 * Each distractor shares at least one feature (form or color) with the target but not both.
 */
function createConjunctionDistractor(
  rule: SearchRule,
  target: ShapeInstance,
  rng: () => number,
): ShapeInstance {
  // Randomly decide which feature to share: form or color
  const shareForm = rng() < 0.5;

  let form: ShapeForm;
  let color: ShapeColor;

  if (shareForm) {
    // Share form, differ on color
    form = target.form;
    const otherColors = SHAPE_COLORS.filter(c => c !== target.color);
    color = pickRandom(otherColors, rng);
  } else {
    // Share color, differ on form
    color = target.color;
    const otherForms = SHAPE_FORMS.filter(f => f !== target.form);
    form = pickRandom(otherForms, rng);
  }

  return {
    form,
    color,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1.0,
    isTarget: false,
  };
}


/**
 * Step 6: Position shapes using grid-jitter algorithm.
 * - Compute grid: cols = ceil(sqrt(fieldSize * 1.0)), rows = ceil(fieldSize / cols)
 * - Assign shapes to grid cells (shuffled)
 * - Base position = cell center (normalized 0–1)
 * - Jitter = random offset within ±40% of cell size (±50% for 'full' noise)
 * - Clamp x, y to [0, 1]
 *
 * Step 7: Apply visual noise.
 * Step 8: Randomize target position to avoid same grid region on consecutive trials.
 */
function positionShapes(
  shapes: ShapeInstance[],
  fieldSize: number,
  visualNoise: VisualNoiseLevel,
  rng: () => number,
  prevTargetRegion: number,
): ShapeInstance[] {
  const cols = Math.ceil(Math.sqrt(fieldSize * 1.0));
  const rows = Math.ceil(fieldSize / cols);
  const cellW = 1.0 / cols;
  const cellH = 1.0 / rows;

  // Jitter factor: ±40% normally, ±50% for 'full' noise
  const jitterFactor = visualNoise === 'full' ? 0.5 : 0.4;

  // Create shuffled cell indices
  const cellIndices: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    cellIndices.push(i);
  }
  const shuffledCells = shuffle(cellIndices, rng);

  // Find target index and try to avoid same region as previous trial
  const targetIdx = shapes.findIndex(s => s.isTarget);
  if (prevTargetRegion >= 0 && shapes.length > 1) {
    // Try to place target in a different region
    const targetRegion = getGridRegionFromCell(shuffledCells[targetIdx], cols, rows);
    if (targetRegion === prevTargetRegion) {
      // Swap target's cell with another shape's cell that's in a different region
      for (let i = 0; i < shapes.length; i++) {
        if (i === targetIdx) continue;
        const otherRegion = getGridRegionFromCell(shuffledCells[i], cols, rows);
        if (otherRegion !== prevTargetRegion) {
          // Swap cell assignments
          const tmp = shuffledCells[targetIdx];
          shuffledCells[targetIdx] = shuffledCells[i];
          shuffledCells[i] = tmp;
          break;
        }
      }
    }
  }

  // Position each shape in its assigned cell
  const positioned = shapes.map((shape, i) => {
    const cellIdx = shuffledCells[i % shuffledCells.length];
    const col = cellIdx % cols;
    const row = Math.floor(cellIdx / cols);

    // Cell center (normalized 0–1)
    const cx = (col + 0.5) * cellW;
    const cy = (row + 0.5) * cellH;

    // Jitter within cell
    const jx = (rng() * 2 - 1) * jitterFactor * cellW;
    const jy = (rng() * 2 - 1) * jitterFactor * cellH;

    // Clamp to [0, 1]
    const x = Math.max(0, Math.min(1, cx + jx));
    const y = Math.max(0, Math.min(1, cy + jy));

    // Apply visual noise
    const { scale, rotation } = applyVisualNoise(visualNoise, rng);

    return {
      ...shape,
      x,
      y,
      rotation,
      scale,
    };
  });

  return positioned;
}

/**
 * Apply visual noise effects based on the noise level.
 * - 'none': scale=1.0, rotation=0
 * - 'size_variation': scale = 0.8 + random * 0.4 (so [0.8, 1.2])
 * - 'size_rotation': scale variation + rotation = random * 360
 * - 'full': scale variation + rotation + (jitter already handled via ±50%)
 */
function applyVisualNoise(
  visualNoise: VisualNoiseLevel,
  rng: () => number,
): { scale: number; rotation: number } {
  switch (visualNoise) {
    case 'none':
      return { scale: 1.0, rotation: 0 };
    case 'size_variation':
      return { scale: 0.8 + rng() * 0.4, rotation: 0 };
    case 'size_rotation':
      return { scale: 0.8 + rng() * 0.4, rotation: rng() * 360 };
    case 'full':
      return { scale: 0.8 + rng() * 0.4, rotation: rng() * 360 };
  }
}

/**
 * Get the grid region (quadrant) for a positioned shape.
 * Divides the field into 4 quadrants (0–3).
 */
function getGridRegion(shape: ShapeInstance): number {
  const col = shape.x < 0.5 ? 0 : 1;
  const row = shape.y < 0.5 ? 0 : 1;
  return row * 2 + col;
}

/**
 * Get the grid region from a cell index.
 */
function getGridRegionFromCell(cellIdx: number, cols: number, rows: number): number {
  const col = cellIdx % cols;
  const row = Math.floor(cellIdx / cols);
  const regionCol = col < cols / 2 ? 0 : 1;
  const regionRow = row < rows / 2 ? 0 : 1;
  return regionRow * 2 + regionCol;
}
