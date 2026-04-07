import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  ConflictType,
  DEFAULT_CONFIG,
  FeedbackState,
  GameStage,
  RoundResult,
  RoundStructure,
  ScoringState,
  SortResult,
  SynapSortConfig,
  SpeedMode,
} from '../models/game.models';
import { mapDifficultyToParams } from '../utils/difficulty.util';
import { generateRound } from '../utils/card-generator.util';
import {
  calculateRoundResult,
  initialScoringState,
  processSortResult,
} from '../utils/scoring.util';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<SynapSortConfig> = signal<SynapSortConfig>(DEFAULT_CONFIG);
  readonly roundStructure: WritableSignal<RoundStructure | null> = signal<RoundStructure | null>(null);
  readonly currentSortIndex: WritableSignal<number> = signal<number>(0);
  readonly activeRuleIndex: WritableSignal<number> = signal<number>(0);
  readonly previousRule: WritableSignal<ConflictType | null> = signal<ConflictType | null>(null);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly feedbackState: WritableSignal<FeedbackState | null> = signal<FeedbackState | null>(null);
  readonly consecutiveCorrect: WritableSignal<number> = signal<number>(0);

  readonly currentCard = computed(() => {
    const rs = this.roundStructure();
    if (!rs) return null;
    return rs.sortAttempts[this.currentSortIndex()]?.card ?? null;
  });

  readonly currentPiles = computed(() => {
    const rs = this.roundStructure();
    return rs?.piles ?? [];
  });

  readonly activeRule = computed(() => {
    const rs = this.roundStructure();
    if (!rs) return null;
    return rs.ruleSchedule[this.activeRuleIndex()] ?? null;
  });

  readonly difficultyParams = computed(() => mapDifficultyToParams(this.config().difficulty));

  updateConfig(partial: Partial<SynapSortConfig>): void {
    const current = this.config();
    const merged: SynapSortConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 20),
      cardCount: clampStep(partial.cardCount ?? current.cardCount, 15, 40, 5),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
    };
    this.config.set(merged);
  }

  startSession(): void {
    const cfg = this.config();
    const params = mapDifficultyToParams(cfg.difficulty);
    const round = generateRound(cfg.cardCount, params, Date.now());
    this.roundStructure.set(round);
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.scoringState.set(initialScoringState());
    this.currentSortIndex.set(0);
    this.activeRuleIndex.set(0);
    this.previousRule.set(null);
    this.consecutiveCorrect.set(0);
    this.feedbackState.set(null);
    this.roundResult.set(null);
    this.stage.set('playing');
  }

  recordResponse(pileIndex: number, responseTimeMs: number): void {
    const rs = this.roundStructure();
    if (!rs) return;

    const sortAttempt = rs.sortAttempts[this.currentSortIndex()];
    if (!sortAttempt) return;

    const activeEntry = rs.ruleSchedule[this.activeRuleIndex()];
    if (!activeEntry) return;

    const activeRuleType = activeEntry.rule;
    const correctPile = sortAttempt.correctPileByRule[activeRuleType];
    const correct = pileIndex === correctPile;

    // Perseverative error detection: incorrect, and would have been correct under previous rule
    const prev = this.previousRule();
    const isPerseverativeError =
      !correct && prev !== null && pileIndex === sortAttempt.correctPileByRule[prev];

    const result: SortResult = {
      sortAttempt,
      selectedPileIndex: pileIndex,
      correct,
      isPerseverativeError,
      responseTimeMs,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processSortResult(this.scoringState(), result, params.responseWindowMs));

    if (correct) {
      const newConsecutive = this.consecutiveCorrect() + 1;
      this.consecutiveCorrect.set(newConsecutive);

      if (newConsecutive >= activeEntry.switchThreshold) {
        this.triggerRuleSwitch(activeRuleType);
      }
    } else {
      this.consecutiveCorrect.set(0);
    }

    this.feedbackState.set({
      correct,
      isPerseverativeError,
      selectedPileIndex: pileIndex,
      correctPileIndex: correctPile,
    });
  }

  recordTimeout(): void {
    const rs = this.roundStructure();
    if (!rs) return;

    const sortAttempt = rs.sortAttempts[this.currentSortIndex()];
    if (!sortAttempt) return;

    const activeEntry = rs.ruleSchedule[this.activeRuleIndex()];
    if (!activeEntry) return;

    const activeRuleType = activeEntry.rule;
    const correctPile = sortAttempt.correctPileByRule[activeRuleType];

    const result: SortResult = {
      sortAttempt,
      selectedPileIndex: null,
      correct: false,
      isPerseverativeError: false,
      responseTimeMs: null,
    };

    const params = this.difficultyParams();
    this.scoringState.set(processSortResult(this.scoringState(), result, params.responseWindowMs));
    this.consecutiveCorrect.set(0);

    this.feedbackState.set({
      correct: false,
      isPerseverativeError: false,
      selectedPileIndex: -1,
      correctPileIndex: correctPile,
    });
  }

  advanceSortOrEnd(): void {
    this.feedbackState.set(null);
    const rs = this.roundStructure();
    if (!rs) return;

    const nextIndex = this.currentSortIndex() + 1;
    if (nextIndex >= rs.sortAttempts.length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
    } else {
      this.currentSortIndex.set(nextIndex);
    }
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  private triggerRuleSwitch(oldRule: ConflictType): void {
    this.previousRule.set(oldRule);
    this.activeRuleIndex.update(i => i + 1);
    this.consecutiveCorrect.set(0);

    // Check if the player discovered the rule (they reached the switch threshold,
    // meaning they had consecutive correct sorts under the current rule)
    this.scoringState.update(state => ({
      ...state,
      rulesDiscoveredCount: state.rulesDiscoveredCount + 1,
    }));
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampStep(value: number, min: number, max: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, rounded));
}
