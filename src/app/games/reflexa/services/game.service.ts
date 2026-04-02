import { Injectable, signal, WritableSignal } from '@angular/core';
import {
  GameStage,
  ReflexaConfig,
  DEFAULT_CONFIG,
  ScoringState,
  RoundResult,
  TrialResult,
  ActiveRule,
} from '../models/game.models';
import { validateConfig, StorageService } from './storage.service';
import { calculateRoundResult } from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<ReflexaConfig> = signal<ReflexaConfig>(DEFAULT_CONFIG);
  readonly currentTrialIndex: WritableSignal<number> = signal(0);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>({
    results: [],
    currentStreak: 0,
    longestStreak: 0,
  });
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly activeRule: WritableSignal<ActiveRule | null> = signal<ActiveRule | null>(null);

  private readonly storage = new StorageService();

  updateConfig(partial: Partial<ReflexaConfig>): void {
    const merged = validateConfig({ ...this.config(), ...partial });
    this.config.set(merged);
    this.storage.saveConfig(merged);
  }

  startSession(): void {
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.stage.set('playing');
    this.currentTrialIndex.set(0);
    this.scoringState.set({ results: [], currentStreak: 0, longestStreak: 0 });
    this.roundResult.set(null);
  }

  recordTrialResult(result: TrialResult): void {
    const state = this.scoringState();
    const isCorrect = result.outcome === 'correct_go' || result.outcome === 'correct_nogo';
    const newStreak = isCorrect ? state.currentStreak + 1 : 0;
    const longestStreak = Math.max(state.longestStreak, newStreak);

    this.scoringState.set({
      results: [...state.results, result],
      currentStreak: newStreak,
      longestStreak,
    });

    this.currentTrialIndex.update(i => i + 1);
  }

  endRound(): void {
    const state = this.scoringState();
    const cfg = this.config();
    const result = calculateRoundResult(state.results, cfg.difficulty);
    this.roundResult.set(result);
    this.stage.set('summary');
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  playAgain(): void {
    this.startSession();
  }
}
