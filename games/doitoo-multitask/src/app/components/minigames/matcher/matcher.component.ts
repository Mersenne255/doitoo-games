import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, effect, computed,
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
const BORDER_MAP: Record<string, string> = {
  white: '#e2e8f0', gold: '#fbbf24', cyan: '#06b6d4', magenta: '#d946ef',
};

const FIRST_CARD_DISPLAY_MS = 2000;

type ActiveProperty = keyof ShapeCard;

// ── Helpers ──
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomCard(): ShapeCard {
  return {
    shape: pickRandom(SHAPES),
    shapeColor: pickRandom(COLORS),
    borderColor: pickRandom(BORDERS),
    innerLetter: pickRandom(LETTERS),
  };
}

function activePropertiesForDifficulty(difficulty: number): ActiveProperty[] {
  const d = Math.max(1, Math.min(100, difficulty));
  if (d <= 33) return ['shape', 'shapeColor'];
  if (d <= 67) return ['shape', 'shapeColor', 'borderColor'];
  return ['shape', 'shapeColor', 'borderColor', 'innerLetter'];
}

function cardsShareAnyProperty(a: ShapeCard, b: ShapeCard, properties: ActiveProperty[]): boolean {
  return properties.some(prop => a[prop] === b[prop]);
}

function generateMatchingCard(reference: ShapeCard, properties: ActiveProperty[]): ShapeCard {
  const card = randomCard();
  const sharedProperty = pickRandom(properties);
  (card as any)[sharedProperty] = reference[sharedProperty];
  return card;
}

function generateDifferentCard(reference: ShapeCard, properties: ActiveProperty[]): ShapeCard {
  const card = randomCard();
  for (const property of properties) {
    const pool: any[] =
      property === 'shape' ? SHAPES :
      property === 'shapeColor' ? COLORS :
      property === 'borderColor' ? BORDERS : LETTERS;
    let value: any;
    do { value = pickRandom(pool); } while (value === reference[property]);
    (card as any)[property] = value;
  }
  return card;
}

/**
 * Animation phase for the card element:
 * - 'idle': card visible at center, no animation
 * - 'exit': card sliding out to the left
 * - 'enter': card sliding in from the right
 * - 'correctFlash': brief pulse before advancing to next card
 */
type CardAnimationPhase = 'idle' | 'exit' | 'enter' | 'correctFlash';

