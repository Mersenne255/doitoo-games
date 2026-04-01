import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, effect,
} from '@angular/core';
import {
  AlikeConfig, MinigameResult, Puzzle,
  timeLimitForDifficulty,
} from '../../../models/game.models';
import { generatePuzzle } from '../../../utils/puzzle-generator.util';
import { GameService } from '../../../services/game.service';

/** Shape fill colors — maximally distinct on dark background */
function shapeColorToHex(color: string): string {
  switch (color) {
    case 'red': return '#dc2626';
    case 'blue': return '#2563eb';
    case 'green': return '#16a34a';
    case 'amber': return '#d97706';
    case 'purple': return '#7c3aed';
    case 'orange': return '#ea580c';
    default: return '#4f46e5';
  }
}

function shapeColorLight(color: string): string {
  switch (color) {
    case 'red': return '#ef4444';
    case 'blue': return '#3b82f6';
    case 'green': return '#22c55e';
    case 'amber': return '#f59e0b';
    case 'purple': return '#8b5cf6';
    case 'orange': return '#f97316';
    default: return '#6366f1';
  }
}

function borderColorToHex(color: string): string {
  switch (color) {
    case 'white': return '#e2e8f0';
    case 'gold': return '#fbbf24';
    case 'cyan': return '#06b6d4';
    case 'magenta': return '#d946ef';
    default: return '#e2e8f0';
  }
}

