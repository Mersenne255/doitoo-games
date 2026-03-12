import { Injectable, signal, inject, WritableSignal } from '@angular/core';
import { GameStage, GameMode, Config, GameResult } from '../models/game.models';
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
  readonly config: WritableSignal<Config>;

  private sequence: string[] = [];

  constructor() {
    this.mode = signal<GameMode>(this.storageService.loadMode());
    this.config = signal<Config>(this.storageService.loadConfig());
  }

  async startGame(): Promise<void> {
    this.inputValue.set('');
    this.result.set(null);
    await new Promise(res => setTimeout(res, 100));

    const digits = generateRandomDigits(this.config().numberLength);

    if (this.mode() === 'sequence') {
      this.sequence = digits;
      this.stage.set('showing');
      for (const num of this.sequence) {
        this.displayValue.set(num);
        await new Promise(res => setTimeout(res, this.config().interval));
        this.displayValue.set('');
        await new Promise(res => setTimeout(res, 100));
      }
    } else {
      const num = digits.join('');
      this.sequence = [num];
      this.displayValue.set(num);
      this.stage.set('showing');
      await new Promise(res => setTimeout(res, this.config().duration));
    }

    this.displayValue.set('');
    this.stage.set('input');
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
    if (this.stage() !== 'input') return;
    this.evaluate();
  }

  private evaluate(): void {
    const correct = this.sequence.join('');
    const guess = this.inputValue().trim();
    const isCorrect = guess === correct;
    this.result.set({ correct: isCorrect, expected: correct, guess });
    this.stage.set('result');
  }

  setMode(mode: GameMode): void {
    this.mode.set(mode);
    this.storageService.saveMode(mode);
  }

  updateConfig(partial: Partial<Config>): void {
    this.config.update(c => ({ ...c, ...partial }));
    this.storageService.saveConfig(this.config());
  }


}
