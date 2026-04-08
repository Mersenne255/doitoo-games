import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  DEFAULT_CONFIG,
  DifficultyParams,
  RoundResult,
  ScoringState,
  SpeedMode,
  Trial,
  TrialResult,
  VoxelConfig,
  VoxelStage,
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
  readonly stage: WritableSignal<VoxelStage> = signal<VoxelStage>('idle');
  readonly config: WritableSignal<VoxelConfig> = signal<VoxelConfig>(DEFAULT_CONFIG);
  readonly trials: WritableSignal<Trial[]> = signal<Trial[]>([]);
  readonly currentTrialIndex: WritableSignal<number> = signal<number>(0);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  readonly currentTrial = computed(() => this.trials()[this.currentTrialIndex()] ?? null);
  readonly difficultyParams = computed(() => mapDifficultyToParams(this.config().difficulty));

  private currentMemorizationTimeMs = 0;

  updateConfig(partial: Partial<VoxelConfig>): void {
    const current = this.config();
    const merged: VoxelConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 100),
      trialCount: clampStep(partial.trialCount ?? current.trialCount, 5, 20, 5),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
      multiColorMode: typeof partial.multiColorMode === 'boolean'
        ? partial.multiColorMode
        : current.multiColorMode,
    };
    this.config.set(merged);
  }

  startSession(): void {
    const cfg = this.config();
    const params = mapDifficultyToParams(cfg.difficulty);
    const generated = generateTrials(cfg.trialCount, params, cfg.multiColorMode, Date.now());
    this.trials.set(generated);
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.scoringState.set(initialScoringState());
    this.currentTrialIndex.set(0);
    this.currentMemorizationTimeMs = 0;
    this.stage.set('memorizing');
  }

  endMemorization(memorizationTimeMs: number): void {
    this.currentMemorizationTimeMs = memorizationTimeMs;
    this.stage.set('questioning');
  }

  recordResponse(selectedIndex: number, responseTimeMs: number): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const correct = selectedIndex === trial.correctIndex;
    const result: TrialResult = {
      trial,
      selectedIndex,
      correct,
      responseTimeMs,
      memorizationTimeMs: this.currentMemorizationTimeMs,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processTrialResult(this.scoringState(), result, params.responseWindowMs));
  }

  recordTimeout(): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const result: TrialResult = {
      trial,
      selectedIndex: null,
      correct: false,
      responseTimeMs: null,
      memorizationTimeMs: this.currentMemorizationTimeMs,
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
      this.currentMemorizationTimeMs = 0;
      this.stage.set('memorizing');
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
