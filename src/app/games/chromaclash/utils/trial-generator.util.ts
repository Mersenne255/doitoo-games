import {
  ColorName,
  COLOR_DISPLAY_LABELS,
  COLOR_NAMES,
  ConflictType,
  DifficultyParams,
  SEMANTIC_WORDS,
  Trial,
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
 * Generates a deterministic sequence of trials for a Chromaclash round.
 *
 * Pure function — same inputs always produce the same output.
 */
export function generateTrials(
  trialCount: number,
  params: DifficultyParams,
  seed: number,
): Trial[] {
  const rng = mulberry32(seed);
  const trials: Trial[] = [];

  // Pre-compute congruent count to guarantee ratio within tolerance
  const congruentCount = Math.round(trialCount * params.congruentRatio);
  const congruentFlags = new Array<boolean>(trialCount).fill(false);
  for (let i = 0; i < congruentCount; i++) {
    congruentFlags[i] = true;
  }
  // Shuffle the flags so congruent trials are distributed randomly
  const shuffledFlags = shuffle(congruentFlags, rng);

  for (let i = 0; i < trialCount; i++) {
    const congruent = shuffledFlags[i];
    const conflictType = pickRandom(params.conflictTypes, rng);
    const inkColor = pickRandom([...COLOR_NAMES], rng);

    if (congruent) {
      trials.push(buildCongruentTrial(inkColor, params.optionsCount, rng));
    } else {
      trials.push(buildIncongruentTrial(inkColor, conflictType, params.optionsCount, rng));
    }
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

function buildOptions(
  correctColor: ColorName,
  count: number,
  rng: () => number,
): ColorName[] {
  const others = COLOR_NAMES.filter(c => c !== correctColor);
  const fillers: ColorName[] = [];
  const shuffledOthers = shuffle([...others], rng);

  for (let i = 0; fillers.length < count - 1 && i < shuffledOthers.length; i++) {
    fillers.push(shuffledOthers[i]);
  }

  return shuffle([correctColor, ...fillers], rng);
}

function buildCongruentTrial(
  inkColor: ColorName,
  optionsCount: number,
  rng: () => number,
): Trial {
  return {
    word: COLOR_DISPLAY_LABELS[inkColor],
    inkColor,
    congruent: true,
    conflictType: 'classic_stroop',
    options: buildOptions(inkColor, optionsCount, rng),
  };
}

function buildIncongruentTrial(
  inkColor: ColorName,
  conflictType: ConflictType,
  optionsCount: number,
  rng: () => number,
): Trial {
  switch (conflictType) {
    case 'classic_stroop':
      return buildClassicStroopTrial(inkColor, optionsCount, rng);
    case 'semantic_interference':
      return buildSemanticTrial(inkColor, optionsCount, rng);
    case 'response_competition':
      return buildResponseCompetitionTrial(inkColor, optionsCount, rng);
  }
}

function buildClassicStroopTrial(
  inkColor: ColorName,
  optionsCount: number,
  rng: () => number,
): Trial {
  const otherColors = COLOR_NAMES.filter(c => c !== inkColor);
  const wordColor = pickRandom(otherColors, rng);

  return {
    word: COLOR_DISPLAY_LABELS[wordColor],
    inkColor,
    congruent: false,
    conflictType: 'classic_stroop',
    options: buildOptions(inkColor, optionsCount, rng),
  };
}

function buildSemanticTrial(
  inkColor: ColorName,
  optionsCount: number,
  rng: () => number,
): Trial {
  // Pick a semantic word whose associated color differs from the ink color
  const candidates = SEMANTIC_WORDS.filter(sw => sw.associatedColor !== inkColor);

  // Fallback: if no candidates (shouldn't happen with 6 colors), use classic stroop
  if (candidates.length === 0) {
    return buildClassicStroopTrial(inkColor, optionsCount, rng);
  }

  const entry = pickRandom(candidates, rng);

  return {
    word: entry.word,
    inkColor,
    congruent: false,
    conflictType: 'semantic_interference',
    options: buildOptions(inkColor, optionsCount, rng),
  };
}

function buildResponseCompetitionTrial(
  inkColor: ColorName,
  optionsCount: number,
  rng: () => number,
): Trial {
  // Target word: classic stroop (different color name)
  const otherColors = COLOR_NAMES.filter(c => c !== inkColor);
  const wordColor = pickRandom(otherColors, rng);

  // Generate 1–2 distractor words with different ink colors
  const distractorCount = 1 + Math.floor(rng() * 2); // 1 or 2
  const distractorWords: { word: string; inkColor: ColorName }[] = [];

  for (let d = 0; d < distractorCount; d++) {
    const dInk = pickRandom(otherColors, rng);
    const dWordColorCandidates = COLOR_NAMES.filter(c => c !== dInk);
    const dWordColor = pickRandom(dWordColorCandidates, rng);
    distractorWords.push({
      word: COLOR_DISPLAY_LABELS[dWordColor],
      inkColor: dInk,
    });
  }

  return {
    word: COLOR_DISPLAY_LABELS[wordColor],
    inkColor,
    congruent: false,
    conflictType: 'response_competition',
    options: buildOptions(inkColor, optionsCount, rng),
    distractorWords,
  };
}
