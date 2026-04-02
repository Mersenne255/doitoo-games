import {
  ActiveRule,
  ArrowDirection,
  ColorName,
  COLOR_NAMES,
  RuleType,
  Stimulus,
  StimulusPosition,
} from '../models/game.models';

const ARROW_SYMBOLS: Record<ArrowDirection, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

const POSITION_LABELS: Record<StimulusPosition, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
};

/** Create a Stroop stimulus: a color word displayed in a (possibly different) color. */
export function createStroopStimulus(
  displayColor: ColorName,
  wordColor: ColorName,
  position: StimulusPosition,
  isNogo: boolean,
): Stimulus {
  return {
    content: wordColor.toUpperCase(),
    displayColor,
    position,
    isNogo,
  };
}

/** Create a directional stimulus: an arrow pointing in a given direction. */
export function createDirectionalStimulus(
  arrowDir: ArrowDirection,
  displayColor: ColorName,
  position: StimulusPosition,
  isNogo: boolean,
): Stimulus {
  return {
    content: ARROW_SYMBOLS[arrowDir],
    displayColor,
    position,
    arrowDirection: arrowDir,
    isNogo,
  };
}

/** Get the correct response for a stimulus given the active rule. Returns null for NoGo. */
export function getCorrectResponse(stimulus: Stimulus, rule: ActiveRule): string | null {
  if (stimulus.isNogo) return null;

  switch (rule.type) {
    case 'color':
      return stimulus.displayColor;
    case 'word':
      return stimulus.content.toLowerCase();
    case 'direction':
      return stimulus.arrowDirection ?? stimulus.displayColor;
    case 'position':
      return stimulus.position;
  }
}

/** Check if the automatic (naive) response matches the correct response. */
export function isCongruent(stimulus: Stimulus, rule: ActiveRule): boolean {
  if (stimulus.isNogo) return false;

  const correct = getCorrectResponse(stimulus, rule);

  // The "automatic" response depends on the rule type:
  // - color rule: automatic response is the word content (reading the word)
  // - word rule: automatic response is the display color (seeing the color)
  // - direction rule: automatic response is the arrow direction itself
  // - position rule: automatic response is the position
  let automatic: string;
  switch (rule.type) {
    case 'color':
      automatic = stimulus.content.toLowerCase(); // read the word
      break;
    case 'word':
      automatic = stimulus.displayColor; // see the color
      break;
    case 'direction':
      automatic = stimulus.arrowDirection ?? '';
      break;
    case 'position':
      automatic = stimulus.position;
      break;
  }

  return automatic === correct;
}

/** Build an ActiveRule for a given rule type. */
export function getRuleForType(ruleType: RuleType): ActiveRule {
  switch (ruleType) {
    case 'color':
      return {
        type: 'color',
        instruction: 'Tap the COLOR',
        responseOptions: [...COLOR_NAMES],
      };
    case 'word':
      return {
        type: 'word',
        instruction: 'Tap the WORD',
        responseOptions: [...COLOR_NAMES],
      };
    case 'direction':
      return {
        type: 'direction',
        instruction: 'Tap the DIRECTION',
        responseOptions: ['up', 'down', 'left', 'right'],
      };
    case 'position':
      return {
        type: 'position',
        instruction: 'Tap the POSITION',
        responseOptions: ['left', 'center', 'right'],
      };
  }
}
