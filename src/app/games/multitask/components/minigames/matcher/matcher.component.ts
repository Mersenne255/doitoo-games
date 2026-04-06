import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, effect, computed, ElementRef, viewChild, HostListener,
} from '@angular/core';
import {
  MatcherConfig, MinigameResult, ShapeCard, Shape, ShapeColor,
  BorderColor, InnerLetter, matcherTimeLimitForDifficulty,
} from '../../../models/game.models';
import { GameService } from '../../../services/game.service';

// ── Constants ──
const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
const COLORS: ShapeColor[] = ['red', 'blue', 'green', 'charcoal'];
const BORDERS: BorderColor[] = ['white', 'gold', 'cyan', 'magenta'];
const LETTERS: InnerLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];

const FILL_DARK: Record<string, string> = {
  red: '#dc2626', blue: '#2563eb', green: '#16a34a', charcoal: '#374151',
};
const FILL_LIGHT: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', charcoal: '#4b5563',
};
const BORDER_COLORS: Record<string, string> = {
  white: '#e2e8f0', gold: '#fbbf24', cyan: '#06b6d4', magenta: '#d946ef',
};

const FIRST_CARD_DISPLAY_MS = 2000;

/** Hotkey pairs [no, yes] indexed by visual slot position */
const SLOT_HOTKEYS: [string, string][] = [['z', 'x'], ['c', 'v'], ['b', 'n']];

type ActiveProperty = keyof ShapeCard;

// ── Helpers ──
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCard(): ShapeCard {
  return {
    shape: pick(SHAPES),
    shapeColor: pick(COLORS),
    borderColor: pick(BORDERS),
    innerLetter: pick(LETTERS),
  };
}


function activePropertiesForDifficulty(difficulty: number): ActiveProperty[] {
  const d = Math.max(1, Math.min(100, difficulty));
  if (d <= 33) return ['shape', 'shapeColor'];
  if (d <= 67) return ['shape', 'shapeColor', 'borderColor'];
  return ['shape', 'shapeColor', 'borderColor', 'innerLetter'];
}

function cardsShareProperty(a: ShapeCard, b: ShapeCard, props: ActiveProperty[]): boolean {
  return props.some(p => a[p] === b[p]);
}

function generateMatchingCard(ref: ShapeCard, props: ActiveProperty[]): ShapeCard {
  const card = randomCard();
  const sharedProp = pick(props);
  (card as any)[sharedProp] = ref[sharedProp];
  return card;
}

function generateDifferentCard(ref: ShapeCard, props: ActiveProperty[]): ShapeCard {
  const card = randomCard();
  for (const prop of props) {
    const pool: any[] =
      prop === 'shape' ? SHAPES :
      prop === 'shapeColor' ? COLORS :
      prop === 'borderColor' ? BORDERS : LETTERS;
    let value: any;
    do { value = pick(pool); } while (value === ref[prop]);
    (card as any)[prop] = value;
  }
  return card;
}

