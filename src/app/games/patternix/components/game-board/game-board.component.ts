import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { generatePuzzle, shuffleAnswers } from '../../utils/puzzle-generator.util';
import { getShapeSvgData, ShapeSvgData } from '../../utils/element-renderer.util';
import { explainRules } from '../../utils/rule-explanation.util';
import { Puzzle, AnswerOption, PatternElement } from '../../models/game.models';

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <button class="abort-btn" (click)="game.abortSession()" title="Abort (Esc)">✕</button>

      <div class="progress">{{ game.currentPuzzleIndex() + 1 }} / {{ game.config().puzzleCount }}</div>

      @if (game.config().timedMode) {
        <div class="timer-bar-container">
          <div class="timer-bar" [style.width.%]="timerPercent()"></div>
        </div>
        <div class="timer-text">{{ timeRemaining() }}s</div>
      }

      <div class="sequence-row">
        @for (el of currentPuzzle()?.sequence ?? []; track $index) {
          <div class="seq-cell">
            <svg [attr.viewBox]="getSvg(el).viewBox"
                 [attr.width]="getSvg(el).size + 8"
                 [attr.height]="getSvg(el).size + 8">
              <defs>
                @if (getSvg(el).fillStyle.patternId; as pid) {
                  @if (getSvg(el).fillStyle.fill.includes('stripes')) {
                    <pattern [attr.id]="pid" width="6" height="6" patternUnits="userSpaceOnUse"
                             [attr.patternTransform]="'rotate(45)'">
                      <line x1="0" y1="0" x2="0" y2="6"
                            [attr.stroke]="getSvg(el).color" stroke-width="2" />
                    </pattern>
                  }
                  @if (getSvg(el).fillStyle.fill.includes('dots')) {
                    <pattern [attr.id]="pid" width="8" height="8" patternUnits="userSpaceOnUse">
                      <circle cx="4" cy="4" r="1.5" [attr.fill]="getSvg(el).color" />
                    </pattern>
                  }
                }
              </defs>
              <g [attr.transform]="'rotate(' + el.rotation + ')'">
                <path [attr.d]="getSvg(el).path"
                      [attr.fill]="getSvg(el).fillStyle.fill"
                      [attr.stroke]="getSvg(el).fillStyle.stroke ?? 'none'"
                      stroke-width="2" />
              </g>
            </svg>
          </div>
        }
        <div class="seq-cell placeholder">
          <span class="question-mark">?</span>
        </div>
      </div>

      <div class="answers-row">
        @for (opt of answerOptions(); track $index) {
          <button class="answer-card"
                  [class.correct]="showFeedback() && opt.isCorrect"
                  [class.incorrect]="showFeedback() && selectedIndex() === $index && !opt.isCorrect"
                  [class.selected]="selectedIndex() === $index"
                  (click)="selectAnswer($index, opt)"
                  [attr.aria-label]="'Answer option ' + ($index + 1)">
            <svg [attr.viewBox]="getSvg(opt.element).viewBox"
                 [attr.width]="getSvg(opt.element).size + 8"
                 [attr.height]="getSvg(opt.element).size + 8">
              <defs>
                @if (getSvg(opt.element).fillStyle.patternId; as pid) {
                  @if (getSvg(opt.element).fillStyle.fill.includes('stripes')) {
                    <pattern [attr.id]="'ans-' + $index + '-' + pid" width="6" height="6"
                             patternUnits="userSpaceOnUse" [attr.patternTransform]="'rotate(45)'">
                      <line x1="0" y1="0" x2="0" y2="6"
                            [attr.stroke]="getSvg(opt.element).color" stroke-width="2" />
                    </pattern>
                  }
                  @if (getSvg(opt.element).fillStyle.fill.includes('dots')) {
                    <pattern [attr.id]="'ans-' + $index + '-' + pid" width="8" height="8"
                             patternUnits="userSpaceOnUse">
                      <circle cx="4" cy="4" r="1.5" [attr.fill]="getSvg(opt.element).color" />
                    </pattern>
                  }
                }
              </defs>
              <g [attr.transform]="'rotate(' + opt.element.rotation + ')'">
                <path [attr.d]="getSvg(opt.element).path"
                      [attr.fill]="getAnswerFill(opt.element, $index)"
                      [attr.stroke]="getSvg(opt.element).fillStyle.stroke ?? 'none'"
                      stroke-width="2" />
              </g>
            </svg>
          </button>
        }
      </div>

      @if (showFeedback() && !wasCorrect() && ruleExplanation().length > 0) {
        <div class="explanation">
          <span class="explanation-title">The pattern:</span>
          @for (line of ruleExplanation(); track $index) {
            <span class="explanation-rule">{{ line }}</span>
          }
          <button class="next-btn" (click)="onNext()">Next →</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100%;
      padding-top: 1rem;
    }

    .board {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
      max-width: 600px;
      padding: 0 1rem 1.5rem;
      position: relative;
    }

    .abort-btn {
      position: absolute;
      top: 0;
      right: 0.5rem;
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
      transition: background 0.2s;
    }
    .abort-btn:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    .progress {
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .timer-bar-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .timer-bar {
      height: 100%;
      background: #6366f1;
      border-radius: 3px;
      transition: width 0.25s linear;
    }
    .timer-text {
      font-size: 0.75rem;
      color: #a5b4fc;
      font-weight: 600;
    }

    .sequence-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      width: 100%;
    }

    .seq-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
      min-height: 50px;
    }

    .placeholder {
      border: 2px dashed rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem;
      width: 56px;
      height: 56px;
    }

    .question-mark {
      font-size: 1.5rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.3);
    }

    .answers-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }

    .answer-card {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
    }
    .answer-card:hover:not(.correct):not(.incorrect) {
      border-color: rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.1);
      transform: translateY(-2px);
    }
    .answer-card.correct {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.15);
    }
    .answer-card.incorrect {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .explanation {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.75rem 1rem;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 0.75rem;
      width: 100%;
      animation: fadeIn 0.3s ease-out;
    }

    .explanation-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #a5b4fc;
    }

    .explanation-rule {
      font-size: 0.85rem;
      color: #e2e8f0;
      font-weight: 500;
    }

    .next-btn {
      margin-top: 0.5rem;
      padding: 0.5rem 1.5rem;
      border: 1px solid rgba(99, 102, 241, 0.5);
      border-radius: 0.5rem;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .next-btn:hover {
      background: rgba(99, 102, 241, 0.35);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class GameBoardComponent implements OnInit, OnDestroy {
  readonly game = inject(GameService);

  // ── Local signals ──
  readonly currentPuzzle = signal<Puzzle | null>(null);
  readonly answerOptions = signal<AnswerOption[]>([]);
  readonly selectedIndex = signal<number | null>(null);
  readonly showFeedback = signal(false);
  readonly timeRemaining = signal(0);
  readonly ruleExplanation = signal<string[]>([]);
  readonly wasCorrect = signal(false);

  readonly timerPercent = computed(() => {
    const limit = this.game.config().timeLimitSec;
    return limit > 0 ? (this.timeRemaining() / limit) * 100 : 0;
  });

  private puzzleStartTime = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private timerPausedAt: number | null = null;

  // SVG data cache to avoid recomputing in template
  private svgCache = new Map<PatternElement, ShapeSvgData>();

  ngOnInit(): void {
    this.loadPuzzle();
    this.setupVisibilityHandler();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // ── SVG helpers ──

  getSvg(el: PatternElement): ShapeSvgData {
    let cached = this.svgCache.get(el);
    if (!cached) {
      cached = getShapeSvgData(el);
      this.svgCache.set(el, cached);
    }
    return cached;
  }

  /** For answer cards, remap fill URL to use per-card pattern IDs to avoid SVG id collisions. */
  getAnswerFill(el: PatternElement, index: number): string {
    const svg = this.getSvg(el);
    if (svg.fillStyle.patternId) {
      return `url(#ans-${index}-${svg.fillStyle.patternId})`;
    }
    return svg.fillStyle.fill;
  }

  // ── Puzzle loading ──

  private loadPuzzle(): void {
    const config = this.game.config();
    const puzzleIndex = this.game.currentPuzzleIndex();

    if (puzzleIndex >= config.puzzleCount) {
      this.game.endRound();
      return;
    }

    const seed = Date.now() + puzzleIndex;
    const puzzle = generatePuzzle(config.difficulty, seed);
    const options = shuffleAnswers(puzzle, seed + 1);

    this.currentPuzzle.set(puzzle);
    this.answerOptions.set(options);
    this.selectedIndex.set(null);
    this.showFeedback.set(false);
    this.wasCorrect.set(false);
    this.ruleExplanation.set([]);
    this.svgCache = new Map();
    this.puzzleStartTime = performance.now();

    if (config.timedMode) {
      this.startTimer(config.timeLimitSec);
    }
  }

  // ── Answer selection ──

  selectAnswer(index: number, option: AnswerOption): void {
    if (this.showFeedback()) return; // prevent double-tap

    const responseTimeMs = performance.now() - this.puzzleStartTime;
    this.selectedIndex.set(index);
    this.showFeedback.set(true);
    this.wasCorrect.set(option.isCorrect);
    this.stopTimer();

    const outcome = option.isCorrect ? 'correct' : 'incorrect';
    this.game.recordAnswer(outcome, responseTimeMs);

    if (!option.isCorrect) {
      const puzzle = this.currentPuzzle();
      this.ruleExplanation.set(puzzle ? explainRules(puzzle.rules) : []);
      // Wait for user to click Next — no auto-advance
    } else {
      this.ruleExplanation.set([]);
      this.feedbackTimeout = setTimeout(() => {
        this.advancePuzzle();
      }, 1000);
    }
  }

  // ── Manual advance (incorrect/unanswered) ──

  onNext(): void {
    this.advancePuzzle();
  }

  // ── Timer ──

  private startTimer(seconds: number): void {
    this.stopTimer();
    this.timeRemaining.set(seconds);
    this.timerPausedAt = null;

    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining();
      if (remaining <= 1) {
        this.onTimerExpired();
      } else {
        this.timeRemaining.set(remaining - 1);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private onTimerExpired(): void {
    this.stopTimer();
    if (this.showFeedback()) return; // already answered

    this.showFeedback.set(true);
    this.wasCorrect.set(false);
    this.timeRemaining.set(0);
    this.game.recordAnswer('unanswered', null);

    const puzzle = this.currentPuzzle();
    this.ruleExplanation.set(puzzle ? explainRules(puzzle.rules) : []);
    // Wait for user to click Next — no auto-advance
  }

  // ── Visibility handling (pause timer when tab hidden) ──

  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (!this.game.config().timedMode || this.showFeedback()) return;

      if (document.hidden) {
        // Pause: save remaining time and stop interval
        this.timerPausedAt = this.timeRemaining();
        this.stopTimer();
      } else if (this.timerPausedAt !== null) {
        // Resume: restart timer from where we left off
        this.startTimer(this.timerPausedAt);
        this.timerPausedAt = null;
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // ── Advance to next puzzle ──

  private advancePuzzle(): void {
    this.clearTimers();
    this.loadPuzzle();
  }

  private clearTimers(): void {
    this.stopTimer();
    if (this.feedbackTimeout !== null) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }
}
