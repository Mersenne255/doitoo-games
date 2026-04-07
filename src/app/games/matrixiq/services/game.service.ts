import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  DEFAULT_CONFIG,
  DebugOverrides,
  FeedbackState,
  GameStage,
  MatrixIQConfig,
  Puzzle,
  PuzzleResult,
  RoundResult,
  ScoringState,
  SpeedMode,
} from '../models/game.models';
import { mapDifficultyToParams } from '../utils/difficulty.util';
import { generateSession } from '../utils/puzzle-generator.util';
import {
  calculateRoundResult,
  initialScoringState,
  processPuzzleResult,
} from '../utils/scoring.util';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<MatrixIQConfig> = signal<MatrixIQConfig>(DEFAULT_CONFIG);
  readonly puzzles: WritableSignal<Puzzle[]> = signal<Puzzle[]>([]);
  readonly currentPuzzleIndex: WritableSignal<number> = signal<number>(0);
  readonly feedbackState: WritableSignal<FeedbackState | null> = signal<FeedbackState | null>(null);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  readonly currentPuzzle = computed(() => this.puzzles()[this.currentPuzzleIndex()] ?? null);
  readonly difficultyParams = computed(() =>
    mapDifficultyToParams(this.config().difficulty, this.config().speedMode),
  );

  updateConfig(partial: Partial<MatrixIQConfig>): void {
    const current = this.config();
    const merged: MatrixIQConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 100),
      puzzleCount: clamp(partial.puzzleCount ?? current.puzzleCount, 5, 30),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
      debugOverrides: partial.debugOverrides !== undefined ? partial.debugOverrides : current.debugOverrides,
    };
    this.config.set(merged);
  }

  startSession(): void {
    const cfg = this.config();
    const params = mapDifficultyToParams(cfg.difficulty, cfg.speedMode);
    const generated = generateSession(Date.now(), cfg.difficulty, params, cfg.puzzleCount, cfg.debugOverrides);
    this.puzzles.set(generated);
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.scoringState.set(initialScoringState());
    this.currentPuzzleIndex.set(0);
    this.feedbackState.set(null);
    this.stage.set('playing');
  }

  recordResponse(selectedIndex: number, responseTimeMs: number): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    const correct = selectedIndex === puzzle.correctIndex;
    const result: PuzzleResult = {
      puzzle,
      selectedIndex,
      correct,
      responseTimeMs,
    };

    const params = this.difficultyParams();
    this.scoringState.set(
      processPuzzleResult(this.scoringState(), result, this.config().difficulty, params.responseWindowMs),
    );
    this.feedbackState.set({ result, showExplanation: false });
  }

  recordTimeout(): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    const result: PuzzleResult = {
      puzzle,
      selectedIndex: null,
      correct: false,
      responseTimeMs: null,
    };

    const params = this.difficultyParams();
    this.scoringState.set(
      processPuzzleResult(this.scoringState(), result, this.config().difficulty, params.responseWindowMs),
    );
    this.feedbackState.set({ result, showExplanation: false });
  }

  advancePuzzle(): void {
    this.feedbackState.set(null);
    const nextIndex = this.currentPuzzleIndex() + 1;
    if (nextIndex >= this.puzzles().length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
    } else {
      this.currentPuzzleIndex.set(nextIndex);
    }
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
