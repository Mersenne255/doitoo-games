import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
  inject,
  effect,
} from '@angular/core';

import {
  AlikeConfig,
  MinigameResult,
  Puzzle,
  ShapeCard,
  timeLimitForDifficulty,
} from '../../../models/game.models';
import { generatePuzzle } from '../../../utils/puzzle-generator.util';
import { GameService } from '../../../services/game.service';

// ── Color palettes ──────────────────────────────────────────────────

const FILL_DARK: Record<string, string> = {
  red: '#dc2626', blue: '#2563eb', green: '#16a34a', charcoal: '#374151',
};

const FILL_LIGHT: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', charcoal: '#4b5563',
};

const BORDER_COLORS: Record<string, string> = {
  white: '#e2e8f0', gold: '#fbbf24', cyan: '#06b6d4', magenta: '#d946ef',
};

const DEFAULT_FILL = '#6366f1';

// ── Component ───────────────────────────────────────────────────────

@Component({
  selector: 'app-alike',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alike.component.html',
  styleUrl: './alike.component.scss',
})
export class AlikeComponent implements OnInit, OnDestroy {

  // ── Inputs / Outputs ────────────────────────────────────────────

  readonly config = input.required<AlikeConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  // ── Services ────────────────────────────────────────────────────

  private readonly game = inject(GameService);

  // ── Reactive state (template-bound) ─────────────────────────────

  readonly puzzle = signal<Puzzle | null>(null);
  readonly selectedIndex = signal<number | null>(null);
  readonly isSolved = signal(false);
  readonly isFailed = signal(false);
  readonly timerPercent = signal(100);

  // ── Private state ───────────────────────────────────────────────

  private correctCount = 0;
  private totalCount = 0;
  private timeLimitMs = 0;
  private elapsedMs = 0;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private advanceHandle: ReturnType<typeof setTimeout> | null = null;
  private gameOver = false;

  // ── Template helpers (SVG attributes) ───────────────────────────

  shapeFill(index: number, p: Puzzle): string {
    return p.activeKeys.includes('shapeColor')
      ? `url(#g${this.slotIndex()}-${index})`
      : DEFAULT_FILL;
  }

  stroke(card: ShapeCard, p: Puzzle): string {
    return p.activeKeys.includes('borderColor')
      ? (BORDER_COLORS[card.borderColor] ?? '#e2e8f0')
      : 'transparent';
  }

  letter(card: ShapeCard, p: Puzzle): string {
    return p.activeKeys.includes('innerLetter') ? card.innerLetter : '';
  }

  darkFill(card: ShapeCard, p: Puzzle): string {
    return p.activeKeys.includes('shapeColor')
      ? (FILL_DARK[card.shapeColor] ?? DEFAULT_FILL)
      : DEFAULT_FILL;
  }

  lightFill(card: ShapeCard, p: Puzzle): string {
    return p.activeKeys.includes('shapeColor')
      ? (FILL_LIGHT[card.shapeColor] ?? DEFAULT_FILL)
      : DEFAULT_FILL;
  }

  shadow(index: number): string {
    return `url(#f${this.slotIndex()}-${index})`;
  }

  // ── Stage watcher ───────────────────────────────────────────────

  /** Stop on summary, restart on replay */
  private stageWatcher = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.gameOver) {
      this.gameOver = true;
      this.stopTimers();
    } else if (stage === 'playing' && this.gameOver) {
      this.reset();
      this.nextPuzzle();
    }
  });

  // ── Lifecycle ───────────────────────────────────────────────────

  ngOnInit(): void {
    this.nextPuzzle();
  }

  ngOnDestroy(): void {
    this.stopTimers();
  }

  // ── User interaction ────────────────────────────────────────────

  pickCard(index: number): void {
    if (this.gameOver || this.isSolved() || this.isFailed() || this.selectedIndex() !== null) {
      return;
    }

    this.selectedIndex.set(index);
    const p = this.puzzle();
    if (!p) return;

    if (index === p.answerIndex) {
      this.isSolved.set(true);
      this.correctCount++;
      this.totalCount++;
      this.stopTimers();
      this.advanceHandle = setTimeout(() => this.nextPuzzle(), 1000);
    } else {
      this.endGame();
    }
  }

  // ── Internals ───────────────────────────────────────────────────

  private nextPuzzle(): void {
    this.puzzle.set(generatePuzzle(this.game.currentDifficulty()));
    this.selectedIndex.set(null);
    this.isSolved.set(false);
    this.startTimer();
  }

  private startTimer(): void {
    this.stopTimers();
    this.timeLimitMs = timeLimitForDifficulty(this.game.currentDifficulty()) * 1000;
    this.elapsedMs = 0;
    this.timerPercent.set(100);

    this.timerHandle = setInterval(() => {
      this.elapsedMs += 50;
      this.timerPercent.set(Math.max(0, 100 - (this.elapsedMs / this.timeLimitMs) * 100));
      if (this.elapsedMs >= this.timeLimitMs) {
        this.stopTimers();
        this.endGame();
      }
    }, 50);
  }

  private stopTimers(): void {
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }
    if (this.advanceHandle) { clearTimeout(this.advanceHandle); this.advanceHandle = null; }
  }

  private endGame(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.isFailed.set(true);
    this.totalCount++;
    this.stopTimers();

    this.completed.emit({
      slotIndex: this.slotIndex(),
      score: this.correctCount,
      total: this.totalCount,
      maxDifficulty: this.game.currentDifficulty(),
      details: {
        correct: this.correctCount,
        incorrect: this.totalCount - this.correctCount,
        timedOut: 0,
      },
    });
  }

  private reset(): void {
    this.stopTimers();
    this.gameOver = false;
    this.puzzle.set(null);
    this.selectedIndex.set(null);
    this.isSolved.set(false);
    this.isFailed.set(false);
    this.correctCount = 0;
    this.totalCount = 0;
    this.timerPercent.set(100);
  }
}
