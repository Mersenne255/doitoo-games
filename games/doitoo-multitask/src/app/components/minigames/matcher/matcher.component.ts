import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, effect, computed,
} from '@angular/core';
import {
  MatcherConfig, MinigameResult, ShapeCard, Shape, ShapeColor,
  BorderColor, InnerLetter, matcherTimeLimitForDifficulty,
} from '../../../models/game.models';
import { GameService } from '../../../services/game.service';

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
const COLORS: ShapeColor[] = ['red', 'blue', 'green', 'charcoal'];
const BORDERS: BorderColor[] = ['white', 'gold', 'cyan', 'magenta'];
const LETTERS: InnerLetter[] = ['A', 'B', 'C', 'D', 'E', 'F'];
const FD: Record<string, string> = { red: '#dc2626', blue: '#2563eb', green: '#16a34a', charcoal: '#374151' };
const FL: Record<string, string> = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', charcoal: '#4b5563' };
const BC: Record<string, string> = { white: '#e2e8f0', gold: '#fbbf24', cyan: '#06b6d4', magenta: '#d946ef' };
type AP = keyof ShapeCard;
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function rCard(): ShapeCard {
  return { shape: pick(SHAPES), shapeColor: pick(COLORS), borderColor: pick(BORDERS), innerLetter: pick(LETTERS) };
}
function apFor(d: number): AP[] {
  const v = Math.max(1, Math.min(100, d));
  if (v <= 33) return ['shape', 'shapeColor'];
  if (v <= 67) return ['shape', 'shapeColor', 'borderColor'];
  return ['shape', 'shapeColor', 'borderColor', 'innerLetter'];
}
function sharesAny(a: ShapeCard, b: ShapeCard, p: AP[]): boolean {
  return p.some(k => a[k] === b[k]);
}
function genMatch(ref: ShapeCard, p: AP[]): ShapeCard {
  const c = rCard(); const k = pick(p); (c as any)[k] = ref[k]; return c;
}
function genDiff(ref: ShapeCard, p: AP[]): ShapeCard {
  const c = rCard();
  for (const k of p) {
    const pool: any[] = k === 'shape' ? SHAPES : k === 'shapeColor' ? COLORS : k === 'borderColor' ? BORDERS : LETTERS;
    let v: any; do { v = pick(pool); } while (v === ref[k]); (c as any)[k] = v;
  }
  return c;
}
const FIRST_MS = 2000;

/**
 * Card phase for animation:
 * - 'idle': card visible at center, no animation
 * - 'exit': card sliding out to the left
 * - 'enter': card sliding in from the right
 * - 'flash': brief correct-answer flash before advancing
 */
type CardPhase = 'idle' | 'exit' | 'enter' | 'flash';

