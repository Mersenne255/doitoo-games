import {
  ArrowDirection,
  ColorName,
  COLOR_NAMES,
  ConflictType,
  RuleType,
  StimulusPosition,
  Trial,
} from '../models/game.models';
import { getDifficultyParams } from './difficulty.util';
import {
  createDirectionalStimulus,
  createStroopStimulus,
  getCorrectResponse,
  getRuleForType,
  isCongruent as checkCongruent,
} from './stimulus.util';

// ── Seeded PRNG (mulberry32) ──
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickExcluding<T>(arr: readonly T[], exclude: T, rand: () => number): T {
  const filtered = arr.filter(v => v !== exclude);
  return filtered.length > 0 ? pick(filtered, rand) : arr[0];
}

const POSITIONS: readonly StimulusPosition[] = ['left', 'center', 'right'];
const ARROW_DIRS: readonly ArrowDirection[] = ['up', 'down', 'left', 'right'];
const STROOP_RULES: readonly RuleType[] = ['color', 'word'];
const ALL_RULES: readonly RuleType[] = ['color', 'word', 'direction', 'position'];

/**
 * Generate a single trial. Pure function — deterministic given the same inputs.
 */
export function generateTrial(
  difficulty: number,
  trialIndex: number,
  totalTrials: number,
  seed: number,
): Trial {
  const rand = mulberry32(seed + trialIndex * 7919);
  const params = getDifficultyParams(difficulty);

  // Determine if this is a NoGo trial
  const isNogo = params.nogoFrequency > 0 && rand() < params.nogoFrequency;

  // Determine if this is a congruent trial (among Go trials)
  const congruentTarget = 1 - params.incongruentRatio;
  const shouldBeCongruent = !isNogo && rand() < congruentTarget;

  // Determine rule type based on available conflict types and rule switching
  let ruleType: RuleType;
  const hasDirectional = params.conflictTypes.includes('directional');
  if (hasDirectional && rand() < 0.3) {
    ruleType = 'direction';
  } else {
    ruleType = pick(STROOP_RULES, rand);
  }

  // Handle rule switching
  let isRuleSwitch = false;
  if (params.ruleSwitchInterval !== null && trialIndex > 0 && trialIndex % params.ruleSwitchInterval === 0) {
    isRuleSwitch = true;
    const availableRules = hasDirectional ? ALL_RULES : STROOP_RULES;
    ruleType = pickExcluding(availableRules, ruleType, rand);
  }

  const activeRule = getRuleForType(ruleType);

  // Select conflict types for this trial
  const trialConflicts: ConflictType[] = [];
  if (isNogo) {
    trialConflicts.push('nogo');
  }

  // Build the stimulus based on conflict type
  const displayColor = pick(COLOR_NAMES, rand);
  const position = pick(POSITIONS, rand);

  let trial: Trial;

  if (ruleType === 'direction') {
    // Directional stimulus
    const arrowDir = pick(ARROW_DIRS, rand);
    const actualArrowDir = shouldBeCongruent ? arrowDir : pickExcluding(ARROW_DIRS, arrowDir, rand);
    trialConflicts.push('directional');

    // Apply Simon conflict at higher difficulties
    let stimPosition = position;
    if (params.conflictTypes.includes('simon') && rand() < 0.5 && !shouldBeCongruent) {
      trialConflicts.push('simon');
    }

    const stimulus = createDirectionalStimulus(actualArrowDir, displayColor, stimPosition, isNogo);
    const correctResponse = getCorrectResponse(stimulus, activeRule);
    const congruent = !isNogo && checkCongruent(stimulus, activeRule);

    trial = {
      index: trialIndex,
      stimulus,
      conflictTypes: trialConflicts,
      isCongruent: congruent,
      correctResponse,
      activeRule,
      responseWindowMs: params.responseWindowMs,
      isRuleSwitch,
    };
  } else {
    // Stroop stimulus (color/word rule)
    const wordColor = shouldBeCongruent
      ? displayColor
      : pickExcluding(COLOR_NAMES, displayColor, rand);

    trialConflicts.push('stroop');

    // Apply Simon conflict
    if (params.conflictTypes.includes('simon') && rand() < 0.5 && !shouldBeCongruent) {
      trialConflicts.push('simon');
    }

    const stimulus = createStroopStimulus(displayColor, wordColor, position, isNogo);
    const correctResponse = getCorrectResponse(stimulus, activeRule);
    const congruent = !isNogo && checkCongruent(stimulus, activeRule);

    trial = {
      index: trialIndex,
      stimulus,
      conflictTypes: trialConflicts,
      isCongruent: congruent,
      correctResponse,
      activeRule,
      responseWindowMs: params.responseWindowMs,
      isRuleSwitch,
    };
  }

  return trial;
}

/**
 * Generate all trials for a round, enforcing global constraints:
 * - Congruent ratio within target range
 * - No more than 3 consecutive NoGo trials
 * - Rule switch schedule
 */
export function generateRound(difficulty: number, trialCount: number, seed: number): Trial[] {
  const params = getDifficultyParams(difficulty);
  const trials: Trial[] = [];
  let consecutiveNogo = 0;

  for (let i = 0; i < trialCount; i++) {
    let trial = generateTrial(difficulty, i, trialCount, seed);

    // Enforce max 3 consecutive NoGo constraint
    if (trial.stimulus.isNogo) {
      if (consecutiveNogo >= params.maxConsecutiveNogo) {
        // Regenerate as a Go trial by using a different seed offset
        trial = generateTrial(difficulty, i, trialCount, seed + 100000);
        // If still NoGo, force it to Go
        if (trial.stimulus.isNogo) {
          trial = {
            ...trial,
            stimulus: { ...trial.stimulus, isNogo: false },
            conflictTypes: trial.conflictTypes.filter(c => c !== 'nogo'),
            correctResponse: trial.activeRule.responseOptions[0],
            isCongruent: false,
          };
        }
        consecutiveNogo = 0;
      } else {
        consecutiveNogo++;
      }
    } else {
      consecutiveNogo = 0;
    }

    trials.push(trial);
  }

  return trials;
}