@Component({
  selector: 'app-matcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="game-area"
     [class.correct-flash]="flashState() === 'correct'"
     [class.incorrect-flash]="flashState() === 'incorrect' || isGameOver()">
  <div class="timer-bar">
    <div class="timer-fill"
         [style.width.%]="timerPercent()"
         [class.warning]="timerPercent() < 25"
         [class.correct]="flashState() === 'correct'">
    </div>
  </div>
  <div class="card-display">
    @if (isGameOver() && showComparison() && previousCard() && currentCard()) {
      <div class="comparison">
        <div class="compare-card">
          <span class="compare-label previous-label">Previous</span>
          <svg viewBox="0 0 80 80" class="compare-svg"><defs><linearGradient [attr.id]="'grad-prev-' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="gradientLight(previousCard()!)"/><stop offset="100%" [attr.stop-color]="gradientDark(previousCard()!)"/></linearGradient></defs>
          @switch (previousCard()!.shape) {
            @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="5"/> }
            @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="5"/> }
            @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="previousGradientUrl()" [attr.stroke]="borderStroke(previousCard()!)" stroke-width="4" stroke-linejoin="round"/> }
          }
          @if (showLetters()) { <text x="40" [attr.y]="previousCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{previousCard()!.innerLetter}}</text> }
          </svg></div>
        <div class="compare-card">
          <span class="compare-label current-label">Current</span>
          <svg viewBox="0 0 80 80" class="compare-svg"><defs><linearGradient [attr.id]="'grad-curr-' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="gradientLight(currentCard()!)"/><stop offset="100%" [attr.stop-color]="gradientDark(currentCard()!)"/></linearGradient></defs>
          @switch (currentCard()!.shape) {
            @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5"/> }
            @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5"/> }
            @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="currentGradientUrl()" [attr.stroke]="borderStroke(currentCard()!)" stroke-width="4" stroke-linejoin="round"/> }
          }
          @if (showLetters()) { <text x="40" [attr.y]="currentCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{currentCard()!.innerLetter}}</text> }
          </svg></div>
      </div>
    } @else if (displayedCard(); as card) {
      <div class="shape-card"
           [class.phase-idle]="animationPhase() === 'idle'"
           [class.phase-exit]="animationPhase() === 'exit'"
           [class.phase-enter]="animationPhase() === 'enter'"
           [class.phase-correct-flash]="animationPhase() === 'correctFlash'"
           (animationend)="onCardAnimationEnd($event)">
        <svg viewBox="0 0 80 80" class="shape-svg"><defs>
          <linearGradient [attr.id]="'grad-main-' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="gradientLight(card)"/><stop offset="100%" [attr.stop-color]="gradientDark(card)"/></linearGradient>
          <filter [attr.id]="'shadow-' + slotIndex()" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
        </defs>
        @switch (card.shape) {
          @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" [attr.filter]="shadowFilterUrl()"/> }
          @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" [attr.filter]="shadowFilterUrl()"/> }
          @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowFilterUrl()"/> }
          @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowFilterUrl()"/> }
          @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="5" stroke-linejoin="round" [attr.filter]="shadowFilterUrl()"/> }
          @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="mainGradientUrl()" [attr.stroke]="borderStroke(card)" stroke-width="4" stroke-linejoin="round" [attr.filter]="shadowFilterUrl()"/> }
        }
        @if (showLetters()) { <text x="40" [attr.y]="card.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{card.innerLetter}}</text> }
        </svg>
      </div>
    }
  </div>
  @if (!isGameOver()) {
    <div class="question-text">Does something match?</div>
    <div class="button-row" [class.disabled]="!canAnswer()">
      <button class="answer-button no-button" (touchstart)="onTouchAnswer($event, false)" (click)="onAnswer(false)">No</button>
      <button class="answer-button yes-button" (touchstart)="onTouchAnswer($event, true)" (click)="onAnswer(true)">Yes</button>
    </div>
  }
</div>`,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .game-area { display: flex; flex-direction: column; flex: 1; border-radius: .5rem; overflow: hidden; min-height: 0; max-height: 100%; transition: background .3s; }
    .game-area.correct-flash { background: rgba(34,197,94,.08); }
    .game-area.incorrect-flash { background: rgba(239,68,68,.1); }
    .timer-bar { height: 6px; width: 100%; background: rgba(255,255,255,.06); flex-shrink: 0; }
    .timer-fill { height: 100%; background: #6366f1; transition: width .1s linear; }
    .timer-fill.warning { background: #ef4444; }
    .timer-fill.correct { background: #22c55e; }
    .card-display { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; overflow: hidden; }
    .shape-card { display: flex; align-items: center; justify-content: center; }
    .shape-card.phase-idle { }
    .shape-card.phase-exit { animation: slideOut 250ms ease-in forwards; }
    .shape-card.phase-enter { animation: slideIn 250ms ease-out forwards; }
    .shape-card.phase-correct-flash { animation: correctFlash 500ms ease forwards; }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-120%); opacity: 0; } }
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes correctFlash { 0% { transform: scale(1); } 30% { transform: scale(1.05); } 100% { transform: scale(1); } }
    .shape-svg { width: min(180px, 55vmin); height: min(180px, 55vmin); }
    .comparison { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 0 8px; animation: fadeIn 350ms ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
    .compare-card { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .compare-label { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    .previous-label { color: #94a3b8; }
    .current-label { color: #f87171; }
    .compare-svg { width: min(110px, 35vmin); height: min(110px, 35vmin); }
    .question-text { font-size: clamp(.9rem, 3.5vmin, 1.3rem); color: #94a3b8; font-weight: 600; letter-spacing: .3px; text-align: center; padding: 6px 8px; flex-shrink: 0; }
    .button-row { display: grid; grid-template-columns: 1fr 1fr; width: 100%; flex-shrink: 0; }
    .button-row.disabled { opacity: .3; pointer-events: none; }
    .answer-button { border: none; border-top: 1px solid rgba(255,255,255,.08); font-size: clamp(1.2rem, 5vmin, 2.2rem); font-weight: 700; cursor: pointer; transition: all .12s; outline: none; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: .75rem 0; touch-action: manipulation; }
    .no-button { background: rgba(239,68,68,.12); color: #f87171; border-right: 1px solid rgba(255,255,255,.08); }
    .yes-button { background: rgba(34,197,94,.12); color: #4ade80; }
    .answer-button:hover { filter: brightness(1.2); }
    .answer-button:active { transform: scale(.95); }
  `],
})
export class MatcherComponent implements OnInit, OnDestroy {
  readonly config = input.required<MatcherConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();
  private readonly game = inject(GameService);