@Component({
  selector: 'app-matcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="game-area"
     [class.correct-flash]="flashState() === 'correct'"
     [class.incorrect-flash]="flashState() === 'incorrect' || isGameOver()">

  <!-- Timer bar -->
  <div class="timer-bar">
    <div class="timer-fill"
         [style.width.%]="timerPercent()"
         [class.warning]="timerPercent() < 25"
         [class.correct]="flashState() === 'correct'">
    </div>
  </div>

  <!-- Score counter -->
  <div class="score-badge">{{ correctCount() }}</div>

  <!-- Card display area -->
  <div class="card-display">
    @if (isGameOver() && showComparison() && previousCard() && currentCard()) {
      <!-- Game over: show both cards side by side -->
      <div class="comparison">
        <div class="compare-card">
          <span class="compare-label previous-label">Previous</span>
          <svg viewBox="0 0 80 80" class="compare-svg">
            <defs>
              <linearGradient [attr.id]="'grad-prev-' + slotIndex()" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="fillLight(previousCard()!, true)"/>
                <stop offset="100%" [attr.stop-color]="fillDark(previousCard()!, true)"/>
              </linearGradient>
            </defs>
            @switch (previousCard()!.shape) {
              @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="5"/> }
              @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="5"/> }
              @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="prevGradUrl()" [attr.stroke]="borderStroke(previousCard()!, true)" stroke-width="4" stroke-linejoin="round"/> }
            }
            @if (showPreviousLetters()) {
              <text x="40" [attr.y]="previousCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{ previousCard()!.innerLetter }}</text>
            }
          </svg>
        </div>
        <div class="compare-card">
          <span class="compare-label current-label">Current</span>
          <svg viewBox="0 0 80 80" class="compare-svg">
            <defs>
              <linearGradient [attr.id]="'grad-curr-' + slotIndex()" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" [attr.stop-color]="fillLight(currentCard()!)"/>
                <stop offset="100%" [attr.stop-color]="fillDark(currentCard()!)"/>
              </linearGradient>
            </defs>
            @switch (currentCard()!.shape) {
              @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5"/> }
              @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5"/> }
              @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
              @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="currGradUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="4" stroke-linejoin="round"/> }
            }
            @if (showLetters()) {
              <text x="40" [attr.y]="currentCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{ currentCard()!.innerLetter }}</text>
            }
          </svg>
        </div>
      </div>
    } @else if (displayCard(); as card) {
      <!-- Single card view — keyed to restart animation on each new card -->
      @for (k of [cardKey()]; track k) {
      <div class="single-card">
        <svg viewBox="0 0 80 80" class="card-svg">
          <defs>
            <linearGradient [attr.id]="'grad-main-' + slotIndex()" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="fillLight(card)"/>
              <stop offset="100%" [attr.stop-color]="fillDark(card)"/>
            </linearGradient>
            <filter [attr.id]="'shadow-' + slotIndex()" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          @switch (card.shape) {
            @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" [attr.filter]="shadowUrl()"/> }
            @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" [attr.filter]="shadowUrl()"/> }
            @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowUrl()"/> }
            @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowUrl()"/> }
            @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowUrl()"/> }
            @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="mainGradUrl()" [attr.stroke]="borderStroke(card)" stroke-width="4" stroke-linejoin="round" [attr.filter]="shadowUrl()"/> }
          }
          @if (showLetters()) {
            <text x="40" [attr.y]="card.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{ card.innerLetter }}</text>
          }
        </svg>
      </div>
      }
    }
  </div>

  <!-- Bottom: question + buttons -->
  @if (!isGameOver()) {
    <div class="question-text">Does something match?</div>
    <div class="button-row" [class.disabled]="!canAnswer()">
      <button class="answer-btn no-btn" (touchstart)="onTouch($event, false)" (click)="onAnswer(false)"><span>No</span> @if (hotkeys(); as hk) { <span class="hotkey">{{ hk[0] }}</span> }</button>
      <button class="answer-btn yes-btn" (touchstart)="onTouch($event, true)" (click)="onAnswer(true)"><span>Yes</span> @if (hotkeys(); as hk) { <span class="hotkey">{{ hk[1] }}</span> }</button>
    </div>
  }
</div>`,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    .game-area {
      display: flex; flex-direction: column; flex: 1;
      border-radius: .5rem; overflow: hidden;
      min-height: 0; max-height: 100%;
      transition: background .3s;
      position: relative;
    }
    .game-area.correct-flash { background: rgba(34, 197, 94, .08); }
    .game-area.incorrect-flash { background: rgba(239, 68, 68, .1); }

    .timer-bar { height: 6px; width: 100%; background: rgba(255,255,255,.06); flex-shrink: 0; }
    .timer-fill { height: 100%; background: #6366f1; transition: width .1s linear; }
    .timer-fill.warning { background: #ef4444; }
    .timer-fill.correct { background: #22c55e; }

    .score-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 1.1rem;
      font-weight: 800;
      color: #e2e8f0;
      z-index: 1;
    }

    .card-display {
      display: flex; align-items: center; justify-content: center;
      flex: 1; min-height: 0; overflow: hidden;
    }

    /* Single card — always in normal flow, never absolute */
    .single-card {
      display: flex; align-items: center; justify-content: center;
      animation: slideIn 250ms ease-out both;
    }
    @keyframes slideIn {
      from { transform: translateX(60px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .card-svg { width: min(180px, 55vmin); height: min(180px, 55vmin); }

    /* Comparison view */
    .comparison {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; width: 100%; padding: 0 8px;
      animation: fadeIn 350ms ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
    .compare-card { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .compare-label { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    .previous-label { color: #94a3b8; }
    .current-label { color: #f87171; }
    .compare-svg { width: min(110px, 35vmin); height: min(110px, 35vmin); }

    /* Bottom */
    .question-text {
      font-size: clamp(.9rem, 3.5vmin, 1.3rem); color: #94a3b8; font-weight: 600;
      letter-spacing: .3px; text-align: center; padding: 6px 8px; flex-shrink: 0;
    }
    .button-row {
      display: grid; grid-template-columns: 1fr 1fr;
      width: 100%; flex-shrink: 0;
    }
    .button-row.disabled { opacity: .3; pointer-events: none; }
    .answer-btn {
      border: none; border-top: 1px solid rgba(255,255,255,.08);
      font-size: clamp(1.2rem, 5vmin, 2.2rem); font-weight: 700;
      cursor: pointer; transition: all .12s; outline: none;
      font-family: 'Inter', system-ui, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: .75rem 0; touch-action: manipulation;
    }
    .no-btn {
      background: rgba(239,68,68,.12); color: #f87171;
      border-right: 1px solid rgba(255,255,255,.08);
    }
    .yes-btn { background: rgba(34,197,94,.12); color: #4ade80; }
    .answer-btn:hover { filter: brightness(1.2); }
    .answer-btn:active { transform: scale(.95); }

    .hotkey {
      font-size: 0.45em;
      opacity: 0.35;
      text-transform: uppercase;
      font-weight: 500;
      line-height: 1;
    }
  `],
})
export class MatcherComponent implements OnInit, OnDestroy {
  // ── Inputs / Outputs ──
  readonly config = input.required<MatcherConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  private readonly game = inject(GameService);