@Component({
  selector: 'app-alike',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="game-area" [class.solved]="solved()" [class.failed]="failed()">
      <div class="timer-border">
        <div class="timer-fill"
          [style.width.%]="timerPercent()"
          [class.warning]="timerPercent() < 25"
          [class.solved]="solved()">
        </div>
      </div>

      <div class="content">
        @if (puzzle(); as p) {
          <div class="cards-row">
            @for (card of p.cards; track $index) {
              <button class="card-btn"
                [class.correct]="solved() && selectedIndex() === $index"
                [class.incorrect]="failed() && selectedIndex() === $index"
                [class.correct-answer]="failed() && $index === puzzle()!.answerIndex"
                [attr.aria-label]="'Card ' + ($index + 1) + ': ' + card.shape + ', ' + card.shapeColor + ', ' + card.borderColor + ' border, letter ' + card.innerLetter"
                role="button"
                (click)="onCardSelect($index)">
                <svg viewBox="0 0 80 80" class="card-svg">
                  <defs>
                    <linearGradient [attr.id]="svgId('g', $index)"
                      x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" [attr.stop-color]="shapeColorLight(card.shapeColor)" />
                      <stop offset="100%" [attr.stop-color]="shapeColorToHex(card.shapeColor)" />
                    </linearGradient>
                    <filter [attr.id]="svgId('s', $index)" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
                    </filter>
                  </defs>
                  @switch (card.shape) {
                    @case ('circle') {
                      <circle cx="40" cy="40" r="26"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="5"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                    @case ('square') {
                      <rect x="14" y="14" width="52" height="52" rx="4"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="5"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                    @case ('triangle') {
                      <polygon points="40,8 70,66 10,66"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="5" stroke-linejoin="round"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                    @case ('diamond') {
                      <polygon points="40,8 72,40 40,72 8,40"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="5" stroke-linejoin="round"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                    @case ('hexagon') {
                      <polygon points="40,10 64,24 64,56 40,70 16,56 16,24"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="5" stroke-linejoin="round"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                    @case ('star') {
                      <polygon points="40,8 48,30 72,30 53,44 60,68 40,54 20,68 27,44 8,30 32,30"
                        [attr.fill]="'url(#' + svgId('g', $index) + ')'"
                        [attr.stroke]="borderColorToHex(card.borderColor)"
                        stroke-width="4" stroke-linejoin="round"
                        [attr.filter]="'url(#' + svgId('s', $index) + ')'" />
                    }
                  }
                  <text x="40" [attr.y]="card.shape === 'triangle' ? 46 : 42"
                    text-anchor="middle" dominant-baseline="central"
                    font-size="20" font-weight="700"
                    fill="rgba(255,255,255,0.95)"
                    font-family="'Inter', system-ui, sans-serif"
                    letter-spacing="0.5">{{ card.innerLetter }}</text>
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
      display: flex; flex: 1; min-height: 0; overflow: hidden;
    }
    .game-area {
      display: flex; flex-direction: column; flex: 1;
      border-radius: 0.5rem;
      overflow: hidden;
      transition: background 0.3s;
      position: relative;
      min-height: 0;
      max-height: 100%;
    }
    .game-area.solved {
      background: rgba(34, 197, 94, 0.08);
    }
    .game-area.failed {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Timer progress bar at top */
    .timer-border {
      height: 6px; width: 100%;
      background: rgba(255,255,255,0.06);
      flex-shrink: 0;
    }
    .timer-fill {
      height: 100%;
      background: #6366f1; transition: width 0.1s linear;
    }
    .timer-fill.warning { background: #ef4444; }
    .timer-fill.solved { background: #22c55e; }

    .content {
      display: flex; flex: 1; min-height: 0;
      overflow: hidden;
      padding: 8px;
    }

    .cards-row {
      display: flex; flex-wrap: wrap;
      justify-content: center; align-content: center; align-items: center;
      gap: 8px;
      width: 100%; height: 100%;
    }

    .card-btn {
      flex: 0 0 auto;
      width: 28%; height: auto;
      aspect-ratio: 1;
      max-width: 130px;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer; padding: 0;
      transition: transform 0.15s;
      outline: none;
      display: flex; align-items: center; justify-content: center;
    }

    .card-svg {
      width: 100%; height: 100%;
    }
    .card-btn:active {
      transform: scale(0.96);
    }
    .card-btn.correct {
      border: 3px solid #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
    }
    .card-btn.incorrect {
      border: 3px solid #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    }
    .card-btn.correct-answer {
      border: 3px solid #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
    }
  `],
})
export class AlikeComponent implements OnInit, OnDestroy {
  readonly config = input.required<AlikeConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  private readonly game = inject(GameService);

  readonly puzzle = signal<Puzzle | null>(null);
  readonly selectedIndex = signal<number | null>(null);
  readonly solved = signal(false);
  readonly failed = signal(false);
  readonly correctCount = signal(0);
  readonly totalCount = signal(0);
  readonly timerPercent = signal(100);

  private totalTimeMs = 0;
  private elapsedMs = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private advanceTimeout: ReturnType<typeof setTimeout> | null = null;
  private finished = false;

  // ── Template helpers ──
  readonly shapeColorToHex = shapeColorToHex;
  readonly shapeColorLight = shapeColorLight;
  readonly borderColorToHex = borderColorToHex;

  /** Unique prefix for SVG defs to avoid ID collisions between slots */
  svgId(suffix: string, index: number): string {
    return `alike-${this.slotIndex()}-${index}-${suffix}`;
  }

  gridCols(count: number): number {
    if (count <= 2) return 2;
    if (count <= 4) return 2;
    return 3;
  }

  gridRows(count: number): number {
    return Math.ceil(count / this.gridCols(count));
  }

  // ── Lifecycle effect (Task 4.4) ──
  private stageEffect = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.finished) {
      // Another slot caused the game to end — stop this one
      this.finished = true;
      this.clearTimers();
    } else if (stage === 'playing' && this.finished) {
      // Restarting (playAgain) — reset everything
      this.resetState();
      this.nextPuzzle();
    }
  });

  // ── Init / Destroy (Task 4.3 / 4.4) ──
  ngOnInit(): void {
    this.nextPuzzle();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ── Game loop (Task 4.3) ──
  private nextPuzzle(): void {
    const difficulty = this.game.currentDifficulty();
    const p = generatePuzzle(difficulty);
    this.puzzle.set(p);
    this.selectedIndex.set(null);
    this.solved.set(false);
    this.startTimer();
  }

  private startTimer(): void {
    this.clearTimers();
    this.totalTimeMs = timeLimitForDifficulty(this.game.currentDifficulty()) * 1000;
    this.elapsedMs = 0;
    this.timerPercent.set(100);

    const TICK = 50;
    this.timerInterval = setInterval(() => {
      this.elapsedMs += TICK;
      const pct = Math.max(0, 100 - (this.elapsedMs / this.totalTimeMs) * 100);
      this.timerPercent.set(pct);

      if (this.elapsedMs >= this.totalTimeMs) {
        this.onTimerExpired();
      }
    }, TICK);
  }

  private onTimerExpired(): void {
    this.clearTimers();
    this.handleGameOver();
  }

  private clearTimers(): void {
    if (this.timerInterval !== null) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.advanceTimeout !== null) { clearTimeout(this.advanceTimeout); this.advanceTimeout = null; }
  }

  // ── Card selection (Task 4.3) ──
  onCardSelect(index: number): void {
    // Accept exactly one selection per puzzle
    if (this.finished || this.solved() || this.failed() || this.selectedIndex() !== null) return;

    this.selectedIndex.set(index);
    const p = this.puzzle();
    if (!p) return;

    if (index === p.answerIndex) {
      // Correct answer
      this.solved.set(true);
      this.correctCount.update(c => c + 1);
      this.totalCount.update(c => c + 1);
      this.clearTimers();
      this.advanceTimeout = setTimeout(() => {
        this.nextPuzzle();
      }, 1000);
    } else {
      // Incorrect answer — game over
      this.handleGameOver();
    }
  }

  private handleGameOver(): void {
    if (this.finished) return;
    this.finished = true;
    this.failed.set(true);
    this.totalCount.update(c => c + 1);
    this.clearTimers();
    this.emitResult();
  }

  private emitResult(): void {
    const total = this.totalCount();
    this.completed.emit({
      slotIndex: this.slotIndex(),
      score: this.correctCount(),
      total,
      maxDifficulty: this.game.currentDifficulty(),
      details: {
        correct: this.correctCount(),
        incorrect: total - this.correctCount(),
        timedOut: 0,
      },
    });
  }

  // ── Reset (Task 4.4) ──
  private resetState(): void {
    this.clearTimers();
    this.finished = false;
    this.puzzle.set(null);
    this.selectedIndex.set(null);
    this.solved.set(false);
    this.failed.set(false);
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.timerPercent.set(100);
  }
}