  // ── State signals ──
  readonly currentCard = signal<ShapeCard | null>(null);
  readonly previousCard = signal<ShapeCard | null>(null);
  readonly displayedCard = signal<ShapeCard | null>(null);
  readonly activeProperties = signal<ActiveProperty[]>(['shape', 'shapeColor']);
  readonly showLetters = computed(() => this.activeProperties().includes('innerLetter'));
  readonly flashState = signal<'correct' | 'incorrect' | null>(null);
  readonly isGameOver = signal(false);
  readonly showComparison = signal(false);
  readonly timerPercent = signal(100);
  readonly isWaitingForFirstCard = signal(true);
  readonly isAnswerLocked = signal(false);
  readonly animationPhase = signal<CardAnimationPhase>('idle');
  readonly canAnswer = computed(() =>
    !this.isGameOver() && !this.isAnswerLocked() &&
    !this.isWaitingForFirstCard() && this.animationPhase() === 'idle'
  );
  readonly correctCount = signal(0);
  readonly totalCount = signal(0);

  // ── Timer (interval only for progress bar) ──
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private countdownTotalMs = 0;
  private countdownElapsedMs = 0;
  private isFinished = false;
  private nextCardToDisplay: ShapeCard | null = null;

  // ── SVG URL helpers ──
  mainGradientUrl() { return `url(#grad-main-${this.slotIndex()})`; }
  previousGradientUrl() { return `url(#grad-prev-${this.slotIndex()})`; }
  currentGradientUrl() { return `url(#grad-curr-${this.slotIndex()})`; }
  shadowFilterUrl() { return `url(#shadow-${this.slotIndex()})`; }

  gradientDark(card: ShapeCard): string {
    return this.activeProperties().includes('shapeColor')
      ? (FILL_DARK[card.shapeColor] || '#4f46e5') : '#4f46e5';
  }
  gradientLight(card: ShapeCard): string {
    return this.activeProperties().includes('shapeColor')
      ? (FILL_LIGHT[card.shapeColor] || '#6366f1') : '#6366f1';
  }
  borderStroke(card: ShapeCard): string {
    return this.activeProperties().includes('borderColor')
      ? (BORDER_MAP[card.borderColor] || '#e2e8f0') : 'transparent';
  }

