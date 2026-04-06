import { Injectable, signal, WritableSignal, computed, inject } from '@angular/core';
import {
  GameStage, SlotConfig, MinigameResult, DEFAULT_MATH_CONFIG,
  MINIGAME_REGISTRY, MathEquationsConfig, ProgressionSpeed, MinigameConfig,
  PROGRESSION_INTERVAL_SEC,
} from '../models/game.models';
import { StorageService } from './storage.service';

function createDefaultSlot(): SlotConfig {
  return { minigameId: null, config: { ...DEFAULT_MATH_CONFIG } };
}

function createAssignedSlot(): SlotConfig {
  const first = MINIGAME_REGISTRY[0];
  return { minigameId: first.id, config: { ...first.defaultConfig } };
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService);
  private readonly saved = this.storage.load();

  readonly stage: WritableSignal<GameStage> = signal('idle');
  readonly progressionSpeed: WritableSignal<ProgressionSpeed> = signal(this.saved.progressionSpeed);
  readonly startingDifficulty: WritableSignal<number> = signal(this.saved.startingDifficulty);
  readonly slotConfigs: WritableSignal<[SlotConfig, SlotConfig, SlotConfig]> = signal(this.saved.slotConfigs);
  readonly slotResults: WritableSignal<MinigameResult[]> = signal([]);
  readonly totalScore: WritableSignal<number> = signal(0);
  readonly validationErrors: WritableSignal<number[]> = signal([]);
  readonly sessionElapsedSec: WritableSignal<number> = signal(0);
  readonly maxDifficultyReached: WritableSignal<number> = signal(1);
  readonly currentDifficulty: WritableSignal<number> = signal(1);
  private sessionStartTime = 0;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;

  readonly activeSlots = computed(() => {
    return this.slotConfigs()
      .map((s, i) => ({ config: s, index: i }))
      .filter(s => s.config.minigameId !== null);
  });
  readonly slotCount = computed(() => this.activeSlots().length);

  private persistConfig(): void {
    this.storage.save({
      slotConfigs: this.slotConfigs(),
      progressionSpeed: this.progressionSpeed(),
      startingDifficulty: this.startingDifficulty(),
    });
  }

  setProgressionSpeed(speed: ProgressionSpeed): void {
    if (this.stage() !== 'idle') return;
    this.progressionSpeed.set(speed);
    this.persistConfig();
  }

  setStartingDifficulty(value: number): void {
    if (this.stage() !== 'idle') return;
    this.startingDifficulty.set(Math.max(1, Math.min(100, value)));
    this.persistConfig();
  }

  assignMinigame(slotIndex: number, minigameId: string | null): void {
    if (this.stage() !== 'idle') return;
    const configs = [...this.slotConfigs()] as [SlotConfig, SlotConfig, SlotConfig];
    if (slotIndex < 0 || slotIndex > 2) return;
    if (minigameId === null) {
      configs[slotIndex] = createDefaultSlot();
    } else {
      const entry = MINIGAME_REGISTRY.find(m => m.id === minigameId);
      if (!entry) return;
      configs[slotIndex] = { minigameId, config: { ...entry.defaultConfig } };
    }
    this.slotConfigs.set(configs);
    this.validationErrors.set([]);
    this.persistConfig();
  }

  updateSlotConfig(slotIndex: number, config: Partial<MinigameConfig>): void {
    if (this.stage() !== 'idle') return;
    const configs = [...this.slotConfigs()] as [SlotConfig, SlotConfig, SlotConfig];
    if (slotIndex < 0 || slotIndex > 2) return;
    configs[slotIndex] = {
      ...configs[slotIndex],
      config: { ...configs[slotIndex].config, ...config },
    };
    this.slotConfigs.set(configs);
    this.persistConfig();
  }

  startSession(): void {
    if (this.stage() !== 'idle') return;
    const active = this.activeSlots();
    if (active.length === 0) {
      this.validationErrors.set([0]);
      return;
    }
    this.validationErrors.set([]);
    this.slotResults.set([]);
    this.totalScore.set(0);
    this.stage.set('countdown');
  }

  beginPlaying(): void {
    if (this.stage() !== 'countdown') return;
    this.currentDifficulty.set(this.startingDifficulty());
    this.sessionStartTime = Date.now();
    this.sessionTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.sessionElapsedSec.set(elapsed);
      // Time-based difficulty: +1 every N seconds based on progression speed
      const interval = PROGRESSION_INTERVAL_SEC[this.progressionSpeed()];
      const newDiff = Math.min(100, this.startingDifficulty() + Math.floor(elapsed / interval));
      this.currentDifficulty.set(newDiff);
    }, 500);
    this.stage.set('playing');
  }

  reportSlotComplete(result: MinigameResult): void {
    if (this.stage() !== 'playing') return;
    const results = [...this.slotResults(), result];
    this.slotResults.set(results);
    if (result.maxDifficulty && result.maxDifficulty > this.maxDifficultyReached()) {
      this.maxDifficultyReached.set(result.maxDifficulty);
    }
    this.stopSessionTimer();
    const total = results.reduce((sum, r) => sum + r.score, 0);
    this.totalScore.set(total);
    this.stage.set('summary');
  }

  private stopSessionTimer(): void {
    if (this.sessionTimer !== null) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.sessionElapsedSec.set(Math.floor((Date.now() - this.sessionStartTime) / 1000));
  }

  abortSession(): void {
    if (this.stage() !== 'playing') return;
    this.stopSessionTimer();
    this.slotResults.set([]);
    this.totalScore.set(0);
    this.stage.set('idle');
  }

  dismissSummary(): void {
    if (this.stage() !== 'summary') return;
    this.slotResults.set([]);
    this.totalScore.set(0);
    this.maxDifficultyReached.set(1);
    this.currentDifficulty.set(this.startingDifficulty());
    this.sessionElapsedSec.set(0);
    this.stage.set('idle');
  }

  playAgain(): void {
    if (this.stage() !== 'summary') return;
    this.slotResults.set([]);
    this.totalScore.set(0);
    this.maxDifficultyReached.set(1);
    this.currentDifficulty.set(this.startingDifficulty());
    this.sessionElapsedSec.set(0);
    this.stage.set('idle');
    this.startSession();
  }
}
