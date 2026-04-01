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
  ElementRef,
  AfterViewInit,
} from '@angular/core';

import {
  AlikeConfig,
  MinigameResult,
  Puzzle,
  ShapeCard,
  timeLimitForDifficulty,
} from '../../../models/game.models';
import { generatePuzzle } from '../../../utils/puzzle-generator.util';
import { computeCardPacking } from '../../../utils/card-packing.util';
import { GameService } from '../../../services/game.service';

// ── Color palettes ──────────────────────────────────────────────────

/** Dark fill colors for shape gradients (bottom stop) */
const FILL_DARK: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  charcoal: '#374151',
};

/** Light fill colors for shape gradients (top stop) */
const FILL_LIGHT: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  charcoal: '#4b5563',
};

/** Border stroke colors */
const BORDER_COLORS: Record<string, string> = {
  white: '#e2e8f0',
  gold: '#fbbf24',
  cyan: '#06b6d4',
  magenta: '#d946ef',
};

// ── Component ───────────────────────────────────────────────────────

@Component({
  selector: 'app-alike',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="game-container"
         [class.solved]="isSolved()"
         [class.failed]="isFailed()">

      <!-- Timer progress bar -->
      <div class="timer-bar">
        <div class="timer-fill"
             [style.width.%]="timerPercent()"
             [class.warning]="timerPercent() < 25"
             [class.solved]="isSolved()">
        </div>
      </div>

      <!-- Card grid -->
      <div class="content">
        @if (puzzle(); as currentPuzzle) {
          <div class="card-row">
            @for (card of currentPuzzle.cards; track $index) {
              <button class="card-button"
                      [style.width.px]="cardSize()"
                      [style.height.px]="cardSize()"
                      [class.correct]="isSolved() && selectedIndex() === $index"
                      [class.incorrect]="isFailed() && selectedIndex() === $index"
                      [class.answer]="isFailed() && $index === currentPuzzle.answerIndex"
                      (pointerdown)="pickCard($index)">

                <svg viewBox="0 0 80 80" class="shape-svg">
                  <defs>
                    <!-- Gradient for shape fill -->
                    <linearGradient [attr.id]="gradientId($index)"
                                    x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"
                            [attr.stop-color]="fillLightColor(card, currentPuzzle)" />
                      <stop offset="100%"
                            [attr.stop-color]="fillDarkColor(card, currentPuzzle)" />
                    </linearGradient>

                    <!-- Drop shadow filter -->
                    <filter [attr.id]="filterId($index)"
                            x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="0" dy="2"
                                    stdDeviation="2" flood-opacity="0.3" />
                    </filter>
                  </defs>

                  <!-- Shape rendering -->
                  @switch (card.shape) {
                    @case ('circle') {
                      <circle cx="40" cy="40" r="26"
                              [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                              [attr.stroke]="borderStroke(card, currentPuzzle)"
                              stroke-width="5"
                              [attr.filter]="filterUrl($index)" />
                    }
                    @case ('square') {
                      <rect x="14" y="14" width="52" height="52" rx="4"
                            [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                            [attr.stroke]="borderStroke(card, currentPuzzle)"
                            stroke-width="5"
                            [attr.filter]="filterUrl($index)" />
                    }
                    @case ('triangle') {
                      <polygon points="40,8 70,66 10,66"
                               [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                               [attr.stroke]="borderStroke(card, currentPuzzle)"
                               stroke-width="5" stroke-linejoin="round"
                               [attr.filter]="filterUrl($index)" />
                    }
                    @case ('diamond') {
                      <polygon points="40,8 72,40 40,72 8,40"
                               [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                               [attr.stroke]="borderStroke(card, currentPuzzle)"
                               stroke-width="5" stroke-linejoin="round"
                               [attr.filter]="filterUrl($index)" />
                    }
                    @case ('hexagon') {
                      <polygon points="40,10 64,24 64,56 40,70 16,56 16,24"
                               [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                               [attr.stroke]="borderStroke(card, currentPuzzle)"
                               stroke-width="5" stroke-linejoin="round"
                               [attr.filter]="filterUrl($index)" />
                    }
                    @case ('star') {
                      <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z"
                            [attr.fill]="fillGradient(card, $index, currentPuzzle)"
                            [attr.stroke]="borderStroke(card, currentPuzzle)"
                            stroke-width="4" stroke-linejoin="round"
                            [attr.filter]="filterUrl($index)" />
                    }
                  }

                  <!-- Inner letter label -->
                  <text x="40"
                        [attr.y]="card.shape === 'triangle' ? 46 : 42"
                        text-anchor="middle"
                        dominant-baseline="central"
                        font-size="20"
                        font-weight="700"
                        fill="rgba(255,255,255,0.95)"
                        font-family="Inter, system-ui, sans-serif">
                    {{ letterText(card, currentPuzzle) }}
                  </text>
                </svg>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      touch-action: none;
    }

    .game-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      border-radius: 0.5rem;
      overflow: hidden;
      position: relative;
      min-height: 0;
      max-height: 100%;
    }

    .game-container.solved {
      background: rgba(34, 197, 94, 0.08);
    }

    .game-container.failed {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Timer bar */
    .timer-bar {
      height: 6px;
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    .timer-fill {
      height: 100%;
      background: #6366f1;
      transition: width 0.1s linear;
    }

    .timer-fill.warning {
      background: #ef4444;
    }

    .timer-fill.solved {
      background: #22c55e;
    }

    /* Card layout */
    .content {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 8px;
    }

    .card-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-content: center;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 100%;
    }

    /* Card buttons */
    .card-button {
      flex: 0 0 auto;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      padding: 0;
      transition: transform 0.15s;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
    }

    .card-button:hover {
      transform: scale(1.04);
    }

    .card-button:active {
      transform: scale(0.96);
    }

    .card-button.correct {
      border: 3px solid #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
    }

    .card-button.incorrect {
      border: 3px solid #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    }

    .card-button.answer {
      border: 3px solid #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
    }

    .shape-svg {
      width: 100%;
      height: 100%;
    }
  `],
})
export class AlikeComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── Inputs & Outputs ────────────────────────────────────────────

  readonly config = input.required<AlikeConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  // ── Injected services ───────────────────────────────────────────

  private readonly gameService = inject(GameService);
  private readonly elementRef = inject(ElementRef);

  // ── Reactive state ──────────────────────────────────────────────

  readonly puzzle = signal<Puzzle | null>(null);
  readonly selectedIndex = signal<number | null>(null);
  readonly isSolved = signal(false);
  readonly isFailed = signal(false);
  readonly correctCount = signal(0);
  readonly totalCount = signal(0);
  readonly timerPercent = signal(100);
  readonly cardSize = signal(80);

  // ── Internal state ──────────────────────────────────────────────

  private timeLimitMs = 0;
  private elapsedMs = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isGameOver = false;
  private resizeObserver: ResizeObserver | null = null;

  // ── SVG helper methods ──────────────────────────────────────────

  /** Unique gradient ID scoped to this slot and card index */
  gradientId(cardIndex: number): string {
    return `alike-${this.slotIndex()}-${cardIndex}-gradient`;
  }

  /** Unique filter ID scoped to this slot and card index */
  filterId(cardIndex: number): string {
    return `alike-${this.slotIndex()}-${cardIndex}-shadow`;
  }

  /** CSS url() reference to the drop-shadow filter */
  filterUrl(cardIndex: number): string {
    return `url(#${this.filterId(cardIndex)})`;
  }

  /**
   * Returns the fill attribute for a shape.
   * If shapeColor is an active property, uses the gradient; otherwise a flat indigo.
   */
  fillGradient(card: ShapeCard, cardIndex: number, puzzle: Puzzle): string {
    if (puzzle.activeKeys.includes('shapeColor')) {
      return `url(#${this.gradientId(cardIndex)})`;
    }
    return '#6366f1';
  }

  /** Border stroke color — only shown when borderColor is an active property */
  borderStroke(card: ShapeCard, puzzle: Puzzle): string {
    if (puzzle.activeKeys.includes('borderColor')) {
      return BORDER_COLORS[card.borderColor] || '#e2e8f0';
    }
    return 'transparent';
  }

  /** Inner letter — only shown when innerLetter is an active property */
  letterText(card: ShapeCard, puzzle: Puzzle): string {
    if (puzzle.activeKeys.includes('innerLetter')) {
      return card.innerLetter;
    }
    return '';
  }

  /** Dark gradient stop color for a card's shape */
  fillDarkColor(card: ShapeCard, puzzle: Puzzle): string {
    if (puzzle.activeKeys.includes('shapeColor')) {
      return FILL_DARK[card.shapeColor] || '#4f46e5';
    }
    return '#6366f1';
  }

  /** Light gradient stop color for a card's shape */
  fillLightColor(card: ShapeCard, puzzle: Puzzle): string {
    if (puzzle.activeKeys.includes('shapeColor')) {
      return FILL_LIGHT[card.shapeColor] || '#6366f1';
    }
    return '#6366f1';
  }

  // ── Stage watcher ───────────────────────────────────────────────

  /**
   * Reacts to game stage changes:
   * - When the game moves to 'summary', finalize and stop timers.
   * - When the game restarts ('playing' after being done), reset and start fresh.
   */
  private stageEffect = effect(() => {
    const stage = this.gameService.stage();

    if (stage === 'summary' && !this.isGameOver) {
      this.isGameOver = true;
      this.clearTimers();
    } else if (stage === 'playing' && this.isGameOver) {
      this.resetState();
      this.advanceToNextPuzzle();
    }
  });

  // ── Lifecycle ───────────────────────────────────────────────────

  ngOnInit(): void {
    this.advanceToNextPuzzle();
  }

  ngAfterViewInit(): void {
    const cardRow = this.getCardRowElement();
    if (cardRow) {
      this.resizeObserver = new ResizeObserver(() => this.recalculateLayout());
      this.resizeObserver.observe(cardRow);
    }
    // Initial layout calculation after DOM settles
    setTimeout(() => this.recalculateLayout(), 50);
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.resizeObserver?.disconnect();
  }

  // ── User interaction ────────────────────────────────────────────

  /** Handle card selection via pointer (mouse or touch) */
  pickCard(cardIndex: number): void {
    // Ignore picks when the game is over or a card is already selected
    if (this.isGameOver || this.isSolved() || this.isFailed() || this.selectedIndex() !== null) {
      return;
    }

    this.selectedIndex.set(cardIndex);
    const currentPuzzle = this.puzzle();
    if (!currentPuzzle) return;

    if (cardIndex === currentPuzzle.answerIndex) {
      // Correct answer
      this.isSolved.set(true);
      this.correctCount.update(count => count + 1);
      this.totalCount.update(count => count + 1);
      this.clearTimers();

      // Auto-advance to next puzzle after a brief pause
      this.autoAdvanceTimeout = setTimeout(() => this.advanceToNextPuzzle(), 1000);
    } else {
      // Wrong answer — end the game
      this.endGame();
    }
  }

  // ── Puzzle management ───────────────────────────────────────────

  /** Generate a new puzzle and start its countdown timer */
  private advanceToNextPuzzle(): void {
    const difficulty = this.gameService.currentDifficulty();
    const newPuzzle = generatePuzzle(difficulty);

    this.puzzle.set(newPuzzle);
    this.selectedIndex.set(null);
    this.isSolved.set(false);
    this.startTimer();

    // Recalculate card sizes after the DOM updates
    setTimeout(() => this.recalculateLayout(), 0);
  }

  // ── Timer ───────────────────────────────────────────────────────

  /** Start the countdown timer for the current puzzle */
  private startTimer(): void {
    this.clearTimers();

    const difficulty = this.gameService.currentDifficulty();
    this.timeLimitMs = timeLimitForDifficulty(difficulty) * 1000;
    this.elapsedMs = 0;
    this.timerPercent.set(100);

    this.timerInterval = setInterval(() => {
      this.elapsedMs += 50;
      const remaining = Math.max(0, 100 - (this.elapsedMs / this.timeLimitMs) * 100);
      this.timerPercent.set(remaining);

      if (this.elapsedMs >= this.timeLimitMs) {
        this.clearTimers();
        this.endGame();
      }
    }, 50);
  }

  /** Stop all running timers and pending timeouts */
  private clearTimers(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
  }

  // ── Game over ───────────────────────────────────────────────────

  /** End the game and emit the final result to the parent */
  private endGame(): void {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.isFailed.set(true);
    this.totalCount.update(count => count + 1);
    this.clearTimers();

    const total = this.totalCount();
    this.completed.emit({
      slotIndex: this.slotIndex(),
      score: this.correctCount(),
      total,
      maxDifficulty: this.gameService.currentDifficulty(),
      details: {
        correct: this.correctCount(),
        incorrect: total - this.correctCount(),
        timedOut: 0,
      },
    });
  }

  // ── Reset ───────────────────────────────────────────────────────

  /** Reset all state for a fresh game session */
  private resetState(): void {
    this.clearTimers();
    this.isGameOver = false;
    this.puzzle.set(null);
    this.selectedIndex.set(null);
    this.isSolved.set(false);
    this.isFailed.set(false);
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.timerPercent.set(100);
  }

  // ── Layout ──────────────────────────────────────────────────────

  /** Get the card row container element from the DOM */
  private getCardRowElement(): Element | null {
    return (this.elementRef.nativeElement as HTMLElement).querySelector('.card-row');
  }

  /** Recalculate optimal card size based on available container space */
  private recalculateLayout(): void {
    const cardRow = this.getCardRowElement();
    if (!cardRow) return;

    const numberOfCards = this.puzzle()?.cards.length ?? 3;
    const packing = computeCardPacking(
      cardRow.clientWidth,
      cardRow.clientHeight,
      numberOfCards,
      8,   // gap
      30,  // min card size
      130, // max card size
    );
    this.cardSize.set(packing.cardSize);
  }
}
