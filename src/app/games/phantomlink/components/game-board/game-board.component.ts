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
  ColorName,
  SymbolName,
  SYMBOL_NAMES,
  COLOR_NAMES,
  COLOR_HEX,
  SYMBOL_DISPLAY,
  BindingChange,
} from '../../models/game.models';

type FeedbackState = 'correct' | 'incorrect' | 'phantom' | null;

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- LEARNING PHASE -->
    @if (game.playPhase() === 'learning') {
      <div class="board learning-board">
        <div class="learning-top-bar">
          <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
        </div>
        <div class="learning-content">
          <div class="learning-label">Memorize the bindings</div>
          <div class="learning-grid">
            @for (entry of bindingEntries(); track entry.symbol) {
              <div class="binding-card">
                <span class="binding-symbol">{{ symbolChar(entry.symbol) }}</span>
                <span class="binding-swatch" [style.background-color]="getHex(entry.color)"></span>
              </div>
            }
          </div>
          <button class="ready-btn" (click)="onReady()">Ready</button>
        </div>
      </div>
    }

    <!-- TRIAL PHASE -->
    @if (game.playPhase() === 'trial') {
      <div class="board trial-board">
        <div class="top-bar">
          <span class="progress correct-counter">✓ {{ game.scoringState().correctCount }}</span>
          <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
        </div>

        <!-- Stimulus area -->
        <div class="stimulus-area">
          <!-- Inline binding change: previous symbol floats up and shrinks -->
          @if (inlineChange(); as ch) {
            <div class="inline-change" [class.animate-up]="inlineChangeAnimating()">
              <span class="inline-change-symbol">{{ symbolChar(ch.symbol) }}</span>
              <span class="inline-change-label">New color</span>
              <span class="inline-change-swatch" [style.background-color]="getHex(ch.newColor)"></span>
            </div>
          }

          <!-- Current trial symbol -->
          @if (game.currentTrial(); as t) {
            <div class="stimulus-symbol"
                 [class.shine-correct]="feedbackState() === 'correct'"
                 [class.shine-incorrect]="feedbackState() === 'incorrect' || feedbackState() === 'phantom'">
              {{ symbolChar(t.symbol) }}
            </div>
            @if (feedbackState() === 'phantom') {
              <div class="phantom-label">Phantom!</div>
            }
          }
        </div>

        <!-- Option buttons -->
        <div class="options">
          @if (game.currentTrial(); as t) {
            @for (option of sortedOptions(t.options); track option) {
              <button class="option-btn"
                      [style.background-color]="getHex(option)"
                      [class.correct-highlight]="feedbackState() && option === t.correctColor"
                      [disabled]="!!feedbackState()"
                      (click)="onOptionTap(option)"
                      [attr.aria-label]="option">
              </button>
            }
          }
        </div>
      </div>
    }
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

    /* ── Learning Phase ── */
    .learning-board { position: relative; }

    .learning-top-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .learning-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
    }

    .learning-label {
      color: #a5b4fc;
      font-size: 1rem;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.03em;
    }

    .learning-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
      width: 100%;
      max-width: 400px;
    }

    .binding-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.75rem;
      backdrop-filter: blur(6px);
    }

    .binding-symbol {
      font-size: 2rem;
      color: #e2e8f0;
      user-select: none;
    }

    .binding-swatch {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.15);
    }

    .ready-btn {
      padding: 0.75rem 3rem;
      border: 1px solid rgba(34, 197, 94, 0.5);
      border-radius: 0.5rem;
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.5rem;
    }

    .ready-btn:hover { background: rgba(34, 197, 94, 0.35); }

    /* ── Trial Phase ── */
    .trial-board { gap: 0; }

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

    .correct-counter { color: #86efac; }

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

    .stimulus-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      position: relative;
    }

    .stimulus-symbol {
      font-size: 7.8rem;
      color: #e2e8f0;
      user-select: none;
      line-height: 1;
      position: relative;
      transition: text-shadow 0.15s ease, transform 0.15s ease;
    }

    .shine-correct {
      text-shadow:
        0 0 20px rgba(34, 197, 94, 0.8),
        0 0 40px rgba(34, 197, 94, 0.5),
        0 0 80px rgba(34, 197, 94, 0.3);
      transform: scale(1.15);
      color: #86efac;
    }

    .shine-incorrect {
      text-shadow:
        0 0 20px rgba(239, 68, 68, 0.8),
        0 0 40px rgba(239, 68, 68, 0.5),
        0 0 80px rgba(239, 68, 68, 0.3);
      transform: scale(0.9);
      color: #fca5a5;
    }

    .phantom-label {
      color: #a855f7;
      font-size: 1.1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
      animation: phantomPulse 0.5s ease-in-out;
    }

    @keyframes phantomPulse {
      0% { opacity: 0; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* ── Inline binding change ── */
    .inline-change {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      pointer-events: none;
      z-index: 1;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -160%);
      opacity: 0;
    }

    .inline-change.animate-up {
      animation: slideUpSettle 0.4s ease-out forwards;
    }

    .inline-change-symbol {
      font-size: 3.5rem;
      color: #e2e8f0;
      user-select: none;
      line-height: 1;
    }

    .inline-change-label {
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .inline-change-swatch {
      display: inline-block;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.15);
    }

    @keyframes slideUpSettle {
      0% {
        opacity: 0;
        transform: translate(-50%, -100%);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -160%);
      }
    }

    /* Landscape: move inline change to the left instead of above */
    @media (orientation: landscape) {
      .inline-change {
        top: 50%;
        left: 50%;
        transform: translate(-250%, -50%);
      }

      .inline-change.animate-up {
        animation: slideLeftSettle 0.4s ease-out forwards;
      }
    }

    @keyframes slideLeftSettle {
      0% {
        opacity: 0;
        transform: translate(-150%, -50%);
      }
      100% {
        opacity: 1;
        transform: translate(-250%, -50%);
      }
    }

    .options {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      padding-bottom: 2rem;
    }

    .option-btn {
      width: 55px;
      height: 55px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }

    .option-btn:hover:not(:disabled) { transform: scale(1.08); }
    .option-btn:disabled { cursor: default; opacity: 0.7; }

    .option-btn.correct-highlight {
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.7), 0 0 32px rgba(34, 197, 94, 0.3);
      transform: scale(1.1);
      opacity: 1 !important;
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly feedbackState = signal<FeedbackState>(null);
  /** The single binding change to show inline (first change in the event) */
  readonly inlineChange = signal<BindingChange | null>(null);
  /** Triggers the CSS animation class */
  readonly inlineChangeAnimating = signal<boolean>(false);

  readonly bindingEntries = computed(() => {
    const map = this.game.currentBindingMap();
    if (!map) return [];
    return (Object.keys(map) as SymbolName[])
      .filter(s => SYMBOL_NAMES.includes(s))
      .map(symbol => ({ symbol, color: map[symbol] }));
  });

  private trialStartTime = 0;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.game.currentTrialIndex();
      const stage = this.game.stage();
      const phase = this.game.playPhase();
      if (stage === 'playing' && phase === 'trial') {
        this.resetForNewTrial();
      }
    });

    // When a binding change happens, show it inline; when null, clear it
    effect(() => {
      const change = this.game.lastBindingChange();
      if (change && change.changes.length > 0) {
        this.showInlineChange(change.changes[0]);
      } else {
        this.inlineChange.set(null);
        this.inlineChangeAnimating.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  symbolChar(symbol: SymbolName): string {
    return SYMBOL_DISPLAY[symbol] ?? '?';
  }

  getHex(color: ColorName): string {
    return COLOR_HEX[color];
  }

  sortedOptions(options: ColorName[]): ColorName[] {
    return [...options].sort(
      (a, b) => COLOR_NAMES.indexOf(a) - COLOR_NAMES.indexOf(b),
    );
  }

  onOptionTap(color: ColorName): void {
    if (this.feedbackState()) return;

    const trial = this.game.currentTrial();
    if (!trial) return;

    const responseTimeMs = Date.now() - this.trialStartTime;
    this.game.recordResponse(color, responseTimeMs);

    const correct = color === trial.correctColor;
    const isPhantom = !correct && trial.phantomColor !== null && color === trial.phantomColor;

    this.feedbackState.set(isPhantom ? 'phantom' : correct ? 'correct' : 'incorrect');
    this.scheduleAdvance();
  }

  onAbort(): void {
    this.clearAllTimers();
    this.game.abortSession();
  }

  onReady(): void {
    this.game.onLearningDone();
  }

  // ── Inline change display ──

  private showInlineChange(change: BindingChange): void {
    this.inlineChange.set(change);
    this.inlineChangeAnimating.set(false);
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      this.inlineChangeAnimating.set(true);
    });
  }

  // ── Trial management ──

  private resetForNewTrial(): void {
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = null;
    }
    if (this.advanceTimeoutId !== null) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
    this.feedbackState.set(null);
    this.trialStartTime = Date.now();
  }

  private scheduleAdvance(): void {
    this.advanceTimeoutId = setTimeout(() => {
      if (this.game.stage() === 'playing') {
        this.game.advanceTrialOrEnd();
      }
    }, 100);
  }

  private clearAllTimers(): void {
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
