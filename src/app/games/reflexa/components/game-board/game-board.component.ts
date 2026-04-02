import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  HostListener,
  computed,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { generateRound } from '../../utils/trial-generator.util';
import { Trial, COLOR_HEX, TrialOutcome } from '../../models/game.models';

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showRuleSwitch()) {
      <div class="rule-switch-overlay">NEW RULE</div>
    } @else if (currentTrial(); as trial) {
      <div class="board">
        <div class="rule-bar">{{ trial.activeRule.instruction }}</div>
        <div class="progress">{{ trial.index + 1 }} / {{ trials().length }}</div>

        <div class="stimulus-area" [class]="'pos-' + trial.stimulus.position">
          <div class="stimulus"
            [class.nogo]="trial.stimulus.isNogo"
            [style.color]="colorHex(trial.stimulus.displayColor)"
            [class.feedback-correct]="feedback() === 'correct'"
            [class.feedback-incorrect]="feedback() === 'incorrect'">
            {{ trial.stimulus.content }}
          </div>
        </div>

        <div class="timer-bar">
          <div class="timer-fill" [style.width.%]="timerPercent()"></div>
        </div>

        <div class="response-buttons">
          @for (option of trial.activeRule.responseOptions; track option) {
            <button class="response-btn"
              [disabled]="responded()"
              (click)="onResponse(option)"
              [attr.aria-label]="option">
              {{ option }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .board {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 1rem;
      box-sizing: border-box;
    }
    .rule-bar {
      text-align: center;
      font-size: 1.1rem;
      font-weight: 700;
      color: #a5b4fc;
      padding: 0.5rem;
      letter-spacing: 0.05em;
    }
    .progress {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .stimulus-area {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 1rem;
      &.pos-left { justify-content: flex-start; }
      &.pos-center { justify-content: center; }
      &.pos-right { justify-content: flex-end; }
    }
    .stimulus {
      font-size: 3.5rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: transform 0.1s;
      user-select: none;
      &.nogo {
        border: 4px solid #ef4444;
        border-radius: 0.75rem;
        padding: 0.5rem 1rem;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
      }
      &.feedback-correct { text-shadow: 0 0 30px rgba(34, 197, 94, 0.8); }
      &.feedback-incorrect { text-shadow: 0 0 30px rgba(239, 68, 68, 0.8); }
    }
    .timer-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin: 0.5rem 0;
      overflow: hidden;
    }
    .timer-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #3b82f6);
      border-radius: 2px;
      transition: width 0.1s linear;
    }
    .response-buttons {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 0 1.5rem;
    }
    .response-btn {
      flex: 1;
      padding: 0.875rem 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: capitalize;
      cursor: pointer;
      transition: background 0.15s;
      &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); }
      &:disabled { opacity: 0.5; cursor: default; }
    }
    .rule-switch-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 15, 26, 0.92);
      backdrop-filter: blur(8px);
      font-size: 2.5rem;
      font-weight: 900;
      color: #fbbf24;
      text-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
      z-index: 100;
    }
  `],
})
export class GameBoardComponent implements OnInit, OnDestroy {
  readonly game = inject(GameService);

  readonly trials = signal<Trial[]>([]);
  readonly trialIndex = signal(0);
  readonly responded = signal(false);
  readonly feedback = signal<'correct' | 'incorrect' | null>(null);
  readonly timerPercent = signal(100);
  readonly showRuleSwitch = signal(false);

  readonly currentTrial = computed(() => {
    const t = this.trials();
    const i = this.trialIndex();
    return i < t.length ? t[i] : null;
  });

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private trialTimeout: ReturnType<typeof setTimeout> | null = null;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private ruleSwitchTimeout: ReturnType<typeof setTimeout> | null = null;
  private trialStartTime = 0;
  private paused = false;
  private pausedElapsed = 0;

  colorHex(color: string): string {
    return COLOR_HEX[color as keyof typeof COLOR_HEX] ?? color;
  }

  ngOnInit(): void {
    const cfg = this.game.config();
    const seed = Date.now();
    const generated = generateRound(cfg.difficulty, cfg.trialCount, seed);
    this.trials.set(generated);
    this.startTrial();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const trial = this.currentTrial();
    if (!trial || this.responded() || this.showRuleSwitch()) return;

    const key = event.key.toLowerCase();
    const options = trial.activeRule.responseOptions;

    // Map arrow keys
    const arrowMap: Record<string, string> = {
      arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
    };
    const mapped = arrowMap[key] ?? key;

    // Check if the key matches any response option (first letter or full name)
    const match = options.find(o => o === mapped || o[0] === mapped);
    if (match) {
      this.onResponse(match);
    }
  }

  onResponse(option: string): void {
    if (this.responded()) return;
    this.responded.set(true);
    this.clearTrialTimer();

    const trial = this.currentTrial();
    if (!trial) return;

    const responseTime = Date.now() - this.trialStartTime;

    let outcome: TrialOutcome;
    if (trial.stimulus.isNogo) {
      outcome = 'false_alarm';
      this.feedback.set('incorrect');
    } else if (option === trial.correctResponse) {
      outcome = 'correct_go';
      this.feedback.set('correct');
    } else {
      outcome = 'incorrect_go';
      this.feedback.set('incorrect');
    }

    this.game.recordTrialResult({
      trialIndex: trial.index,
      outcome,
      responseTimeMs: responseTime,
      isCongruent: trial.isCongruent,
      conflictTypes: trial.conflictTypes,
    });

    // Show feedback for 100ms, then inter-trial interval of 500ms
    this.feedbackTimeout = setTimeout(() => {
      this.feedback.set(null);
      this.feedbackTimeout = setTimeout(() => this.advanceTrial(), 400);
    }, 100);
  }

  private startTrial(): void {
    const trial = this.currentTrial();
    if (!trial) {
      this.game.endRound();
      return;
    }

    // Handle rule switch notification
    if (trial.isRuleSwitch) {
      this.showRuleSwitch.set(true);
      this.ruleSwitchTimeout = setTimeout(() => {
        this.showRuleSwitch.set(false);
        this.beginTrialTimer();
      }, 1000);
    } else {
      this.beginTrialTimer();
    }
  }

  private beginTrialTimer(): void {
    const trial = this.currentTrial();
    if (!trial) return;

    this.responded.set(false);
    this.feedback.set(null);
    this.timerPercent.set(100);
    this.trialStartTime = Date.now();
    this.paused = false;
    this.pausedElapsed = 0;

    const windowMs = trial.responseWindowMs;

    // Update timer bar every 50ms
    this.timerInterval = setInterval(() => {
      if (this.paused) return;
      const elapsed = Date.now() - this.trialStartTime + this.pausedElapsed;
      const pct = Math.max(0, 100 - (elapsed / windowMs) * 100);
      this.timerPercent.set(pct);
    }, 50);

    // Response window timeout
    this.trialTimeout = setTimeout(() => {
      if (this.responded()) return;
      this.responded.set(true);
      this.clearTrialTimer();

      let outcome: TrialOutcome;
      if (trial.stimulus.isNogo) {
        outcome = 'correct_nogo';
        this.feedback.set('correct');
      } else {
        outcome = 'missed_go';
        this.feedback.set('incorrect');
      }

      this.game.recordTrialResult({
        trialIndex: trial.index,
        outcome,
        responseTimeMs: null,
        isCongruent: trial.isCongruent,
        conflictTypes: trial.conflictTypes,
      });

      // Brief indication (300ms) then advance
      this.feedbackTimeout = setTimeout(() => {
        this.feedback.set(null);
        this.advanceTrial();
      }, 300);
    }, windowMs);
  }

  private advanceTrial(): void {
    const nextIndex = this.trialIndex() + 1;
    if (nextIndex >= this.trials().length) {
      this.game.endRound();
      return;
    }
    this.trialIndex.set(nextIndex);
    this.startTrial();
  }

  private clearTrialTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.trialTimeout) { clearTimeout(this.trialTimeout); this.trialTimeout = null; }
  }

  private clearAllTimers(): void {
    this.clearTrialTimer();
    if (this.feedbackTimeout) { clearTimeout(this.feedbackTimeout); this.feedbackTimeout = null; }
    if (this.ruleSwitchTimeout) { clearTimeout(this.ruleSwitchTimeout); this.ruleSwitchTimeout = null; }
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.paused = true;
      this.pausedElapsed += Date.now() - this.trialStartTime;
      this.clearTrialTimer();
    } else {
      this.paused = false;
      this.trialStartTime = Date.now();
      // Restart the timer with remaining time
      const trial = this.currentTrial();
      if (trial && !this.responded()) {
        const remaining = trial.responseWindowMs - this.pausedElapsed;
        if (remaining <= 0) {
          // Time already expired while hidden
          this.responded.set(true);
          const outcome: TrialOutcome = trial.stimulus.isNogo ? 'correct_nogo' : 'missed_go';
          this.feedback.set(trial.stimulus.isNogo ? 'correct' : 'incorrect');
          this.game.recordTrialResult({
            trialIndex: trial.index,
            outcome,
            responseTimeMs: null,
            isCongruent: trial.isCongruent,
            conflictTypes: trial.conflictTypes,
          });
          this.feedbackTimeout = setTimeout(() => {
            this.feedback.set(null);
            this.advanceTrial();
          }, 300);
        } else {
          this.beginTrialTimer();
        }
      }
    }
  };
}
