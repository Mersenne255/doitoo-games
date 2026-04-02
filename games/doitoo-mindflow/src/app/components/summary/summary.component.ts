import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-card">
      <h2>Round Complete</h2>

      @if (result(); as r) {
        <div class="score">{{ r.score }}</div>
        <div class="score-label">Final Score</div>

        <div class="stat-grid">
          <div class="stat">
            <span class="stat-value correct">{{ r.correctDeliveries }}</span>
            <span class="stat-label">Correct</span>
          </div>
          <div class="stat">
            <span class="stat-value incorrect">{{ r.misdeliveries }}</span>
            <span class="stat-label">Misdeliveries</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ r.accuracy | number:'1.0-1' }}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ formatTime(r.elapsedTimeMs) }}</span>
            <span class="stat-label">Time</span>
          </div>
          <div class="stat">
            <span class="stat-value streak">{{ r.longestStreak }}</span>
            <span class="stat-label">Best Streak</span>
          </div>
        </div>
      }

      <div class="actions">
        <button class="btn play-again" (click)="game.startSession()">Play Again</button>
        <button class="btn back" (click)="game.goToIdle()">Back</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 2rem;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 1rem;
      background: rgba(15, 15, 26, 0.9);
      backdrop-filter: blur(10px);
      min-width: 18rem;
      max-width: 400px;
      width: 90%;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #a5b4fc;
    }

    .score {
      font-size: 3rem;
      font-weight: 900;
      color: #e2e8f0;
      line-height: 1;
    }

    .score-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: -0.5rem;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      width: 100%;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: rgba(30, 30, 50, 0.6);
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 800;
      color: #e2e8f0;
    }

    .stat-value.correct { color: #86efac; }
    .stat-value.incorrect { color: #fca5a5; }
    .stat-value.streak { color: #fde68a; }

    .stat-label {
      font-size: 0.65rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
    }

    .btn {
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
  readonly game = inject(GameService);
  readonly result = this.game.roundResult;

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
