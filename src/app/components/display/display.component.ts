import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { GameStage, GameResult } from '../../models/game.models';

@Component({
  selector: 'app-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="display-container">
      <div class="value">{{ displayValue() }}</div>
      <div class="value">{{ inputValue() }}</div>
      @if (stage() === 'result' && result()) {
        <div class="result" [class.correct]="result()!.correct" [class.incorrect]="!result()!.correct">
          @if (result()!.correct) {
            Correct! 🎉
          } @else {
            {{ result()!.expected }}
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .display-container {
      height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .value {
      font-family: monospace;
      font-size: 3.5rem;
      line-height: 1.2;
    }

    .result {
      font-family: monospace;
      font-size: 3.5rem;
      line-height: 1.2;
    }

    .correct {
      color: green;
    }

    .incorrect {
      color: red;
    }
  `],
})
export class DisplayComponent {
  displayValue = input<string>('');
  inputValue = input<string>('');
  stage = input<GameStage>('idle');
  result = input<GameResult | null>(null);
}
