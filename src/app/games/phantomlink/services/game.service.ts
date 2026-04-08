import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  BindingChangeEvent,
  BindingMap,
  ColorName,
  DEFAULT_CONFIG,
  GameStage,
  MAX_SYMBOL_COUNT,
  PhantomLinkConfig,
  RoundResult,
  RoundStructure,
  ScoringState,
  TrialResult,
} from '../models/game.models';
import { generateRound } from '../utils/round-generator.util';
import {
  calculateRoundResult,
  initialScoringState,
  processTrialResult,
} from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<PhantomLinkConfig> = signal<PhantomLinkConfig>(DEFAULT_CONFIG);
  readonly playPhase: WritableSignal<'learning' | 'trial'> = signal<'learning' | 'trial'>('learning');
  readonly roundStructure: WritableSignal<RoundStructure | null> = signal<RoundStructure | null>(null);
  readonly currentTrialIndex: WritableSignal<number> = signal<number>(0);
  readonly currentBindingMap: WritableSignal<BindingMap> = signal<BindingMap>({} as BindingMap);
  /** Binding change that just happened — shown inline while the next trial is active */
  readonly lastBindingChange: WritableSignal<BindingChangeEvent | null> = signal<BindingChangeEvent | null>(null);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  readonly currentTrial = computed(() => {
    const rs = this.roundStructure();
    if (!rs) return null;
    return rs.trials[this.currentTrialIndex()] ?? null;
  });

  updateConfig(partial: Partial<PhantomLinkConfig>): void {
    const current = this.config();
    this.config.set({
      symbolCount: clamp(partial.symbolCount ?? current.symbolCount, 3, MAX_SYMBOL_COUNT),
    });
  }

  startSession(): void {
    const cfg = this.config();
    const round = generateRound(200, cfg.symbolCount, Date.now());
    this.roundStructure.set(round);
    this.scoringState.set(initialScoringState());
    this.currentTrialIndex.set(0);
    this.currentBindingMap.set({ ...round.initialBindingMap } as BindingMap);
    this.lastBindingChange.set(null);
    this.roundResult.set(null);
    this.stage.set('playing');
    this.playPhase.set('learning');
  }

  onLearningDone(): void {
    this.playPhase.set('trial');
  }

  recordResponse(selectedColor: ColorName, responseTimeMs: number): void {
    const trial = this.currentTrial();
    if (!trial) return;

    const correct = selectedColor === trial.correctColor;
    const isPhantomError = !correct && trial.phantomColor !== null && selectedColor === trial.phantomColor;

    const result: TrialResult = { trial, selectedColor, correct, isPhantomError, responseTimeMs };
    this.scoringState.set(processTrialResult(this.scoringState(), result, 0));
  }

  lastResponseWasFailure(): boolean {
    const state = this.scoringState();
    return state.currentStreak === 0 && (state.incorrectCount + state.timedOutCount) > 0;
  }

  advanceTrialOrEnd(): void {
    const rs = this.roundStructure();
    if (!rs) return;

    if (this.lastResponseWasFailure()) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
      return;
    }

    const nextIndex = this.currentTrialIndex() + 1;
    if (nextIndex >= rs.trials.length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
      return;
    }

    // Apply binding change immediately and expose it for inline display
    const changeEvent = rs.bindingChanges.find(e => e.beforeTrialIndex === nextIndex);
    if (changeEvent) {
      this.applyBindingChange(changeEvent);
      this.lastBindingChange.set(changeEvent);
    } else {
      this.lastBindingChange.set(null);
    }

    this.currentTrialIndex.set(nextIndex);
  }

  abortSession(): void {
    this.lastBindingChange.set(null);
    this.stage.set('idle');
  }
  goToIdle(): void {
    this.lastBindingChange.set(null);
    this.stage.set('idle');
  }

  private applyBindingChange(event: BindingChangeEvent): void {
    const map = { ...this.currentBindingMap() };
    for (const change of event.changes) {
      map[change.symbol] = change.newColor;
    }
    this.currentBindingMap.set(map as BindingMap);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
