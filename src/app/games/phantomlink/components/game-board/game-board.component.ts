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
  COLOR_HEX,
  SYMBOL_DISPLAY,
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

    <!-- BINDING CHANGE ANNOUNCEMENT -->
    @if (game.playPhase() === 'trial' && game.pendingAnnouncement()) {
      <div class="board announcement-board">
        <div class="announcement-overlay">
          <div class="announcement-timer-track">
            <div class="announcement-timer-fill" [style.width.%]="announcementPercent()"></div>
          </div>
          @for (change of game.pendingAnnouncement()!.changes; track change.symbol) {
            <div class="announcement-column">
              <span class="announcement-label">New color</span>
              <span class="announcement-symbol">{{ symbolChar(change.symbol) }}</span>
              <span class="swatch-circle" [style.background-color]="getHex(change.newColor)"></span>
            </div>
          }
        </div>
      </div>
    }

    <!-- TRIAL PHASE -->
    @if (game.playPhase() === 'trial' && !game.pendingAnnouncement()) {
      <div class="board trial-board">
        <!-- Top bar: correct count left, abort right -->
        <div class="top-bar">
          <span class="progress correct-counter">✓ {{ game.scoringState().correctCount }}</span>
          <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
        </div>

        <!-- Stimulus area -->
        <div class="stimulus-area">
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
            @for (option of t.options; track option) {
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
    .learning-board {
      position: relative;
    }

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

    .ready-btn:hover {
      background: rgba(34, 197, 94, 0.35);
    }

    /* ── Announcement Overlay ── */
    .announcement-board {
      align-items: center;
      justify-content: center;
    }

    .announcement-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 2rem;
      background: rgba(99, 102, 241, 0.08);
      border: 2px solid rgba(129, 140, 248, 0.4);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      min-width: 280px;
    }

    .announcement-timer-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .announcement-timer-fill {
      height: 100%;
      background: #818cf8;
      border-radius: 2px;
      transition: width 50ms linear;
    }

    .announcement-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .announcement-label {
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .announcement-symbol {
      font-size: 3rem;
      color: #e2e8f0;
      user-select: none;
      line-height: 1;
    }

    .swatch-circle {
      display: inline-block;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.15);
    }

    /* ── Trial Phase ── */
    .trial-board {
      gap: 0;
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

    .correct-counter {
      color: #86efac;
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

    .stimulus-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: box-shadow 0.15s ease;
    }

    .stimulus-symbol {
      font-size: 4rem;
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

    .options {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
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
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly feedbackState = signal<FeedbackState>(null);
  readonly announcementPercent = signal<number>(100);

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
  private announcementTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private announcementIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Watch for trial index changes to reset feedback
    effect(() => {
      this.game.currentTrialIndex(); // track signal
      const stage = this.game.stage();
      const phase = this.game.playPhase();
      if (stage === 'playing' && phase === 'trial' && !this.game.pendingAnnouncement()) {
        this.resetForNewTrial();
      }
    });

    // Watch for pending announcement to start announcement timer
    effect(() => {
      const pending = this.game.pendingAnnouncement();
      const stage = this.game.stage();
      if (stage === 'playing' && pending) {
        this.startAnnouncementTimer();
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

  // ── Announcement Timer ──

  private startAnnouncementTimer(): void {
    this.clearAnnouncementTimer();
    const durationMs = this.game.config().announcementDurationS * 1000;
    const startTime = Date.now();
    this.announcementPercent.set(100);

    this.announcementIntervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.announcementPercent.set(Math.max(0, 100 - (elapsed / durationMs) * 100));
    }, 50);

    this.announcementTimeoutId = setTimeout(() => {
      if (this.game.stage() === 'playing' && this.game.pendingAnnouncement()) {
        this.game.onAnnouncementDone();
      }
    }, durationMs);
  }

  private clearAnnouncementTimer(): void {
    if (this.announcementTimeoutId !== null) {
      clearTimeout(this.announcementTimeoutId);
      this.announcementTimeoutId = null;
    }
    if (this.announcementIntervalId !== null) {
      clearInterval(this.announcementIntervalId);
      this.announcementIntervalId = null;
    }
  }

  // ── Trial management ──

  private resetForNewTrial(): void {
    this.clearAllTimers();
    this.feedbackState.set(null);
    this.trialStartTime = Date.now();
  }

  private scheduleAdvance(): void {
    this.feedbackTimeoutId = setTimeout(() => {
      this.advanceTimeoutId = setTimeout(() => {
        if (this.game.stage() === 'playing') {
          this.game.advanceTrialOrEnd();
        }
      }, 400);
    }, 500);
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
    this.clearAnnouncementTimer();
  }
}
