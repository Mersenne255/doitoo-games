import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  ChromaclashConfig,
  ColorName,
  DEFAULT_CONFIG,
  DifficultyParams,
  GameStage,
  RoundResult,
  ScoringState,
  SpeedMode,
  Trial,
  TrialResult,
} from '../models/game.models';
import { mapDifficultyToParams } from '../utils/difficulty.util';
import { generateTrials } from '../utils/trial-generator.util';
import {
  calculateRoundResult,
  initialScoringState,
  processTrialResult,
} from '../utils/scoring.util';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<ChromaclashConfig> = signal<ChromaclashConfig>(DEFAULT_CONFIG);
  readonly trials: WritableSignal<Trial[]> = signal<Trial[]>([]);
  readonly currentTrialIndex: WritableSignal<number> = signal<number>(0);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  readonly currentTrial = computed(() => this.trials()[this.currentTrialIndex()] ?? null);
  readonly difficultyParams = computed(() => mapDifficultyToParams(this.config().difficulty));

  updateConfig(partial: Partial<ChromaclashConfig>): void {
    const current = this.config();
    const merged: ChromaclashConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 20),
      trialCount: clampStep(partial.trialCount ?? current.trialCount, 10, 50, 5),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
    };
    this.config.set(merged);
  }

  startSession(): void {
    const cfg = this.config();
    const params = mapDifficultyToParams(cfg.difficulty);
    const generated = generateTrials(cfg.trialCount, params, Date.now());
    this.trials.set(generated);
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.scoringState.set(initialScoringState());
    this.currentTrialIndex.set(0);
    this.stage.set('playing');
  }

  recordResponse(selectedColor: ColorName, responseTimeMs: number): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const correct = selectedColor === trial.inkColor;
    const result: TrialResult = {
      trial,
      selectedColor,
      correct,
      responseTimeMs,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processTrialResult(this.scoringState(), result, params.responseWindowMs));
  }

  recordTimeout(): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const result: TrialResult = {
      trial,
      selectedColor: null,
      correct: false,
      responseTimeMs: null,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processTrialResult(this.scoringState(), result, params.responseWindowMs));
  }

  advanceTrialOrEnd(): void {
    const nextIndex = this.currentTrialIndex() + 1;
    if (nextIndex >= this.trials().length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
    } else {
      this.currentTrialIndex.set(nextIndex);
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

function clampStep(value: number, min: number, max: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, rounded));
}
