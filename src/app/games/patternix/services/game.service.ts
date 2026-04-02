import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import {
  GameStage,
  PatternixConfig,
  ScoringState,
  RoundResult,
  PuzzleOutcome,
  PuzzleResult,
} from '../models/game.models';
import { StorageService } from './storage.service';
import { validateConfig } from '../utils/difficulty.util';
import {
  initialScoringState,
  updateScoringState,
  calculateRoundResult,
} from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService);

  // ── Signals ──
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<PatternixConfig> = signal<PatternixConfig>(this.storage.loadConfig());
  readonly currentPuzzleIndex: WritableSignal<number> = signal(0);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  // ── Public methods ──

  updateConfig(partial: Partial<PatternixConfig>): void {
    const merged = validateConfig({ ...this.config(), ...partial });
    this.config.set(merged);
    this.storage.saveConfig(merged);
  }

  startSession(): void {
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.currentPuzzleIndex.set(0);
    this.scoringState.set(initialScoringState());
    this.roundResult.set(null);
    this.stage.set('playing');
  }

  recordAnswer(outcome: PuzzleOutcome, responseTimeMs: number | null): void {
    const result: PuzzleResult = { outcome, responseTimeMs };
    this.scoringState.set(updateScoringState(this.scoringState(), result));
    this.currentPuzzleIndex.update(i => i + 1);
  }

  endRound(): void {
    const result = calculateRoundResult(
      this.scoringState().results,
      this.config().difficulty,
    );
    this.roundResult.set(result);
    this.stage.set('summary');
  }

  abortSession(): void {
    this.resetState();
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  playAgain(): void {
    this.resetState();
    this.startSession();
  }

  // ── Private helpers ──

  private resetState(): void {
    this.currentPuzzleIndex.set(0);
    this.scoringState.set(initialScoringState());
    this.roundResult.set(null);
  }
}
