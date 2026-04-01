import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-card">
      <h2>Session Complete</h2>

      <div class="slots">
        @for (result of game.slotResults(); track result.slotIndex) {
          <div class="slot-result">
            <span class="slot-title">Slot {{ result.slotIndex + 1 }}</span>
            <span class="slot-score">{{ result.score }} / {{ result.total }}</span>
            <div class="breakdown">
              <span class="correct">✓ {{ result.details.correct }}</span>
              <span class="incorrect">✗ {{ result.details.incorrect }}</span>
              <span class="timed-out">⏱ {{ result.details.timedOut }}</span>
            </div>
          </div>
        }
      </div>

      <div class="total">
        Total: {{ game.totalScore() }}
      </div>

      <button class="dismiss-btn" (click)="game.dismissSummary()">
        Play Again
      </button>
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
      min-width: 20rem;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #a5b4fc;
    }

    .slots {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    }

    .slot-result {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: rgba(30, 30, 50, 0.6);
    }

    .slot-title {
      font-weight: 600;
      font-size: 0.875rem;
      color: #a5b4fc;
      min-width: 4rem;
    }

    .slot-score {
      font-weight: 800;
      font-size: 1.125rem;
      color: #e2e8f0;
    }

    .breakdown {
      display: flex;
      gap: 0.75rem;
      margin-left: auto;
      font-size: 0.75rem;
    }

    .correct { color: #86efac; }
    .incorrect { color: #fca5a5; }
    .timed-out { color: #fde68a; }

    .total {
      font-size: 1.5rem;
      font-weight: 800;
      color: #e2e8f0;
    }

    .dismiss-btn {
      padding: 0.625rem 2rem;
      border: 1px solid rgba(99, 102, 241, 0.5);
      border-radius: 0.5rem;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(99, 102, 241, 0.35);
      }
    }
  `],
})
export class SummaryComponent {
  readonly game = inject(GameService);
}
