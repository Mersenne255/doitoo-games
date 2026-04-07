import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
  output,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import {
  COLOR_HEX,
  ColorName,
  SPEED_MODE_DELAYS,
  VisualNoiseLevel,
} from '../../models/game.models';

type FeedbackType = 'correct' | 'incorrect' | 'perseverative' | 'timeout' | null;

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar -->
      <div class="top-bar">
        <span class="progress">{{ currentIndex() + 1 }} / {{ totalCards() }}</span>
        @if (game.scoringState().currentStreak >= 3) {
          <span class="streak-badge">🔥 {{ game.scoringState().currentStreak }}</span>
        }
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Timer bar -->
      <div class="timer-bar-track">
        <div class="timer-bar-fill"
             [style.width.%]="timerPercent()"
             [class.urgent]="timerPercent() < 25"></div>
      </div>

      <!-- Instruction label (first 3 sorts) -->
      @if (currentIndex() < 3) {
        <div class="instruction">Sort the card to the matching pile</div>
      }

      <!-- Current card stimulus area -->
      <div class="stimulus-area"
           [class.feedback-correct-border]="feedback() === 'correct'"
           [class.feedback-incorrect-border]="feedback() === 'incorrect' || feedback() === 'perseverative' || feedback() === 'timeout'">
        @if (game.currentCard(); as card) {
          <div class="card-shapes"
               [class.noise-size]="visualNoise() === 'size_variation' || visualNoise() === 'size_variation_rotation'"
               [class.noise-rotate]="visualNoise() === 'size_variation_rotation'"
               [attr.data-count]="card.count">
            @for (i of shapeIndices(card.count); track i) {
              <svg viewBox="0 0 100 100" class="shape-svg shape-lg" [attr.aria-label]="card.shape">
                @switch (card.shape) {
                  @case ('circle') {
                    <circle cx="50" cy="50" r="40"
                            [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                  @case ('triangle') {
                    <polygon points="50,10 90,90 10,90"
                             [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                  @case ('square') {
                    <rect x="15" y="15" width="70" height="70"
                          [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                  @case ('diamond') {
                    <polygon points="50,5 95,50 50,95 5,50"
                             [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                  @case ('star') {
                    <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
                             [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                  @case ('hexagon') {
                    <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
                             [attr.fill]="getHex(card.color)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
                  }
                }
              </svg>
            }
          </div>
          @if (feedback() === 'perseverative') {
            <div class="rule-changed-label">Rule changed!</div>
          }
        }
      </div>

      <!-- Piles -->
      <div class="piles">
        @for (pile of game.currentPiles(); track $index; let idx = $index) {
          <button class="pile-btn"
                  [class.pile-correct]="feedback() && correctPileIdx() === idx"
                  [class.pile-tapped-correct]="feedback() === 'correct' && tappedPileIdx() === idx"
                  [class.pile-tapped-incorrect]="(feedback() === 'incorrect' || feedback() === 'perseverative') && tappedPileIdx() === idx"
                  [disabled]="!!feedback()"
                  (click)="onPileTap(idx)"
                  [attr.aria-label]="'Pile ' + (idx + 1)">
            <div class="pile-shapes" [attr.data-count]="pile.referenceCard.count">
              @for (j of shapeIndices(pile.referenceCard.count); track j) {
                <svg viewBox="0 0 100 100" class="shape-svg shape-sm">
                  @switch (pile.referenceCard.shape) {
                    @case ('circle') {
                      <circle cx="50" cy="50" r="40"
                              [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                    @case ('triangle') {
                      <polygon points="50,10 90,90 10,90"
                               [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                    @case ('square') {
                      <rect x="15" y="15" width="70" height="70"
                            [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                    @case ('diamond') {
                      <polygon points="50,5 95,50 50,95 5,50"
                               [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                    @case ('star') {
                      <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
                               [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                    @case ('hexagon') {
                      <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5"
                               [attr.fill]="getHex(pile.referenceCard.color)" stroke="rgba(255,255,255,0.3)" stroke-width="3" />
                    }
                  }
                </svg>
              }
            </div>
          </button>
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
      overflow: hidden;
    }

    /* ── Top Bar ── */
    .top-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .streak-badge {
      color: #fbbf24;
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0.85;
    }

    .abort-btn {
      margin-left: auto;
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

    /* ── Timer Bar ── */
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

    /* ── Instruction ── */
    .instruction {
      text-align: center;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.5rem;
    }

    /* ── Stimulus Area ── */
    .stimulus-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: 2px solid transparent;
      border-radius: 1rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .stimulus-area.feedback-correct-border {
      border-color: rgba(34, 197, 94, 0.6);
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
    }

    .stimulus-area.feedback-incorrect-border {
      border-color: rgba(239, 68, 68, 0.4);
    }

    /* ── Card Shapes Layout ── */
    .card-shapes {
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      align-items: center;
    }

    .card-shapes[data-count="1"] {
      grid-template-columns: 1fr;
    }

    .card-shapes[data-count="2"] {
      grid-template-columns: 1fr 1fr;
    }

    .card-shapes[data-count="3"] {
      grid-template-columns: 1fr 1fr;
    }

    .card-shapes[data-count="3"] .shape-svg:first-child {
      grid-column: 1 / -1;
      justify-self: center;
    }

    .card-shapes[data-count="4"] {
      grid-template-columns: 1fr 1fr;
    }

    .shape-lg {
      width: 64px;
      height: 64px;
      min-width: 48px;
      min-height: 48px;
    }

    /* ── Rule Changed Label ── */
    .rule-changed-label {
      color: #f97316;
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
      animation: ruleChangePulse 0.5s ease-in-out;
    }

    @keyframes ruleChangePulse {
      0% { opacity: 0; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* ── Piles ── */
    .piles {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      justify-content: center;
      padding: 0.75rem 0 1.5rem;
    }

    .pile-btn {
      flex: 1;
      max-width: 120px;
      min-width: 44px;
      min-height: 44px;
      padding: 0.5rem;
      border-radius: 0.75rem;
      border: 2px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pile-btn:hover:not(:disabled) {
      transform: scale(1.04);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .pile-btn:disabled {
      cursor: default;
    }

    .pile-btn.pile-correct {
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.6), 0 0 32px rgba(34, 197, 94, 0.25);
      border-color: rgba(34, 197, 94, 0.7);
    }

    .pile-btn.pile-tapped-correct {
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4);
      border-color: #22c55e;
    }

    .pile-btn.pile-tapped-incorrect {
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4);
      border-color: #ef4444;
    }

    /* ── Pile Shapes Layout ── */
    .pile-shapes {
      display: grid;
      gap: 0.25rem;
      justify-items: center;
      align-items: center;
    }

    .pile-shapes[data-count="1"] {
      grid-template-columns: 1fr;
    }

    .pile-shapes[data-count="2"] {
      grid-template-columns: 1fr 1fr;
    }

    .pile-shapes[data-count="3"] {
      grid-template-columns: 1fr 1fr;
    }

    .pile-shapes[data-count="3"] .shape-svg:first-child {
      grid-column: 1 / -1;
      justify-self: center;
    }

    .pile-shapes[data-count="4"] {
      grid-template-columns: 1fr 1fr;
    }

    .shape-sm {
      width: 32px;
      height: 32px;
      min-width: 28px;
      min-height: 28px;
    }

    /* ── Visual Noise Animations ── */
    .noise-size {
      animation: noiseSize 0.8s ease-in-out infinite alternate;
    }

    .noise-rotate {
      animation: noiseRotate 1.2s ease-in-out infinite alternate;
    }

    .noise-size.noise-rotate {
      animation: noiseSize 0.8s ease-in-out infinite alternate,
                 noiseRotate 1.2s ease-in-out infinite alternate;
    }

    @keyframes noiseSize {
      0% { transform: scale(1); }
      100% { transform: scale(1.12); }
    }

    @keyframes noiseRotate {
      0% { transform: rotate(-3deg); }
      100% { transform: rotate(3deg); }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);
  readonly abort = output<void>();

  readonly currentIndex = this.game.currentSortIndex;
  readonly totalCards = computed(() => this.game.roundStructure()?.sortAttempts.length ?? 0);
  readonly visualNoise = computed(() => this.game.difficultyParams().visualNoise as VisualNoiseLevel);

  readonly feedback = signal<FeedbackType>(null);
  readonly timerPercent = signal<number>(100);
  readonly tappedPileIdx = signal<number>(-1);
  readonly correctPileIdx = signal<number>(-1);

  private trialStartTime = 0;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.game.currentSortIndex();
      const stage = this.game.stage();
      if (stage === 'playing') {
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

  shapeIndices(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  onPileTap(pileIndex: number): void {
    if (this.feedback()) return;

    const responseTimeMs = Date.now() - this.trialStartTime;
    this.game.recordResponse(pileIndex, responseTimeMs);

    const fs = this.game.feedbackState();
    if (!fs) return;

    this.tappedPileIdx.set(fs.selectedPileIndex);
    this.correctPileIdx.set(fs.correctPileIndex);

    if (fs.correct) {
      this.feedback.set('correct');
    } else if (fs.isPerseverativeError) {
      this.feedback.set('perseverative');
    } else {
      this.feedback.set('incorrect');
    }

    this.clearTimer();
    this.scheduleAdvance();
  }

  onAbort(): void {
    this.clearAllTimers();
    this.abort.emit();
  }

  // ── Timer ──

  private resetForNewTrial(): void {
    this.clearAllTimers();
    this.feedback.set(null);
    this.tappedPileIdx.set(-1);
    this.correctPileIdx.set(-1);
    this.timerPercent.set(100);
    this.trialStartTime = Date.now();
    this.startTimer();
  }

  private startTimer(): void {
    const windowMs = this.game.difficultyParams().responseWindowMs;
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
    if (this.feedback()) return;

    this.game.recordTimeout();

    const fs = this.game.feedbackState();
    this.correctPileIdx.set(fs?.correctPileIndex ?? -1);
    this.tappedPileIdx.set(-1);
    this.feedback.set('timeout');
    this.clearTimer();
    this.scheduleAdvance();
  }

  private scheduleAdvance(): void {
    const interTrialDelay = SPEED_MODE_DELAYS[this.game.config().speedMode];

    this.feedbackTimeoutId = setTimeout(() => {
      this.advanceTimeoutId = setTimeout(() => {
        if (this.game.stage() === 'playing') {
          this.game.advanceSortOrEnd();
        }
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