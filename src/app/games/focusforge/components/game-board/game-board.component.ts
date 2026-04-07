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
  SHAPE_COLOR_HEX,
  ShapeColor,
  ShapeInstance,
  SPEED_MODE_DELAYS,
} from '../../models/game.models';

type FeedbackState = 'correct' | 'incorrect' | 'timeout' | null;

@Component({
  selector: 'app-focusforge-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar -->
      <div class="top-bar">
        <span class="progress">{{ currentIndex() + 1 }} / {{ totalTrials() }}</span>
        <span class="rule-text" [class.rule-highlight]="ruleHighlight()">
          {{ game.currentRule()?.instruction }}
        </span>
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Timer bar -->
      <div class="timer-bar-track">
        <div class="timer-bar-fill"
             [style.width.%]="timerPercent()"
             [class.urgent]="timerPercent() < 25"></div>
      </div>

      <!-- Search field -->
      <div class="field-wrapper">
        <svg viewBox="0 0 600 600"
             class="search-field"
             xmlns="http://www.w3.org/2000/svg">
          @if (trial(); as t) {
            @for (shape of t.shapes; track $index) {
              <g [attr.transform]="getShapeTransform(shape)"
                 class="shape-group"
                 (click)="onShapeTap($index); $event.stopPropagation()"
                 role="button"
                 [attr.aria-label]="shape.color + ' ' + shape.form">

                @switch (shape.form) {
                  @case ('circle') {
                    <circle r="22" cx="0" cy="0"
                            [attr.fill]="getColor(shape.color)"
                            stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('square') {
                    <rect x="-22" y="-22" width="44" height="44"
                          [attr.fill]="getColor(shape.color)"
                          stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('triangle') {
                    <polygon points="0,-24 21,18 -21,18"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('diamond') {
                    <polygon points="0,-24 22,0 0,24 -22,0"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('pentagon') {
                    <polygon [attr.points]="pentagonPoints"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('hexagon') {
                    <polygon [attr.points]="hexagonPoints"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('star') {
                    <polygon [attr.points]="starPoints"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                  @case ('cross') {
                    <polygon [attr.points]="crossPoints"
                             [attr.fill]="getColor(shape.color)"
                             stroke="rgba(255,255,255,0.3)" stroke-width="1" />
                  }
                }

                <!-- Feedback ring: correct or target highlight -->
                @if (feedbackState() && shape.isTarget) {
                  <circle r="30" cx="0" cy="0"
                          fill="none"
                          stroke="#22c55e"
                          stroke-width="3"
                          [class.glow-pulse]="feedbackState() === 'timeout'"
                          class="feedback-ring" />
                }
                <!-- Feedback: red flash on tapped distractor -->
                @if (feedbackState() === 'incorrect' && tappedIndex() === $index && !shape.isTarget) {
                  <circle r="30" cx="0" cy="0"
                          fill="none"
                          stroke="#ef4444"
                          stroke-width="3"
                          class="feedback-ring red-flash" />
                }
              </g>
            }
          }
        </svg>
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
      overflow: hidden;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .progress {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .rule-text {
      flex: 1;
      text-align: center;
      color: #e2e8f0;
      font-size: 0.9rem;
      font-weight: 600;
      transition: color 0.3s, text-shadow 0.3s;
    }

    .rule-highlight {
      color: #a5b4fc;
      text-shadow: 0 0 12px rgba(99, 102, 241, 0.8), 0 0 24px rgba(99, 102, 241, 0.4);
      animation: ruleFlash 600ms ease-out;
    }

    @keyframes ruleFlash {
      0% { color: #6366f1; text-shadow: 0 0 20px rgba(99, 102, 241, 1); }
      100% { color: #e2e8f0; text-shadow: none; }
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
      flex-shrink: 0;
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

    .field-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      padding: 0.5rem 0;
    }

    .search-field {
      width: 100%;
      max-height: 100%;
      aspect-ratio: 1;
    }

    .shape-group {
      cursor: pointer;
    }

    .feedback-ring {
      animation: glowIn 0.2s ease-out forwards;
    }

    .feedback-ring.glow-pulse {
      animation: glowPulse 0.4s ease-in-out 2;
    }

    .feedback-ring.red-flash {
      animation: redFlash 0.3s ease-out forwards;
    }

    @keyframes glowIn {
      0% { opacity: 0; stroke-width: 1; }
      100% { opacity: 1; stroke-width: 3; }
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.5; stroke-width: 2; }
      50% { opacity: 1; stroke-width: 4; }
    }

    @keyframes redFlash {
      0% { opacity: 1; stroke-width: 4; }
      100% { opacity: 0.6; stroke-width: 2; }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly trial = this.game.currentTrial;
  readonly currentIndex = this.game.currentTrialIndex;
  readonly totalTrials = computed(() => this.game.trials().length);

  readonly feedbackState = signal<FeedbackState>(null);
  readonly timerPercent = signal<number>(100);
  readonly tappedIndex = signal<number>(-1);
  readonly ruleHighlight = signal<boolean>(false);

  private trialStartTime = 0;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private ruleHighlightTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private rulePauseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Pre-computed polygon points for complex shapes
  readonly pentagonPoints = generateRegularPolygonPoints(5, 22);
  readonly hexagonPoints = generateRegularPolygonPoints(6, 22);
  readonly starPoints = generateStarPoints(5, 22, 10);
  readonly crossPoints = '-8,-22 8,-22 8,-8 22,-8 22,8 8,8 8,22 -8,22 -8,8 -22,8 -22,-8 -8,-8';

  constructor() {
    effect(() => {
      const _idx = this.game.currentTrialIndex();
      const _stage = this.game.stage();
      if (_stage === 'playing') {
        this.handleNewTrial();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  getColor(color: ShapeColor): string {
    return SHAPE_COLOR_HEX[color];
  }

  getShapeTransform(shape: ShapeInstance): string {
    const x = shape.x * 600;
    const y = shape.y * 600;
    return `translate(${x}, ${y}) rotate(${shape.rotation}) scale(${shape.scale})`;
  }

  onShapeTap(index: number): void {
    if (this.feedbackState()) return;

    const trial = this.trial();
    if (!trial) return;

    const responseTimeMs = Date.now() - this.trialStartTime;
    const correct = trial.shapes[index]?.isTarget ?? false;

    this.tappedIndex.set(index);
    this.game.recordResponse(index, responseTimeMs);
    this.feedbackState.set(correct ? 'correct' : 'incorrect');
    this.clearTimer();
    this.scheduleAdvance();
  }

  onAbort(): void {
    this.clearAllTimers();
    this.game.abortSession();
  }

  private handleNewTrial(): void {
    this.clearAllTimers();
    this.feedbackState.set(null);
    this.tappedIndex.set(-1);
    this.timerPercent.set(100);

    if (this.game.ruleJustSwitched()) {
      this.ruleHighlight.set(true);
      this.ruleHighlightTimeoutId = setTimeout(() => {
        this.ruleHighlight.set(false);
      }, 600);

      // Pause 1200ms before starting the timer for the new rule block
      this.rulePauseTimeoutId = setTimeout(() => {
        this.trialStartTime = Date.now();
        this.startTimer();
      }, 1200);
    } else {
      this.trialStartTime = Date.now();
      this.startTimer();
    }
  }

  private startTimer(): void {
    const params = this.game.difficultyParams();
    const windowMs = params.responseWindowMs;
    const startTime = Date.now();

    this.timerIntervalId = setInterval(() => {
      if (this.game.stage() !== 'playing') {
        this.clearTimer();
        return;
      }

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
    this.tappedIndex.set(-1);
    this.clearTimer();
    this.scheduleAdvance();
  }

  private scheduleAdvance(): void {
    const config = this.game.config();
    const delay = SPEED_MODE_DELAYS[config.speedMode];

    this.feedbackTimeoutId = setTimeout(() => {
      this.advanceTimeoutId = setTimeout(() => {
        if (this.game.stage() === 'playing') {
          this.game.advanceTrialOrEnd();
        }
      }, delay);
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
    if (this.ruleHighlightTimeoutId !== null) {
      clearTimeout(this.ruleHighlightTimeoutId);
      this.ruleHighlightTimeoutId = null;
    }
    if (this.rulePauseTimeoutId !== null) {
      clearTimeout(this.rulePauseTimeoutId);
      this.rulePauseTimeoutId = null;
    }
  }
}

/** Generate points string for a regular polygon centered at origin */
function generateRegularPolygonPoints(sides: number, radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    const x = Math.round(radius * Math.cos(angle) * 100) / 100;
    const y = Math.round(radius * Math.sin(angle) * 100) / 100;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

/** Generate points string for a star polygon centered at origin */
function generateStarPoints(points: number, outerR: number, innerR: number): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.round(r * Math.cos(angle) * 100) / 100;
    const y = Math.round(r * Math.sin(angle) * 100) / 100;
    coords.push(`${x},${y}`);
  }
  return coords.join(' ');
}
