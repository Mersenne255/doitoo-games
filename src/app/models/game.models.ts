export type GameStage = 'idle' | 'showing' | 'input' | 'result';

export type GameMode = 'sequence' | 'complete';

export interface Config {
  numberLength: number;
  interval: number;   // ms, used in sequence mode
  duration: number;    // ms, used in complete mode
}

export interface GameResult {
  correct: boolean;
  expected: string;    // the correct answer string
  guess: string;       // the user's guess
}
