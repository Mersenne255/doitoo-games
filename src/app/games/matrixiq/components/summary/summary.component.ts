import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RoundResult } from '../../models/game.models';

@Component({
  selector: 'app-matrixiq-summary',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-card">
      <h2>Round Complete</h2>

      @if (result(); as r) {
        <div class="accuracy">{{ r.accuracy | number:'1.0-0' }}%</div>
        <div class="accuracy-label">Accuracy</div>

        <div class="total">{{ r.totalScore | number:'1.0-0' }}</div>
        <div class="total-label">Score</div>

        <div class="slots">
          <div class="slot-result">
            <span class="slot-title correct">✓ {{ r.correctCount }}</span>
            <span class="slot-label">Correct</span>
          </div>
          <div class="slot-result">
            <span class="slot-title incorrect">✗ {{ r.incorrectCount }}</span>
            <span class="slot-label">Incorrect</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">⏱ {{ r.timedOutCount }}</span>
            <span class="slot-label">Timed Out</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ avgResponseSec() }}s</span>
            <span class="slot-label">Avg Response</span>
          </div>
          <div class="slot-result">
            <span class="slot-title streak">🔥 {{ r.longestStreak }}</span>
            <span class="slot-label">Longest Streak</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.difficulty }}</span>
            <span class="slot-label">Difficulty</span>
          </div>
        </div>
      }

      <div class="actions">
        <button class="dismiss-btn back" (click)="back.emit()">Back</button>
        <button class="dismiss-btn play-again" (click)="playAgain.emit()">Play Again</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 1rem;
      background: rgba(15, 15, 26, 0.9);
      backdrop-filter: blur(12px);
      min-width: 18rem;
      max-width: 340px;
      width: 90%;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #a5b4fc;
    }

    .accuracy {
      font-size: 3rem;
      font-weight: 900;
      color: #e2e8f0;
      line-height: 1;
    }

    .accuracy-label {
      font-size: 0.65rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: -1rem;
    }

    .total {
      font-size: 2rem;
      font-weight: 800;
      color: #a5b4fc;
      line-height: 1;
    }

    .total-label {
      font-size: 0.6rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: -1rem;
    }

    .slots {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      width: 100%;
    }

    .slot-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      padding: 0.5rem 0.25rem;
      border-radius: 0.5rem;
      background: rgba(30, 30, 50, 0.6);
    }

    .slot-title {
      font-weight: 800;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .slot-title.correct { color: #86efac; }
    .slot-title.incorrect { color: #fca5a5; }
    .slot-title.streak { color: #fde68a; }

    .slot-label {
      font-size: 0.6rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
    }

    .dismiss-btn {
      flex: 1;
      padding: 0.625rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
    }

    .play-again {
      border: 1px solid rgba(34, 197, 94, 0.5);
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;

      &:hover { background: rgba(34, 197, 94, 0.35); }
    }

    .back {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;

      &:hover { background: rgba(255, 255, 255, 0.1); }
    }
  `],
})
export class SummaryComponent {
  readonly result = input.required<RoundResult>();
  readonly back = output<void>();
  readonly playAgain = output<void>();

  readonly avgResponseSec = () => {
    const r = this.result();
    return (r.averageResponseTimeMs / 1000).toFixed(1);
  };
}
