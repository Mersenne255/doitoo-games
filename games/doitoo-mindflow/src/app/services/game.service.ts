import { Injectable, signal, WritableSignal } from '@angular/core';
import {
  GameStage,
  MindFlowConfig,
  DEFAULT_CONFIG,
  ScoringState,
  RoundResult,
} from '../models/game.models';
import { validateConfig } from '../utils/config-validation.util';
import {
  initialScoringState,
  processCorrectDelivery,
  processMisdelivery,
  calculateAccuracy,
} from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<MindFlowConfig> = signal<MindFlowConfig>(DEFAULT_CONFIG);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly elapsedTimeMs: WritableSignal<number> = signal<number>(0);

  private roundStartTime = 0;

  updateConfig(partial: Partial<MindFlowConfig>): void {
    const merged = validateConfig({ ...this.config(), ...partial });
    this.config.set(merged);
  }

  startSession(): void {
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.stage.set('playing');
    this.roundStartTime = Date.now();
    this.scoringState.set(initialScoringState());
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  onDelivery(correct: boolean, spawnTime: number, deliveryTime: number): void {
    const current = this.scoringState();
    const next = correct
      ? processCorrectDelivery(current, spawnTime, deliveryTime)
      : processMisdelivery(current);
    this.scoringState.set(next);
  }

  onRoundEnd(): void {
    const elapsed = Date.now() - this.roundStartTime;
    this.elapsedTimeMs.set(elapsed);

    const state = this.scoringState();
    const cfg = this.config();

    const result: RoundResult = {
      score: state.score,
      correctDeliveries: state.correctDeliveries,
      misdeliveries: state.misdeliveries,
      accuracy: calculateAccuracy(state.correctDeliveries, state.misdeliveries),
      elapsedTimeMs: elapsed,
      longestStreak: state.longestStreak,
      trainCount: cfg.trainCount,
      shapeCount: cfg.shapeCount,
    };

    this.roundResult.set(result);
    this.stage.set('summary');
  }
}