  /** Visual position of this slot among active slots (0-based) */
  readonly visualPosition = computed(() => {
    const activeSlots = this.game.activeSlots();
    return activeSlots.findIndex(s => s.index === this.slotIndex());
  });

  /** Hotkey pair [no, yes] for this slot */
  readonly hotkeys = computed(() => {
    const pos = this.visualPosition();
    return pos >= 0 && pos < SLOT_HOTKEYS.length ? SLOT_HOTKEYS[pos] : null;
  });

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const keys = this.hotkeys();
    if (!keys || this.game.stage() !== 'playing') return;
    const key = event.key.toLowerCase();
    if (key === keys[0]) this.onAnswer(false);
    else if (key === keys[1]) this.onAnswer(true);
  }

  // ── Game state signals ──
  readonly currentCard = signal<ShapeCard | null>(null);
  readonly previousCard = signal<ShapeCard | null>(null);
  readonly displayCard = signal<ShapeCard | null>(null);
  readonly activeProperties = signal<ActiveProperty[]>(['shape', 'shapeColor']);
  /** Properties that were active when the previous card was generated (for correct comparison) */
  readonly previousActiveProperties = signal<ActiveProperty[]>(['shape', 'shapeColor']);
  readonly showLetters = computed(() => this.activeProperties().includes('innerLetter'));
  /** Whether the previous card had letters visible (derived from previousActiveProperties) */
  readonly showPreviousLetters = computed(() => this.previousActiveProperties().includes('innerLetter'));

  readonly flashState = signal<'correct' | 'incorrect' | null>(null);
  readonly isGameOver = signal(false);
  readonly showComparison = signal(false);
  readonly timerPercent = signal(100);
  readonly isWaitingForFirstCard = signal(true);
  readonly isAnswerLocked = signal(false);

  readonly canAnswer = computed(() =>
    !this.isGameOver() && !this.isAnswerLocked() && !this.isWaitingForFirstCard()
  );

  readonly correctCount = signal(0);
  readonly totalCount = signal(0);
  readonly cardKey = signal(0);

  // ── Timer state ──
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private correctPauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private timerTotalMs = 0;
  private timerElapsedMs = 0;
  private finished = false;

  // ── SVG helpers ──
  mainGradUrl() { return `url(#grad-main-${this.slotIndex()})`; }
  prevGradUrl() { return `url(#grad-prev-${this.slotIndex()})`; }
  currGradUrl() { return `url(#grad-curr-${this.slotIndex()})`; }
  shadowUrl() { return `url(#shadow-${this.slotIndex()})`; }

  fillDark(card: ShapeCard, usePreviousProps = false): string {
    const props = usePreviousProps ? this.previousActiveProperties() : this.activeProperties();
    return props.includes('shapeColor')
      ? (FILL_DARK[card.shapeColor] || '#4f46e5') : '#4f46e5';
  }
  fillLight(card: ShapeCard, usePreviousProps = false): string {
    const props = usePreviousProps ? this.previousActiveProperties() : this.activeProperties();
    return props.includes('shapeColor')
      ? (FILL_LIGHT[card.shapeColor] || '#6366f1') : '#6366f1';
  }
  borderStroke(card: ShapeCard, usePreviousProps = false): string {
    const props = usePreviousProps ? this.previousActiveProperties() : this.activeProperties();
    return props.includes('borderColor')
      ? (BORDER_COLORS[card.borderColor] || '#e2e8f0') : 'transparent';
  }

  // ── Lifecycle ──
  private stageEffect = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.finished) {
      this.finished = true;
      this.clearTimers();
    } else if (stage === 'playing' && this.finished) {
      this.resetState();
      this.showFirstCard();
    }
  });

  ngOnInit(): void { this.showFirstCard(); }
  ngOnDestroy(): void { this.clearTimers(); }

  // ── Game flow ──

  private showFirstCard(): void {
    this.isWaitingForFirstCard.set(true);
    this.activeProperties.set(activePropertiesForDifficulty(this.game.currentDifficulty()));

    const firstCard = randomCard();
    this.currentCard.set(firstCard);
    this.displayCard.set(firstCard);

    this.startCountdown(FIRST_CARD_DISPLAY_MS, () => {
      this.isWaitingForFirstCard.set(false);
      this.advanceToNextCard();
    });
  }

  private advanceToNextCard(): void {
    const difficulty = this.game.currentDifficulty();
    const newProps = activePropertiesForDifficulty(difficulty);

    // Save the properties that were active for the outgoing card
    this.previousActiveProperties.set([...this.activeProperties()]);
    this.activeProperties.set(newProps);

    const previousCard = this.currentCard()!;
    this.previousCard.set(previousCard);

    // Use only properties that are active in BOTH the old and new sets
    // so we don't compare properties the player couldn't see on the previous card
    const compareProps = newProps.filter(p => this.previousActiveProperties().includes(p));

    const shouldMatch = Math.random() < 0.5;
    const nextCard = shouldMatch
      ? generateMatchingCard(previousCard, compareProps)
      : generateDifferentCard(previousCard, compareProps);

    this.currentCard.set(nextCard);
    this.displayCard.set(nextCard);
    this.cardKey.update(k => k + 1);
    this.isAnswerLocked.set(false);

    const timeLimitMs = matcherTimeLimitForDifficulty(difficulty) * 1000;
    this.startCountdown(timeLimitMs, () => this.handleGameOver());
  }

  private startCountdown(durationMs: number, onExpired: () => void): void {
    this.clearTimers();
    this.timerTotalMs = durationMs;
    this.timerElapsedMs = 0;
    this.timerPercent.set(100);

    this.timerInterval = setInterval(() => {
      this.timerElapsedMs += 50;
      const pct = Math.max(0, 100 - (this.timerElapsedMs / this.timerTotalMs) * 100);
      this.timerPercent.set(pct);
      if (this.timerElapsedMs >= this.timerTotalMs) {
        this.clearTimers();
        onExpired();
      }
    }, 50);
  }

  // ── User input ──

  onTouch(event: TouchEvent, isYes: boolean): void {
    event.preventDefault();
    this.onAnswer(isYes);
  }

  onAnswer(isYes: boolean): void {
    if (!this.canAnswer()) return;
    this.isAnswerLocked.set(true);

    const previous = this.previousCard();
    const current = this.currentCard();
    if (!previous || !current) return;

    const isMatch = cardsShareProperty(current, previous,
      this.activeProperties().filter(p => this.previousActiveProperties().includes(p)));
    const isCorrect = isYes === isMatch;

    this.totalCount.update((n: number) => n + 1);

    if (isCorrect) {
      this.correctCount.update((n: number) => n + 1);
      this.flashState.set('correct');
      this.clearTimers();

      // Brief flash then advance immediately — player can answer the next card right away
      this.advanceToNextCard();
      setTimeout(() => this.flashState.set(null), 200);
    } else {
      this.handleGameOver();
    }
  }

  // ── Game over ──

  private handleGameOver(): void {
    if (this.finished) return;
    this.finished = true;
    this.isGameOver.set(true);
    this.flashState.set('incorrect');
    this.isAnswerLocked.set(true);
    this.clearTimers();

    this.displayCard.set(this.currentCard());

    if (this.previousCard()) {
      this.showComparison.set(true);
    }

    this.completed.emit({
      slotIndex: this.slotIndex(),
      score: this.correctCount(),
      total: this.totalCount(),
      maxDifficulty: this.game.currentDifficulty(),
      details: {
        correct: this.correctCount(),
        incorrect: this.totalCount() - this.correctCount(),
        timedOut: 0,
      },
    });
  }

  // ── Cleanup ──

  private clearTimers(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    if (this.correctPauseTimeout) { clearTimeout(this.correctPauseTimeout); this.correctPauseTimeout = null; }
  }

  private resetState(): void {
    this.clearTimers();
    this.finished = false;
    this.isGameOver.set(false);
    this.flashState.set(null);
    this.showComparison.set(false);
    this.isAnswerLocked.set(false);
    this.isWaitingForFirstCard.set(true);
    this.currentCard.set(null);
    this.previousCard.set(null);
    this.displayCard.set(null);
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.timerPercent.set(100);
  }
}