  // ── Lifecycle ──
  private readonly stageEffect = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.isFinished) { this.isFinished = true; this.stopCountdown(); }
    else if (stage === 'playing' && this.isFinished) { this.resetAllState(); this.showFirstCard(); }
  });

  ngOnInit(): void { this.showFirstCard(); }
  ngOnDestroy(): void { this.stopCountdown(); }

  // ── Game flow ──

  private showFirstCard(): void {
    this.isWaitingForFirstCard.set(true);
    this.activeProperties.set(activePropertiesForDifficulty(this.game.currentDifficulty()));
    const card = randomCard();
    this.currentCard.set(card);
    this.displayedCard.set(card);
    this.animationPhase.set('idle');
    this.startCountdown(FIRST_CARD_DISPLAY_MS, () => {
      this.isWaitingForFirstCard.set(false);
      this.beginCardTransition();
    });
  }

  private beginCardTransition(): void {
    const properties = activePropertiesForDifficulty(this.game.currentDifficulty());
    this.activeProperties.set(properties);
    const previous = this.currentCard()!;
    this.previousCard.set(previous);
    const shouldMatch = Math.random() < 0.5;
    const nextCard = shouldMatch
      ? generateMatchingCard(previous, properties)
      : generateDifferentCard(previous, properties);
    this.currentCard.set(nextCard);
    this.nextCardToDisplay = nextCard;
    this.isAnswerLocked.set(true);
    this.animationPhase.set('exit');
  }

  onCardAnimationEnd(_event: AnimationEvent): void {
    if (this.isFinished) return;
    const phase = this.animationPhase();
    if (phase === 'exit') {
      this.displayedCard.set(this.nextCardToDisplay);
      this.animationPhase.set('enter');
    } else if (phase === 'enter') {
      this.animationPhase.set('idle');
      this.isAnswerLocked.set(false);
      this.startCountdown(
        matcherTimeLimitForDifficulty(this.game.currentDifficulty()) * 1000,
        () => this.handleGameOver(),
      );
    } else if (phase === 'correctFlash') {
      this.flashState.set(null);
      this.beginCardTransition();
    }
  }

  // ── Countdown timer ──

  private startCountdown(durationMs: number, onExpired: () => void): void {
    this.stopCountdown();
    this.countdownTotalMs = durationMs;
    this.countdownElapsedMs = 0;
    this.timerPercent.set(100);
    this.countdownInterval = setInterval(() => {
      this.countdownElapsedMs += 50;
      const percent = Math.max(0, 100 - (this.countdownElapsedMs / this.countdownTotalMs) * 100);
      this.timerPercent.set(percent);
      if (this.countdownElapsedMs >= this.countdownTotalMs) {
        this.stopCountdown();
        onExpired();
      }
    }, 50);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  }

  // ── User input ──

  onTouchAnswer(event: TouchEvent, isYes: boolean): void {
    event.preventDefault();
    this.onAnswer(isYes);
  }

  onAnswer(isYes: boolean): void {
    if (!this.canAnswer()) return;
    this.isAnswerLocked.set(true);
    const previous = this.previousCard();
    const current = this.currentCard();
    if (!previous || !current) return;
    this.totalCount.update(n => n + 1);
    const isMatch = cardsShareAnyProperty(current, previous, this.activeProperties());
    if (isYes === isMatch) {
      this.correctCount.update(n => n + 1);
      this.flashState.set('correct');
      this.stopCountdown();
      this.animationPhase.set('correctFlash');
    } else {
      this.handleGameOver();
    }
  }

  // ── Game over ──

  private handleGameOver(): void {
    if (this.isFinished) return;
    this.isFinished = true;
    this.isGameOver.set(true);
    this.flashState.set('incorrect');
    this.isAnswerLocked.set(true);
    this.stopCountdown();
    this.animationPhase.set('idle');
    this.displayedCard.set(this.currentCard());
    if (this.previousCard()) this.showComparison.set(true);
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

  // ── Reset ──

  private resetAllState(): void {
    this.stopCountdown();
    this.isFinished = false;
    this.isGameOver.set(false);
    this.flashState.set(null);
    this.showComparison.set(false);
    this.isAnswerLocked.set(false);
    this.isWaitingForFirstCard.set(true);
    this.animationPhase.set('idle');
    this.currentCard.set(null);
    this.previousCard.set(null);
    this.displayedCard.set(null);
    this.nextCardToDisplay = null;
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.timerPercent.set(100);
  }
}