@Component({
  selector: 'app-matcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="ga" [class.ok]="flash() === 'correct'" [class.fail]="flash() === 'incorrect' || gameOver()">
  <div class="tb"><div class="tf" [style.width.%]="tp()" [class.w]="tp() < 25" [class.ok]="flash() === 'correct'"></div></div>
  <div class="ct">
    @if (gameOver() && showCmp() && prevCard() && curCard()) {
      <div class="cmp">
        <div class="cc"><span class="lb pl">Previous</span>
          <svg viewBox="0 0 80 80" class="ss"><defs><linearGradient [attr.id]="'gp' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="fli(prevCard()!)"/><stop offset="100%" [attr.stop-color]="fdk(prevCard()!)"/></linearGradient></defs>
          @switch (prevCard()!.shape) {
            @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="5"/> }
            @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="5"/> }
            @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="pgU()" [attr.stroke]="bdr(prevCard()!)" stroke-width="4" stroke-linejoin="round"/> }
          }
          @if (hasLetter()) { <text x="40" [attr.y]="prevCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{prevCard()!.innerLetter}}</text> }
          </svg></div>
        <div class="cc"><span class="lb cl">Current</span>
          <svg viewBox="0 0 80 80" class="ss"><defs><linearGradient [attr.id]="'gc' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="fli(curCard()!)"/><stop offset="100%" [attr.stop-color]="fdk(curCard()!)"/></linearGradient></defs>
          @switch (curCard()!.shape) {
            @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="5"/> }
            @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="5"/> }
            @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="5" stroke-linejoin="round"/> }
            @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="cgU()" [attr.stroke]="bdr(curCard()!)" stroke-width="4" stroke-linejoin="round"/> }
          }
          @if (hasLetter()) { <text x="40" [attr.y]="curCard()!.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{curCard()!.innerLetter}}</text> }
          </svg></div>
      </div>
    } @else if (displayCard(); as c) {
      <div class="card"
           [class.idle]="phase() === 'idle'"
           [class.exit]="phase() === 'exit'"
           [class.enter]="phase() === 'enter'"
           [class.flash-pause]="phase() === 'flash'"
           (animationend)="onAnimEnd($event)">
        <svg viewBox="0 0 80 80" class="sv"><defs>
          <linearGradient [attr.id]="'gm' + slotIndex()" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" [attr.stop-color]="fli(c)"/><stop offset="100%" [attr.stop-color]="fdk(c)"/></linearGradient>
          <filter [attr.id]="'fs' + slotIndex()" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
        </defs>
        @switch (c.shape) {
          @case ('circle')  { <circle cx="40" cy="40" r="26" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="5" [attr.filter]="fsU()"/> }
          @case ('square')  { <rect x="14" y="14" width="52" height="52" rx="4" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="5" [attr.filter]="fsU()"/> }
          @case ('triangle'){ <polygon points="40,8 70,66 10,66" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="5" stroke-linejoin="round" [attr.filter]="fsU()"/> }
          @case ('diamond') { <polygon points="40,8 72,40 40,72 8,40" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="5" stroke-linejoin="round" [attr.filter]="fsU()"/> }
          @case ('hexagon') { <polygon points="40,10 64,24 64,56 40,70 16,56 16,24" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="5" stroke-linejoin="round" [attr.filter]="fsU()"/> }
          @case ('star')    { <path d="M 61,72 40,67 18,72 17,50 5,32 26,24 40,7 54,24 74,32 62,50 Z" [attr.fill]="mgU()" [attr.stroke]="bdr(c)" stroke-width="4" stroke-linejoin="round" [attr.filter]="fsU()"/> }
        }
        @if (hasLetter()) { <text x="40" [attr.y]="c.shape==='triangle'?46:42" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" fill="rgba(255,255,255,.95)">{{c.innerLetter}}</text> }
        </svg>
      </div>
    }
  </div>
  @if (!gameOver()) {
    <div style="position: relative;">
      <div class="q" style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); white-space: nowrap;">Something match?</div>
      <div class="br" [class.dis]="!canAns()">
        <button class="ab no" (touchstart)="onT($event, false)" (click)="onAns(false)">No</button>
        <button class="ab yes" (touchstart)="onT($event, true)" (click)="onAns(true)">Yes</button>
      </div>
    </div>
  }
