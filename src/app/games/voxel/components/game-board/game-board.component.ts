import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { ThreeSceneService } from '../../services/three-scene.service';
import {
  Projection,
  ProjectionCell,
  SPEED_MODE_DELAYS,
  VoxelStage,
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
        <span class="progress">Trial {{ currentIndex() + 1 }} / {{ totalTrials() }}</span>
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Memorizing stage -->
      @if (stage() === 'memorizing') {
        <!-- Memorization timer bar (only when finite) -->
        @if (hasMemorizationTimer()) {
          <div class="timer-bar-track">
            <div class="timer-bar-fill"
                 [style.width.%]="memTimerPercent()"
                 [class.urgent]="memTimerPercent() < 25"></div>
          </div>
          <div class="timer-label" [class.urgent-text]="memTimerPercent() < 25">
            {{ memTimerDisplay() }}s
          </div>
        }

        <!-- 3D Canvas -->
        <div class="canvas-wrapper">
          <canvas #threeCanvas class="three-canvas"></canvas>
        </div>

        <!-- Ready button -->
        <button class="ready-btn" (click)="onReady()">Ready</button>
      }

      <!-- Questioning stage -->
      @if (stage() === 'questioning') {
        <!-- Response timer bar (only when finite) -->
        @if (hasResponseTimer()) {
          <div class="timer-bar-track">
            <div class="timer-bar-fill"
                 [style.width.%]="responseTimerPercent()"
                 [class.urgent]="responseTimerPercent() < 25"></div>
          </div>
        }

        <!-- Feedback 3D re-display -->
        @if (showFeedback3D()) {
          <div class="canvas-wrapper feedback-canvas">
            <canvas #feedbackCanvas class="three-canvas"></canvas>
          </div>
        } @else {
          <!-- Question text -->
          <div class="question-area">
            <p class="question-text">
              What does this object look like from the
              <span class="direction-highlight">{{ askedDirection() }}</span>?
            </p>
          </div>

          <!-- Option cards 2×2 grid -->
          <div class="options-grid">
            @for (option of options(); track $index) {
              <button class="option-card"
                      [class.selected-correct]="feedbackState() && $index === selectedIndex() && feedbackState() === 'correct'"
                      [class.selected-incorrect]="feedbackState() && $index === selectedIndex() && (feedbackState() === 'incorrect' || feedbackState() === 'timeout')"
                      [class.highlight-correct]="feedbackState() && $index === correctIndex()"
                      [disabled]="!!feedbackState()"
                      (click)="onOptionTap($index)"
                      [attr.aria-label]="'Option ' + ($index + 1)">
                <div class="projection-grid"
                     [style.grid-template-columns]="'repeat(' + option.width + ', 1fr)'"
                     [style.grid-template-rows]="'repeat(' + option.height + ', 1fr)'">
                  @for (row of getRowIndices(option); track row) {
                    @for (col of getColIndices(option); track col) {
                      <div class="projection-cell"
                           [style.background-color]="getCellColor(option.grid[row][col])">
                      </div>
                    }
                  }
                </div>
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }

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

    .progress { color: #94a3b8; font-size: 0.85rem; font-weight: 600; }

    .abort-btn {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5; font-size: 0.875rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, border-color 0.2s;
      backdrop-filter: blur(4px);
    }
    .abort-btn:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.6);
    }

    /* Timer bar */
    .timer-bar-track {
      height: 4px; background: rgba(255,255,255,0.1);
      border-radius: 2px; margin-top: 0.5rem; overflow: hidden;
    }
    .timer-bar-fill {
      height: 100%; background: #6366f1; border-radius: 2px;
      transition: width 50ms linear;
    }
    .timer-bar-fill.urgent { background: #ef4444; }

    .timer-label {
      text-align: center; color: #94a3b8; font-size: 0.8rem;
      font-weight: 600; margin-top: 0.25rem;
      transition: color 0.3s;
    }
    .timer-label.urgent-text { color: #ef4444; }

    /* Canvas wrapper */
    .canvas-wrapper {
      flex: 1; position: relative; min-height: 0;
      border-radius: 0.75rem; overflow: hidden;
      margin: 0.5rem 0;
    }
    .three-canvas {
      width: 100%; height: 100%;
      display: block; border-radius: 0.75rem;
    }
    .feedback-canvas {
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    /* Ready button */
    .ready-btn {
      align-self: center;
      padding: 0.6rem 2.5rem; border-radius: 0.75rem;
      border: 1px solid rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc; font-weight: 700; font-size: 1rem;
      cursor: pointer; transition: background 0.2s, transform 0.15s;
      margin-bottom: 0.5rem;
      backdrop-filter: blur(6px);
    }
    .ready-btn:hover { background: rgba(99, 102, 241, 0.35); }
    .ready-btn:active { transform: scale(0.97); }

    /* Question area */
    .question-area {
      text-align: center; padding: 1rem 0.5rem;
    }
    .question-text {
      color: #e2e8f0; font-size: 1.05rem; font-weight: 500;
      line-height: 1.5; margin: 0;
    }
    .direction-highlight {
      color: #818cf8; font-weight: 800; text-transform: capitalize;
    }

    /* Options grid */
    .options-grid {
      flex: 1; display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 0.6rem; padding: 0.25rem 0 1rem;
      min-height: 0;
    }

    .option-card {
      display: flex; align-items: center; justify-content: center;
      border-radius: 0.75rem;
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(8px);
      cursor: pointer; padding: 0.5rem;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
      min-height: 44px; min-width: 44px;
    }
    .option-card:hover:not(:disabled) {
      border-color: rgba(99, 102, 241, 0.5);
      transform: scale(1.02);
    }
    .option-card:active:not(:disabled) { transform: scale(0.98); }
    .option-card:disabled { cursor: default; }

    .option-card.selected-correct {
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.6), 0 0 32px rgba(34, 197, 94, 0.25);
      border-color: rgba(34, 197, 94, 0.7);
    }
    .option-card.selected-incorrect {
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.6), 0 0 32px rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.7);
    }
    .option-card.highlight-correct {
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.6), 0 0 32px rgba(34, 197, 94, 0.25);
      border-color: rgba(34, 197, 94, 0.7);
    }

    /* Projection grid inside option cards */
    .projection-grid {
      display: grid; gap: 1px;
      width: 100%; height: 100%;
      aspect-ratio: 1;
      max-width: 100%; max-height: 100%;
    }
    .projection-cell {
      border-radius: 1px;
      border: 0.5px solid rgba(255, 255, 255, 0.06);
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  private readonly game = inject(GameService);
  private readonly threeScene = inject(ThreeSceneService);

  @ViewChild('threeCanvas') threeCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('feedbackCanvas') feedbackCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly stage = this.game.stage;
  readonly currentIndex = this.game.currentTrialIndex;
  readonly totalTrials = computed(() => this.game.trials().length);

  readonly trial = this.game.currentTrial;
  readonly askedDirection = computed(() => this.trial()?.askedDirection ?? '');
  readonly options = computed(() => this.trial()?.options ?? []);
  readonly correctIndex = computed(() => this.trial()?.correctIndex ?? -1);

  readonly hasMemorizationTimer = computed(() => this.game.difficultyParams().memorizationTimeSec !== null);
  readonly hasResponseTimer = computed(() => this.game.difficultyParams().responseWindowMs !== null);

  readonly feedbackState = signal<FeedbackState>(null);
  readonly selectedIndex = signal<number>(-1);
  readonly memTimerPercent = signal<number>(100);
  readonly memTimerDisplay = signal<number>(0);
  readonly responseTimerPercent = signal<number>(100);
  readonly showFeedback3D = signal<boolean>(false);

  private memStartTime = 0;
  private questionStartTime = 0;
  private feedbackActive = false;

  private memTimerIntervalId: ReturnType<typeof setInterval> | null = null;
  private responseTimerIntervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private feedback3DTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private threeInitialized = false;
  private previousStage: VoxelStage | null = null;

  constructor() {
    effect(() => {
      const currentStage = this.game.stage();
      this.game.currentTrial(); // track trial changes to re-trigger effect
      const prevStage = this.previousStage;
      this.previousStage = currentStage;

      if (currentStage === 'memorizing' && prevStage !== 'memorizing') {
        // Use queueMicrotask to ensure ViewChild is available after template renders
        queueMicrotask(() => this.initMemorizing());
      }

      if (currentStage === 'questioning' && prevStage === 'memorizing') {
        this.cleanupThreeScene();
        this.initQuestioning();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
    this.cleanupThreeScene();
  }

  onReady(): void {
    const elapsed = Date.now() - this.memStartTime;
    this.clearMemTimer();
    this.game.endMemorization(elapsed);
  }

  onOptionTap(index: number): void {
    if (this.feedbackActive) return;
    if (this.feedbackState()) return;

    const trial = this.trial();
    if (!trial) return;

    this.feedbackActive = true;
    const responseTimeMs = Date.now() - this.questionStartTime;
    this.selectedIndex.set(index);
    this.clearResponseTimer();

    const correct = index === trial.correctIndex;
    this.game.recordResponse(index, responseTimeMs);

    if (correct) {
      this.feedbackState.set('correct');
      this.scheduleAdvance();
    } else {
      this.feedbackState.set('incorrect');
      this.showIncorrectFeedback();
    }
  }

  onAbort(): void {
    this.clearAllTimers();
    this.cleanupThreeScene();
    this.game.abortSession();
  }

  getRowIndices(proj: Projection): number[] {
    return Array.from({ length: proj.height }, (_, i) => i);
  }

  getColIndices(proj: Projection): number[] {
    return Array.from({ length: proj.width }, (_, i) => i);
  }

  getCellColor(cell: ProjectionCell): string {
    if (cell === null) return 'transparent';
    if (cell === 'filled') return '#6366f1';
    return cell; // VoxelColor hex string
  }

  // ── Memorizing stage ──

  private initMemorizing(): void {
    this.feedbackState.set(null);
    this.selectedIndex.set(-1);
    this.feedbackActive = false;
    this.showFeedback3D.set(false);
    this.memStartTime = Date.now();

    const trial = this.trial();
    if (!trial) return;

    const canvas = this.threeCanvasRef?.nativeElement;
    if (!canvas) return;

    const colorMode = this.game.config().multiColorMode;
    this.threeScene.dispose();
    this.threeScene.init(canvas, trial.shape, colorMode);
    this.threeScene.startAnimationLoop();
    this.threeInitialized = true;

    // Start memorization timer if finite
    const memTimeSec = this.game.difficultyParams().memorizationTimeSec;
    if (memTimeSec !== null) {
      this.memTimerDisplay.set(memTimeSec);
      this.memTimerPercent.set(100);
      this.startMemTimer(memTimeSec);
    }
  }

  private startMemTimer(totalSec: number): void {
    const totalMs = totalSec * 1000;
    const startTime = Date.now();

    this.memTimerIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / totalMs) * 100);
      this.memTimerPercent.set(remaining);
      this.memTimerDisplay.set(Math.max(0, Math.ceil((totalMs - elapsed) / 1000)));

      if (remaining <= 0) {
        this.clearMemTimer();
        this.game.endMemorization(totalMs);
      }
    }, 50);
  }

  // ── Questioning stage ──

  private initQuestioning(): void {
    this.questionStartTime = Date.now();
    this.responseTimerPercent.set(100);

    const responseWindowMs = this.game.difficultyParams().responseWindowMs;
    if (responseWindowMs !== null) {
      this.startResponseTimer(responseWindowMs);
    }
  }

  private startResponseTimer(windowMs: number): void {
    const startTime = Date.now();

    this.responseTimerIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / windowMs) * 100);
      this.responseTimerPercent.set(remaining);

      if (remaining <= 0) {
        this.onTimeout();
      }
    }, 50);
  }

  private onTimeout(): void {
    if (this.feedbackActive) return;
    this.feedbackActive = true;
    this.clearResponseTimer();

    this.game.recordTimeout();
    this.feedbackState.set('timeout');
    this.selectedIndex.set(-1);

    this.showIncorrectFeedback();
  }

  // ── Feedback ──

  private showIncorrectFeedback(): void {
    const trial = this.trial();
    if (!trial) { this.scheduleAdvance(); return; }

    // Show 3D shape rotated to correct angle for 1500ms
    this.showFeedback3D.set(true);

    queueMicrotask(() => {
      const canvas = this.feedbackCanvasRef?.nativeElement;
      if (canvas) {
        const colorMode = this.game.config().multiColorMode;
        this.threeScene.dispose();
        this.threeScene.init(canvas, trial.shape, colorMode);
        this.threeScene.rotateTo(trial.askedDirection);
        this.threeScene.startAnimationLoop();
        this.threeInitialized = true;
      }

      this.feedback3DTimeoutId = setTimeout(() => {
        this.cleanupThreeScene();
        this.showFeedback3D.set(false);
        this.scheduleAdvance();
      }, 1500);
    });
  }

  private scheduleAdvance(): void {
    const config = this.game.config();
    const delay = SPEED_MODE_DELAYS[config.speedMode];

    this.advanceTimeoutId = setTimeout(() => {
      this.game.advanceTrialOrEnd();
    }, delay);
  }

  // ── Cleanup ──

  private cleanupThreeScene(): void {
    if (this.threeInitialized) {
      this.threeScene.stopAnimationLoop();
      this.threeScene.dispose();
      this.threeInitialized = false;
    }
  }

  private clearMemTimer(): void {
    if (this.memTimerIntervalId !== null) {
      clearInterval(this.memTimerIntervalId);
      this.memTimerIntervalId = null;
    }
  }

  private clearResponseTimer(): void {
    if (this.responseTimerIntervalId !== null) {
      clearInterval(this.responseTimerIntervalId);
      this.responseTimerIntervalId = null;
    }
  }

  private clearAllTimers(): void {
    this.clearMemTimer();
    this.clearResponseTimer();
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = null;
    }
    if (this.advanceTimeoutId !== null) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
    if (this.feedback3DTimeoutId !== null) {
      clearTimeout(this.feedback3DTimeoutId);
      this.feedback3DTimeoutId = null;
    }
  }
}
