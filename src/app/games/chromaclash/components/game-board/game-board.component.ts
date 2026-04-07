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
import {
  COLOR_HEX,
  ColorName,
  SPEED_MODE_DELAYS,
  VisualNoiseLevel,
} from '../../models/game.models';

type FeedbackState = 'correct' | 'incorrect' | 'timeout' | null;

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar: progress left, abort right -->
      <div class="top-bar">
        <span class="progress">{{ currentIndex() + 1 }} / {{ totalTrials() }}</span>
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Timer bar -->
      <div class="timer-bar-track">
        <div class="timer-bar-fill"
             [style.width.%]="timerPercent()"
             [class.urgent]="timerPercent() < 25"></div>
      </div>

      <!-- Stimulus area -->
      <div class="stimulus-area">
        @if (trial(); as t) {
          @if (t.distractorWords?.length) {
            @for (dw of t.distractorWords; track $index) {
              <div class="distractor-word" [style.color]="getHex(dw.inkColor)">{{ dw.word }}</div>
            }
          }
          <div class="stimulus-word"
               [style.color]="getHex(t.inkColor)"
               [class.feedback-correct]="feedbackState() === 'correct'"
               [class.feedback-incorrect]="feedbackState() === 'incorrect'"
               [class.feedback-timeout]="feedbackState() === 'timeout'"
               [class.noise-size]="visualNoise() === 'size_variation' || visualNoise() === 'size_rotation' || visualNoise() === 'size_rotation_pulse'"
               [class.noise-rotate]="visualNoise() === 'size_rotation' || visualNoise() === 'size_rotation_pulse'"
               [class.noise-pulse]="visualNoise() === 'size_rotation_pulse'">
            {{ t.word }}
          </div>
        }
      </div>

      <!-- Instruction text -->
      <div class="instruction">Tap the ink color</div>

      <!-- Option buttons -->
      <div class="options">
        @if (trial(); as t) {
          @for (option of t.options; track option) {
            <button class="option-btn"
                    [style.background-color]="getHex(option)"
                    [class.correct-highlight]="feedbackState() && option === t.inkColor"
                    [disabled]="!!feedbackState()"
                    (click)="onOptionTap(option)"
                    [attr.aria-label]="option">
            </button>
          }
        }
      </div>
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

    .stimulus-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      gap: 0.5rem;
    }

    .stimulus-word {
      font-size: 2.5rem;
      font-weight: 900;
      text-transform: uppercase;
      text-align: center;
      transition: text-shadow 0.15s ease;
      user-select: none;
    }

    .feedback-correct {
      text-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4);
    }

    .feedback-incorrect {
      text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4);
    }

    .feedback-timeout {
      text-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
    }

    .distractor-word {
      font-size: 1.2rem;
      font-weight: 700;
      opacity: 0.7;
      text-transform: uppercase;
      user-select: none;
    }

    .instruction {
      text-align: center;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }

    .options {
      display: flex;
      flex-direction: row;
      gap: 0.75rem;
      justify-content: center;
      padding-bottom: 2rem;
    }

    .option-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }

    .option-btn:hover:not(:disabled) {
      transform: scale(1.08);
    }

    .option-btn:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .option-btn.correct-highlight {
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.7), 0 0 32px rgba(34, 197, 94, 0.3);
      transform: scale(1.1);
      opacity: 1 !important;
    }

    /* Visual noise animations */
    .noise-size {
      animation: noiseSize 0.8s ease-in-out infinite alternate;
    }

    .noise-rotate {
      animation: noiseRotate 1.2s ease-in-out infinite alternate;
    }

    .noise-pulse {
      animation: noisePulse 0.6s ease-in-out infinite;
    }

    /* When multiple noise classes apply, combine via separate animations */
    .noise-size.noise-rotate {
      animation: noiseSize 0.8s ease-in-out infinite alternate,
                 noiseRotate 1.2s ease-in-out infinite alternate;
    }

    .noise-size.noise-rotate.noise-pulse {
      animation: noiseSize 0.8s ease-in-out infinite alternate,
                 noiseRotate 1.2s ease-in-out infinite alternate,
                 noisePulse 0.6s ease-in-out infinite;
    }

    @keyframes noiseSize {
      0% { transform: scale(1); }
      100% { transform: scale(1.15); }
    }

    @keyframes noiseRotate {
      0% { transform: rotate(-3deg); }
      100% { transform: rotate(3deg); }
    }

    @keyframes noisePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly trial = this.game.currentTrial;
  readonly currentIndex = this.game.currentTrialIndex;
  readonly totalTrials = computed(() => this.game.trials().length);
  readonly visualNoise = computed(() => this.game.difficultyParams().visualNoise as VisualNoiseLevel);

  readonly feedbackState = signal<FeedbackState>(null);
  readonly timerPercent = signal<number>(100);

  private trialStartTime = 0;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Watch for trial index changes to reset timer and feedback
    effect(() => {
      const _idx = this.game.currentTrialIndex();
      const _stage = this.game.stage();
      if (_stage === 'playing') {
        this.resetForNewTrial();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  getHex(color: ColorName): string {
    return COLOR_HEX[color];
  }

  onOptionTap(color: ColorName): void {
    if (this.feedbackState()) return;

    const trial = this.trial();
    if (!trial) return;

    const responseTimeMs = Date.now() - this.trialStartTime;
    this.game.recordResponse(color, responseTimeMs);

    const correct = color === trial.inkColor;
    this.feedbackState.set(correct ? 'correct' : 'incorrect');
    this.clearTimer();
    this.scheduleAdvance();
  }

  onAbort(): void {
    this.clearAllTimers();
    this.game.abortSession();
  }

  private resetForNewTrial(): void {
    this.clearAllTimers();
    this.feedbackState.set(null);
    this.timerPercent.set(100);
    this.trialStartTime = Date.now();
    this.startTimer();
  }

  private startTimer(): void {
    const params = this.game.difficultyParams();
    const windowMs = params.responseWindowMs;
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
    if (this.feedbackState()) return;

    this.game.recordTimeout();
    this.feedbackState.set('timeout');
    this.clearTimer();
    this.scheduleAdvance();
  }

  private scheduleAdvance(): void {
    const config = this.game.config();
    const interTrialDelay = SPEED_MODE_DELAYS[config.speedMode];

    this.feedbackTimeoutId = setTimeout(() => {
      this.advanceTimeoutId = setTimeout(() => {
        this.game.advanceTrialOrEnd();
      }, interTrialDelay);
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
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = null;
    }
    if (this.advanceTimeoutId !== null) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
  }
}
