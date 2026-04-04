export type GameStage = 'idle' | 'showing' | 'input' | 'result';

export type GameMode = 'sequence' | 'complete' | 'reverse';

export interface ModeConfig {
  numberLength: number;
  timing: number;  // interval (s) for sequence/reverse, duration (s) for complete
}

export type AllConfigs = Record<GameMode, ModeConfig>;

export interface GameResult {
  correct: boolean;
  expected: string;    // the correct answer string
  guess: string;       // the user's guess
}
