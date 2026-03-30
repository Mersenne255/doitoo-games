import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, computed, effect,
} from '@angular/core';
import {
  MathEquationsConfig, Equation, MinigameResult, EquationOutcome,
  timeLimitForDifficulty, MathOperator,
} from '../../../models/game.models';
import { generateEquation } from '../../../utils/equation-generator.util';
import { GameService } from '../../../services/game.service';

@Component({
  selector: 'app-math-equations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="game-area" [class.solved]="solved()" [class.failed]="failed()">
      <!-- Progress bar as top border -->
      <div class="timer-border">
        <div class="timer-fill"
          [style.width.%]="timerPercent()"
          [class.warning]="timerPercent() < 25"
          [class.solved]="solved()">
        </div>
      </div>

      <div class="content">
        <!-- Equation -->
        <div class="equation-display">
          <span class="equation-text">{{ currentEquation()?.displayString }} =</span>
        </div>

        <!-- Current input / correct answer display -->
        <div class="answer-display">
          @if (failed()) {
            <span class="answer-text failed">{{ currentEquation()?.correctAnswer }}</span>
          } @else {
            <span class="answer-text" [class.correct]="solved()">
              {{ inputValue() || '?' }}
            </span>
          }
        </div>

        @if (!failed()) {
          <!-- Number pad -->
          <div class="numpad" [class.disabled]="solved()">
            @for (n of [1,2,3,4,5,6,7,8,9]; track n) {
              <button class="num-btn" (click)="pressDigit(n)">{{ n }}</button>
            }
            <button class="num-btn fn" (click)="pressMinus()">±</button>
            <button class="num-btn" (click)="pressDigit(0)">0</button>
            <button class="num-btn fn" (click)="pressDelete()">⌫</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex; flex: 1; min-height: 0;
    }
    .game-area {
      display: flex; flex-direction: column; flex: 1;
      border-radius: 0.5rem; overflow: hidden;
      transition: background 0.3s;
      position: relative;
    }
    .game-area.solved {
      background: rgba(34, 197, 94, 0.08);
    }
    .game-area.failed {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Progress bar as top border */
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
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 0.4rem; flex: 1;
      padding: 0;
      min-height: 0;
    }

    .equation-display { display: flex; align-items: center; justify-content: center; }
    .equation-text {
      font-size: 1.4rem; font-weight: 800; color: #e2e8f0; letter-spacing: 0.04em;
    }

    .answer-display {
      display: flex; align-items: center; justify-content: center;
    }
    .answer-text {
      font-size: 1.75rem; font-weight: 800; color: #a5b4fc;
      min-width: 2rem; text-align: center;
    }
    .answer-text.correct { color: #22c55e; }
    .answer-text.failed { color: #ef4444; }

    .numpad {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 0.25rem; width: 100%; flex: 1;
      min-height: 0;
      transition: opacity 0.2s;
    }
    .numpad.disabled {
      opacity: 0.3; pointer-events: none;
    }
    .num-btn {
      border-radius: 0.4rem;
      background: rgba(255,255,255,0.06); color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.08);
      font-size: clamp(0.8rem, 2.5vmin, 1.3rem); font-weight: 600;
      cursor: pointer; transition: all 0.12s; outline: none;
      font-family: 'Inter', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 0; padding: 0;
      &:hover { background: rgba(255,255,255,0.12); }
      &:active { transform: scale(0.95); background: rgba(255,255,255,0.08); }
    }
    .num-btn.fn {
      color: #94a3b8;
    }
  `],
})
export class MathEquationsComponent implements OnInit, OnDestroy {
  readonly config = input.required<MathEquationsConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  private readonly game = inject(GameService);

  readonly currentEquation = signal<Equation | null>(null);
  readonly inputValue = signal('');
  readonly solved = signal(false);
  readonly failed = signal(false);
  readonly correctCount = signal(0);
  readonly totalCount = signal(0);

  // Timer state
  private totalTimeMs = 0;
  private elapsedMs = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private advanceTimeout: ReturnType<typeof setTimeout> | null = null;
  private finished = false;

  readonly timerPercent = signal(100);

  private stageEffect = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.finished) {
      // Another slot caused the game to end — stop this one
      this.finished = true;
      this.clearTimers();
    } else if (stage === 'playing' && this.finished) {
      // Restarting (playAgain) — reset everything
      this.resetState();
      this.nextEquation();
    }
  });

  private resetState(): void {
    this.clearTimers();
    this.finished = false;
    this.inputValue.set('');
    this.solved.set(false);
    this.failed.set(false);
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.timerPercent.set(100);
  }

  ngOnInit(): void {
    this.nextEquation();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private nextEquation(): void {
    // Weight operators by difficulty: low levels favor +/−, high levels add more ×/÷
    const d = this.game.currentDifficulty();
    const ops: MathOperator[] = ['+', '−']; // always available
    // ×: starts appearing at diff 10, guaranteed by diff 30
    if (d >= 10 || Math.random() < d / 30) ops.push('×');
    // ÷: starts appearing at diff 25, guaranteed by diff 50
    if (d >= 25 || Math.random() < d / 50) ops.push('/');
    const eq = generateEquation(d, ops);
    this.currentEquation.set(eq);
    this.inputValue.set('');
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
    // Not solved in time — game over
    this.handleGameOver('timed_out');
  }

  private clearTimers(): void {
    if (this.timerInterval !== null) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.advanceTimeout !== null) { clearTimeout(this.advanceTimeout); this.advanceTimeout = null; }
  }

  // ── Input handling ──

  pressDigit(n: number): void {
    if (this.finished || this.solved()) return;
    const current = this.inputValue();
    // Prevent leading zeros
    if (current === '0') {
      this.inputValue.set(String(n));
    } else if (current === '-0') {
      this.inputValue.set('-' + n);
    } else {
      this.inputValue.set(current + n);
    }
    this.checkAnswer();
  }

  pressMinus(): void {
    if (this.finished || this.solved()) return;
    const current = this.inputValue();
    if (current.startsWith('-')) {
      this.inputValue.set(current.slice(1));
    } else {
      this.inputValue.set('-' + current);
    }
    this.checkAnswer();
  }

  pressDelete(): void {
    if (this.finished || this.solved()) return;
    const current = this.inputValue();
    if (current.length > 0) {
      this.inputValue.set(current.slice(0, -1));
    }
  }

  private checkAnswer(): void {
    const val = this.inputValue();
    if (val === '' || val === '-') return;
    const num = parseInt(val, 10);
    if (isNaN(num)) return;

    const eq = this.currentEquation();
    if (!eq) return;

    if (num === eq.correctAnswer) {
      // Correct — flash green, then advance after 1s
      this.solved.set(true);
      this.correctCount.update(c => c + 1);
      this.totalCount.update(c => c + 1);
      this.clearTimers();
      this.advanceTimeout = setTimeout(() => {
        this.nextEquation();
      }, 1000);
    }
  }

  private handleGameOver(outcome: EquationOutcome): void {
    if (this.finished) return;
    this.finished = true;
    this.failed.set(true);
    this.totalCount.update(c => c + 1);
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
}
