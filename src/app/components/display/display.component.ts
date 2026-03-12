import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ViewChild,
} from '@angular/core';
import { GameStage, GameMode, GameResult } from '../../models/game.models';

interface FeedbackDigit {
  char: string;
  expected: string;
  wrong: boolean;
}

const FONT_FAMILY = "'JetBrains Mono', 'Fira Code', monospace";
const FONT_WEIGHT = '600';
const LETTER_SPACING_EM = 0.12;
const REFERENCE_PX = 100; // measure at 100px for precision
const MAX_FONT_PX = 72;
const MIN_FONT_PX = 14;
const OVERLAY_MAX_PX = 96;

@Component({
  selector: 'app-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './display.component.html',
  styleUrl: './display.component.scss',
})
export class DisplayComponent implements AfterViewInit, OnDestroy {
  displayValue = input<string>('');
  inputValue = input<string>('');
  stage = input<GameStage>('idle');
  mode = input<GameMode>('sequence');
  result = input<GameResult | null>(null);
  numberLength = input<number>(8);

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLElement>;

  private containerWidth = signal(0);
  private digitWidthAtRef = 0; // width of one digit (incl. letter-spacing) at REFERENCE_PX
  private resizeObserver: ResizeObserver | null = null;

  constructor(private ngZone: NgZone) {}

  feedbackDigits = computed<FeedbackDigit[]>(() => {
    const r = this.result();
    if (!r || r.correct) return [];
    const expected = r.expected;
    const guess = r.guess;
    return [...guess].map((char, i) => ({
      char,
      expected: expected[i] ?? '',
      wrong: char !== expected[i],
    }));
  });


  showSequenceOverlay = computed(() =>
    this.mode() === 'sequence' && this.stage() === 'showing' && this.displayValue() !== ''
  );

  currentValue = computed(() => {
    const stage = this.stage();
    if (stage === 'showing') return this.displayValue();
    return this.inputValue();
  });

  /** Measured font size for the number lines */
  fontSize = computed(() => {
    const cw = this.containerWidth();
    if (!cw || !this.digitWidthAtRef) return `${MAX_FONT_PX}px`;
    return `${this.calcFontPx(this.numberLength(), cw)}px`;
  });

  /** Width that reserves space for all digits during guessing, so text can be left-aligned without layout shift */
  guessSlotWidth = computed(() => {
    const cw = this.containerWidth();
    if (!cw || !this.digitWidthAtRef) return 'auto';
    const fontPx = this.calcFontPx(this.numberLength(), cw);
    const digitW = this.digitWidthAtRef * (fontPx / REFERENCE_PX);
    return `${this.numberLength() * digitW}px`;
  });

  /** Measured font size for the sequence overlay (single number, can be bigger) */
  overlayFontSize = computed(() => {
    const cw = this.containerWidth();
    if (!cw || !this.digitWidthAtRef) return `${OVERLAY_MAX_PX}px`;
    // overlay shows one digit at a time, but cap it
    const px = Math.min(this.calcFontPx(1, cw), OVERLAY_MAX_PX);
    return `${px}px`;
  });

  ngAfterViewInit(): void {
    this.measureDigitWidth();
    this.observeResize();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /**
   * Render a probe span off-screen at REFERENCE_PX, measure one digit's advance width.
   * We measure "0" repeated 10 times and divide by 10 for sub-pixel accuracy.
   */
  private measureDigitWidth(): void {
    const probe = document.createElement('span');
    probe.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      visibility: hidden;
      white-space: nowrap;
      font-family: ${FONT_FAMILY};
      font-weight: ${FONT_WEIGHT};
      font-size: ${REFERENCE_PX}px;
      letter-spacing: ${LETTER_SPACING_EM}em;
    `;
    probe.textContent = '0000000000';
    document.body.appendChild(probe);
    this.digitWidthAtRef = probe.getBoundingClientRect().width / 10;
    document.body.removeChild(probe);
  }

  /** Watch the container element for size changes */
  private observeResize(): void {
    const el = this.containerRef.nativeElement;
    // read initial width
    this.containerWidth.set(el.clientWidth);

    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      this.ngZone.run(() => this.containerWidth.set(width));
    });
    this.resizeObserver.observe(el);
  }

  /** Calculate the font size in px that fits `digitCount` digits into `availableWidth` */
  private calcFontPx(digitCount: number, availableWidth: number): number {
    // digitWidthAtRef is the width of one digit at REFERENCE_PX
    // At font-size F, one digit width = digitWidthAtRef * (F / REFERENCE_PX)
    // Total width for N digits = N * digitWidthAtRef * (F / REFERENCE_PX)
    // Solve for F: F = availableWidth * REFERENCE_PX / (N * digitWidthAtRef)
    const idealPx = (availableWidth * REFERENCE_PX) / (digitCount * this.digitWidthAtRef);
    return Math.max(MIN_FONT_PX, Math.min(MAX_FONT_PX, Math.floor(idealPx)));
  }
}