</div>`,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .ga { display: flex; flex-direction: column; flex: 1; border-radius: .5rem; overflow: hidden; min-height: 0; max-height: 100%; transition: background .3s; }
    .ga.ok { background: rgba(34,197,94,.08); }
    .ga.fail { background: rgba(239,68,68,.1); }
    .tb { height: 6px; width: 100%; background: rgba(255,255,255,.06); flex-shrink: 0; }
    .tf { height: 100%; background: #6366f1; transition: width .1s linear; }
    .tf.w { background: #ef4444; }
    .tf.ok { background: #22c55e; }
    .ct { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; overflow: hidden; }

    .card { display: flex; align-items: center; justify-content: center; height: 100%; }
    .card.idle { /* visible at center, no animation */ }
    .card.exit { animation: slideOut 250ms ease-in forwards; }
    .card.enter { animation: slideIn 250ms ease-out forwards; }
    .card.flash-pause { animation: flashPause 500ms ease forwards; }

    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to   { transform: translateX(-120%); opacity: 0; }
    }
    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    @keyframes flashPause {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .sv { width: calc(100% - 10px); height: calc(100% - 10px); }
    .cmp { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; padding: 0 8px; animation: cin 350ms ease-out; }
    @keyframes cin { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
    .cc { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .lb { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
    .pl { color: #94a3b8; }
    .cl { color: #f87171; }
    .ss { width: min(110px, 35vmin); height: min(110px, 35vmin); }
    .q { font-size: clamp(.9rem, 3.5vmin, 1.3rem); color: #94a3b8; font-weight: 600; letter-spacing: .3px; text-align: center; padding: 6px 8px; flex-shrink: 0; }
    .br { display: grid; grid-template-columns: 1fr 1fr; width: 100%; flex-shrink: 0; }
    .br.dis { opacity: .3; pointer-events: none; }
    .ab { border: none; border-top: 1px solid rgba(255,255,255,.08); font-size: clamp(1.2rem, 5vmin, 2.2rem); font-weight: 700; cursor: pointer; transition: all .12s; outline: none; font-family: 'Inter', system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: .75rem 0; touch-action: manipulation; }
    .ab.no { background: rgba(239,68,68,.12); color: #f87171; border-right: 1px solid rgba(255,255,255,.08); }
    .ab.yes { background: rgba(34,197,94,.12); color: #4ade80; }
    .ab:hover { filter: brightness(1.2); }
    .ab:active { transform: scale(.95); }
  `],
})
export class MatcherComponent implements OnInit, OnDestroy {
  readonly config = input.required<MatcherConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();
  private readonly game = inject(GameService);

  // Game state
  readonly curCard = signal<ShapeCard | null>(null);
  readonly prevCard = signal<ShapeCard | null>(null);
  readonly displayCard = signal<ShapeCard | null>(null);
  readonly props = signal<AP[]>(['shape', 'shapeColor']);
  readonly hasLetter = computed(() => this.props().includes('innerLetter'));
  readonly flash = signal<'correct' | 'incorrect' | null>(null);
  readonly gameOver = signal(false);
  readonly showCmp = signal(false);
  readonly tp = signal(100);
  readonly waiting = signal(true);
  readonly locked = signal(false);
  readonly phase = signal<CardPhase>('idle');
  readonly canAns = computed(() => !this.gameOver() && !this.locked() && !this.waiting() && this.phase() === 'idle');
  readonly correctCount = signal(0);
  readonly totalCount = signal(0);

  // Timer (interval only — needed for progress bar ticks)
  private timer: ReturnType<typeof setInterval> | null = null;
  private totalMs = 0;
  private elMs = 0;
  private done = false;
  private pendingCard: ShapeCard | null = null;

  // SVG helpers
  mgU() { return `url(#gm${this.slotIndex()})`; }
  pgU() { return `url(#gp${this.slotIndex()})`; }
  cgU() { return `url(#gc${this.slotIndex()})`; }
  fsU() { return `url(#fs${this.slotIndex()})`; }
  fdk(c: ShapeCard) { return this.props().includes('shapeColor') ? (FD[c.shapeColor] || '#4f46e5') : '#4f46e5'; }
  fli(c: ShapeCard) { return this.props().includes('shapeColor') ? (FL[c.shapeColor] || '#6366f1') : '#6366f1'; }
  bdr(c: ShapeCard) { return this.props().includes('borderColor') ? (BC[c.borderColor] || '#e2e8f0') : 'transparent'; }

  private stageEff = effect(() => {
    const s = this.game.stage();
    if (s === 'summary' && !this.done) { this.done = true; this.stopTimer(); }
    else if (s === 'playing' && this.done) { this.rst(); this.showFirst(); }
  });

  ngOnInit() { this.showFirst(); }
  ngOnDestroy() { this.stopTimer(); }

