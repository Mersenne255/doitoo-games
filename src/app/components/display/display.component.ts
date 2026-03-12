import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { GameStage, GameMode, GameResult } from '../../models/game.models';

interface FeedbackDigit {
  char: string;
  wrong: boolean;
}

@Component({
  selector: 'app-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './display.component.html',
  styleUrl: './display.component.scss',
})
export class DisplayComponent {
  displayValue = input<string>('');
  inputValue = input<string>('');
  stage = input<GameStage>('idle');
  mode = input<GameMode>('sequence');
  result = input<GameResult | null>(null);
  numberLength = input<number>(8);

  feedbackDigits = computed<FeedbackDigit[]>(() => {
    const r = this.result();
    if (!r || r.correct) return [];
    const expected = r.expected;
    const guess = r.guess;
    return [...guess].map((char, i) => ({
      char,
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

  fontSize = computed(() => {
    const len = this.numberLength();
    if (len <= 3) return '4.5rem';
    if (len <= 5) return '3.8rem';
    if (len <= 7) return '3.2rem';
    if (len <= 9) return '2.8rem';
    if (len <= 12) return '2.2rem';
    if (len <= 16) return '1.6rem';
    return '1.2rem';
  });
}
