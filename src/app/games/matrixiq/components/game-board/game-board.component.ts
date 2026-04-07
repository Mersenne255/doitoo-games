import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { CellContent } from '../../models/game.models';
import { CellRendererComponent } from '../cell-renderer/cell-renderer.component';
import { ExplanationComponent } from '../explanation/explanation.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CellRendererComponent, ExplanationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar: progress left, abort right -->
      <div class="top-bar">
        <span class="progress">{{ currentIndex() + 1 }} / {{ totalPuzzles() }}</span>
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Timer bar (hidden in relaxed mode) -->
      @if (hasTimer()) {
        <div class="timer-bar-track">
          <div class="timer-bar-fill"
               [style.width.%]="timerPercent()"
               [class.urgent]="timerPercent() < 25"></div>
        </div>
      }

      <!-- 3×3 Matrix grid -->
      <div class="matrix-container">
        <div class="matrix-grid">
          @for (row of [0, 1, 2]; track row) {
            @for (col of [0, 1, 2]; track col) {
              <div class="matrix-cell" [class.missing-cell]="row === 2 && col === 2 && !showAnswer()">
                @if (row === 2 && col === 2) {
                  @if (showAnswer()) {
                    <app-cell-renderer [content]="answerContent()" />
                  } @else {
                    <app-cell-renderer [content]="null" [showMissing]="true" />
                  }
                } @else {
                  <app-cell-renderer [content]="cellAt(row, col)" />
                }
              </div>
            }
          }
        </div>
      </div>

      <!-- Answer options or explanation -->
      @if (showExplanation()) {
        <div class="explanation-section">
          <app-explanation [puzzle]="puzzle()!" (next)="onNext()" />
        </div>
      } @else {
        <!-- Option cards -->
        <div class="options-grid">
          @if (puzzle(); as p) {
            @for (option of p.options; track $index) {
              <button class="option-card"
                      [class.correct-highlight]="feedbackCorrectIndex() === $index"
                      [class.incorrect-highlight]="feedbackSelectedIndex() === $index && !feedbackCorrect()"
                      [disabled]="!!game.feedbackState()"
                      (click)="onOptionTap($index)"
                      [attr.aria-label]="'Option ' + ($index + 1)">
                <app-cell-renderer [content]="option" />
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .board {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      padding: 0.75rem 1rem;
      max-width: 600px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .abort-btn {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, border-color 0.2s;
      backdrop-filter: blur(4px);
    }

    .abort-btn:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.6);
    }

    .timer-bar-track {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin-top: 0.5rem;
      overflow: hidden;
    }

    .timer-bar-fill {
      height: 100%;
      background: #6366f1;
      border-radius: 2px;
      transition: width 50ms linear;
    }

    .timer-bar-fill.urgent {
      background: #ef4444;
    }

    .matrix-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 0;
      flex: 0 0 auto;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      width: min(80vw, 320px);
      height: min(80vw, 320px);
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      overflow: hidden;
      background: rgba(15, 15, 26, 0.6);
    }

    .matrix-cell {
      border: 1px solid rgba(99, 102, 241, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      overflow: hidden;
    }

    .missing-cell {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.35);
    }

    .options-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
      padding: 0.5rem 0 1.5rem;
    }

    .option-card {
      min-height: 44px;
      min-width: 44px;
      aspect-ratio: 1;
      border: 2px solid rgba(99, 102, 241, 0.25);
      border-radius: 8px;
      background: rgba(15, 15, 26, 0.7);
      cursor: pointer;
      padding: 4px;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }

    .option-card:hover:not(:disabled) {
      transform: scale(1.04);
      border-color: rgba(99, 102, 241, 0.5);
    }

    .option-card:disabled {
      cursor: default;
    }

    .option-card.correct-highlight {
      border-color: #22c55e;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.5), 0 0 24px rgba(34, 197, 94, 0.2);
    }

    .option-card.incorrect-highlight {
      border-color: #ef4444;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.5), 0 0 24px rgba(239, 68, 68, 0.2);
    }

    .explanation-section {
      flex: 0 0 auto;
      padding: 0.5rem 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly puzzle = this.game.currentPuzzle;
  readonly currentIndex = this.game.currentPuzzleIndex;
  readonly totalPuzzles = computed(() => this.game.puzzles().length);
  readonly optionCount = computed(() => this.puzzle()?.options.length ?? 4);

  readonly hasTimer = computed(() => this.game.difficultyParams().responseWindowMs !== null);
  readonly timerPercent = signal<number>(100);

  readonly showExplanation = computed(() => {
    const fb = this.game.feedbackState();
    return fb !== null && fb.showExplanation;
  });

  readonly showAnswer = computed(() => this.game.feedbackState() !== null);

  readonly answerContent = computed(() => {
    const fb = this.game.feedbackState();
    if (!fb) return null;
    return fb.result.puzzle.correctAnswer;
  });

  readonly feedbackCorrectIndex = computed(() => {
    const fb = this.game.feedbackState();
    if (!fb) return -1;
    return fb.result.puzzle.correctIndex;
  });

  readonly feedbackSelectedIndex = computed(() => {
    const fb = this.game.feedbackState();
    if (!fb) return -1;
    return fb.result.selectedIndex ?? -1;
  });

  readonly feedbackCorrect = computed(() => {
    const fb = this.game.feedbackState();
    return fb?.result.correct ?? false;
  });

  private puzzleStartTime = 0;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private explanationTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const _idx = this.game.currentPuzzleIndex();
      const _stage = this.game.stage();
      if (_stage === 'playing') {
        this.resetForNewPuzzle();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  cellAt(row: number, col: number): CellContent | null {
    const p = this.puzzle();
    if (!p) return null;
    return p.grid[row]?.[col] ?? null;
  }

  onOptionTap(index: number): void {
    if (this.game.feedbackState()) return;

    const responseTimeMs = Date.now() - this.puzzleStartTime;
    this.game.recordResponse(index, responseTimeMs);
    this.clearTimer();
    this.scheduleExplanation();
  }

  onAbort(): void {
    this.clearAllTimers();
    this.game.abortSession();
  }

  onNext(): void {
    this.game.advancePuzzle();
  }

  private resetForNewPuzzle(): void {
    this.clearAllTimers();
    this.timerPercent.set(100);
    this.puzzleStartTime = Date.now();
    this.startTimer();
  }

  private startTimer(): void {
    const windowMs = this.game.difficultyParams().responseWindowMs;
    if (windowMs === null) return;

    const startTime = Date.now();
    this.timerIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / windowMs) * 100);
      this.timerPercent.set(remaining);

      if (remaining <= 0) {
        this.onTimeout();
      }
    }, 50);
  }

  private onTimeout(): void {
    if (this.game.feedbackState()) return;

    this.game.recordTimeout();
    this.clearTimer();
    this.scheduleExplanation();
  }

  private scheduleExplanation(): void {
    this.explanationTimeoutId = setTimeout(() => {
      const fb = this.game.feedbackState();
      if (fb && !fb.showExplanation) {
        this.game.feedbackState.set({ ...fb, showExplanation: true });
      }
    }, 500);
  }

  private clearTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private clearAllTimers(): void {
    this.clearTimer();
    if (this.explanationTimeoutId !== null) {
      clearTimeout(this.explanationTimeoutId);
      this.explanationTimeoutId = null;
    }
  }
}
