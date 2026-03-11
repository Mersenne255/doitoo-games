import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { GameStage, GameMode, GameResult } from '../../models/game.models';

@Component({
  selector: 'app-display',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="display-container">
      @if (showSequenceOverlay()) {
        <div class="sequence-overlay">{{ displayValue() }}</div>
      }
      <div class="number-line" [style.font-size]="fontSize()" [style.visibility]="showSequenceOverlay() ? 'hidden' : 'visible'">{{ currentValue() || '&nbsp;' }}</div>
      <div class="number-line feedback-slot" [style.font-size]="fontSize()">
        @if (stage() === 'result' && result()) {
          @if (result()!.correct) {
            <span class="correct">Correct! 🎉</span>
          } @else {
            <span class="incorrect">{{ result()!.expected }}</span>
          }
        } @else {
          &nbsp;
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .display-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      padding: 1rem 1.5rem;
      width: 100%;
      backdrop-filter: blur(10px);
    }

    .sequence-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: 600;
      font-size: 6rem;
      line-height: 1;
      color: #f1f5f9;
      letter-spacing: 0.12em;
      z-index: 1;
    }

    .number-line {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: 600;
      line-height: 1.3;
      color: #f1f5f9;
      letter-spacing: 0.12em;
      min-height: 1.3em;
      white-space: nowrap;
      text-align: center;
    }

    .correct {
      color: #34d399;
      text-shadow: 0 0 20px rgba(52, 211, 153, 0.3);
      animation: fadeIn 0.3s ease;
    }

    .incorrect {
      color: #f87171;
      text-shadow: 0 0 20px rgba(248, 113, 113, 0.3);
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class DisplayComponent {
  displayValue = input<string>('');
  inputValue = input<string>('');
  stage = input<GameStage>('idle');
  mode = input<GameMode>('sequence');
  result = input<GameResult | null>(null);
  numberLength = input<number>(8);

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

