import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  DEFAULT_CONFIG,
  FocusforgeConfig,
  GameStage,
  RoundResult,
  ScoringState,
  SearchRule,
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
import { StorageService } from './storage.service';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<FocusforgeConfig> = signal<FocusforgeConfig>(DEFAULT_CONFIG);
  readonly trials: WritableSignal<Trial[]> = signal<Trial[]>([]);
  readonly currentTrialIndex: WritableSignal<number> = signal<number>(0);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly currentRule: WritableSignal<SearchRule | null> = signal<SearchRule | null>(null);
  readonly ruleJustSwitched: WritableSignal<boolean> = signal<boolean>(false);

  readonly currentTrial = computed(() => this.trials()[this.currentTrialIndex()] ?? null);
  readonly difficultyParams = computed(() => mapDifficultyToParams(this.config().difficulty));

  constructor(private readonly storageService: StorageService) {}

  updateConfig(partial: Partial<FocusforgeConfig>): void {
    const current = this.config();
    const merged: FocusforgeConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 20),
      trialCount: clampStep(partial.trialCount ?? current.trialCount, 10, 50, 5),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
    };
    this.config.set(merged);
    this.storageService.saveConfig(merged);
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
    this.ruleJustSwitched.set(false);

    const allTrials = this.trials();
    if (allTrials.length > 0) {
      this.currentRule.set(allTrials[0].rule);
    }

    this.stage.set('playing');
  }

  recordResponse(shapeIndex: number, responseTimeMs: number): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const correct = trial.shapes[shapeIndex]?.isTarget ?? false;
    const result: TrialResult = {
      trial,
      tappedShapeIndex: shapeIndex,
      correct,
      responseTimeMs,
      searchType: trial.searchType,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processTrialResult(this.scoringState(), result, params.responseWindowMs));
  }

  recordTimeout(): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const result: TrialResult = {
      trial,
      tappedShapeIndex: null,
      correct: false,
      responseTimeMs: null,
      searchType: trial.searchType,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processTrialResult(this.scoringState(), result, params.responseWindowMs));
  }

  advanceTrialOrEnd(): void {
    const nextIndex = this.currentTrialIndex() + 1;
    const allTrials = this.trials();

    if (nextIndex >= allTrials.length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
      return;
    }

    this.currentTrialIndex.set(nextIndex);

    const nextTrial = allTrials[nextIndex];
    if (nextTrial.isRuleSwitchTrial) {
      this.currentRule.set(nextTrial.rule);
      this.ruleJustSwitched.set(true);
    } else {
      this.ruleJustSwitched.set(false);
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
