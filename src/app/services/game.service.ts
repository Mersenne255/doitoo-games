import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { GameStage, GameMode, ModeConfig, AllConfigs, GameResult } from '../models/game.models';
import { StorageService } from './storage.service';
import { generateRandomDigits } from '../utils/random.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storageService = inject(StorageService);

  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly mode: WritableSignal<GameMode>;
  readonly displayValue: WritableSignal<string> = signal<string>('');
  readonly inputValue: WritableSignal<string> = signal<string>('');
  readonly result: WritableSignal<GameResult | null> = signal<GameResult | null>(null);
  readonly configs: WritableSignal<AllConfigs>;

  /** The active mode's config, derived from mode + configs */
  readonly config = computed<ModeConfig>(() => this.configs()[this.mode()]);

  private sequence: string[] = [];
  private showingResolve: (() => void) | null = null;

  constructor() {
    this.mode = signal<GameMode>(this.storageService.loadMode());
    this.configs = signal<AllConfigs>(this.storageService.loadConfigs());
  }

  async startGame(): Promise<void> {
    this.cancelShowing();
    this.inputValue.set('');
    this.result.set(null);
    await new Promise(res => setTimeout(res, 100));

    const cfg = this.config();
    const digits = generateRandomDigits(cfg.numberLength);

    if (this.mode() === 'sequence' || this.mode() === 'reverse') {
      this.sequence = digits;
      this.stage.set('showing');
      for (const num of this.sequence) {
        this.displayValue.set(num);
        const skipped = await this.cancellableWait(cfg.timing);
        if (skipped) return;
        this.displayValue.set('');
        const skipped2 = await this.cancellableWait(100);
        if (skipped2) return;
      }
    } else {
      const num = digits.join('');
      this.sequence = [num];
      this.displayValue.set(num);
      this.stage.set('showing');
      const skipped = await this.cancellableWait(cfg.timing);
      if (skipped) return;
    }

    this.displayValue.set('');
    this.stage.set('input');
  }

  private cancellableWait(ms: number): Promise<boolean> {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.showingResolve = null;
        resolve(false);
      }, ms);
      this.showingResolve = () => {
        clearTimeout(timer);
        this.showingResolve = null;
        resolve(true);
      };
    });
  }

  private cancelShowing(): void {
    if (this.showingResolve) {
      this.showingResolve();
    }
  }

  appendDigit(digit: string): void {
    if (this.stage() !== 'input') return;
    if (this.inputValue().length >= this.config().numberLength) return;
    this.inputValue.update(v => v + digit);
    if (this.inputValue().length >= this.config().numberLength) {
      this.evaluate();
    }
  }

  deleteLast(): void {
    if (this.stage() !== 'input') return;
    this.inputValue.update(v => v.slice(0, -1));
  }

  confirm(): void {
    if (this.stage() === 'showing') {
      this.cancelShowing();
      this.displayValue.set('');
      this.stage.set('input');
      this.evaluate();
      return;
    }
    if (this.stage() !== 'input') return;
    this.evaluate();
  }

  private evaluate(): void {
    const raw = this.sequence.join('');
    const correct = this.mode() === 'reverse' ? [...raw].reverse().join('') : raw;
    const guess = this.inputValue().trim();
    const isCorrect = guess === correct;
    this.result.set({ correct: isCorrect, expected: correct, guess });
    this.stage.set('result');
  }

  setMode(mode: GameMode): void {
    this.mode.set(mode);
    this.storageService.saveMode(mode);
  }

  updateConfig(partial: Partial<ModeConfig>): void {
    this.configs.update(all => ({
      ...all,
      [this.mode()]: { ...all[this.mode()], ...partial },
    }));
    this.storageService.saveConfigs(this.configs());
  }
}