  /** Show first card for 2s, then advance via timer expiry */
  private showFirst(): void {
    this.waiting.set(true);
    this.props.set(apFor(this.game.currentDifficulty()));
    const card = rCard();
    this.curCard.set(card);
    this.displayCard.set(card);
    this.phase.set('idle');
    this.startTimer(FIRST_MS, () => {
      this.waiting.set(false);
      this.beginAdvance();
    });
  }

  /** Step 1 of advance: start exit animation (old card slides left) */
  private beginAdvance(): void {
    const p = apFor(this.game.currentDifficulty());
    this.props.set(p);
    const prev = this.curCard()!;
    this.prevCard.set(prev);
    const next = Math.random() < 0.5 ? genMatch(prev, p) : genDiff(prev, p);
    this.curCard.set(next);
    this.pendingCard = next;
    this.locked.set(true);
    // displayCard still shows old card — start exit animation
    this.phase.set('exit');
  }

  /** Called by (animationend) on the card element */
  onAnimEnd(event: AnimationEvent): void {
    if (this.done) return;
    const currentPhase = this.phase();

    if (currentPhase === 'exit') {
      // Exit done: swap to new card, start enter animation
      this.displayCard.set(this.pendingCard);
      this.phase.set('enter');
    } else if (currentPhase === 'enter') {
      // Enter done: card is visible, start countdown
      this.phase.set('idle');
      this.locked.set(false);
      this.startTimer(
        matcherTimeLimitForDifficulty(this.game.currentDifficulty()) * 1000,
        () => this.end()
      );
    } else if (currentPhase === 'flash') {
      // Flash done: advance to next card
      this.flash.set(null);
      this.beginAdvance();
    }
  }

  /** Start a countdown that updates the progress bar */
  private startTimer(ms: number, onExpired: () => void): void {
    this.stopTimer();
    this.totalMs = ms;
    this.elMs = 0;
    this.tp.set(100);
    this.timer = setInterval(() => {
      this.elMs += 50;
      this.tp.set(Math.max(0, 100 - this.elMs / this.totalMs * 100));
      if (this.elMs >= this.totalMs) { this.stopTimer(); onExpired(); }
    }, 50);
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  onT(e: TouchEvent, y: boolean) { e.preventDefault(); this.onAns(y); }

  onAns(y: boolean): void {
    if (!this.canAns()) return;
    this.locked.set(true);
    const prev = this.prevCard();
    const cur = this.curCard();
    if (!prev || !cur) return;
    this.totalCount.update(n => n + 1);
    if (y === sharesAny(cur, prev, this.props())) {
      this.correctCount.update(n => n + 1);
      this.flash.set('correct');
      this.stopTimer();
      // Start flash animation — onAnimEnd will trigger advance
      this.phase.set('flash');
    } else {
      this.end();
    }
  }

  private end(): void {
    if (this.done) return;
    this.done = true;
    this.gameOver.set(true);
    this.flash.set('incorrect');
    this.locked.set(true);
    this.stopTimer();
    this.phase.set('idle');
    this.displayCard.set(this.curCard());
    if (this.prevCard()) this.showCmp.set(true);
    this.completed.emit({
      slotIndex: this.slotIndex(),
      score: this.correctCount(),
      total: this.totalCount(),
      maxDifficulty: this.game.currentDifficulty(),
      details: { correct: this.correctCount(), incorrect: this.totalCount() - this.correctCount(), timedOut: 0 },
    });
  }

  private rst(): void {
    this.stopTimer();
    this.done = false;
    this.gameOver.set(false);
    this.flash.set(null);
    this.showCmp.set(false);
    this.locked.set(false);
    this.waiting.set(true);
    this.phase.set('idle');
    this.curCard.set(null);
    this.prevCard.set(null);
    this.displayCard.set(null);
    this.pendingCard = null;
    this.correctCount.set(0);
    this.totalCount.set(0);
    this.tp.set(100);
  }
}
