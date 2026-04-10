import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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

      @if (game.roundResult(); as r) {
        <div class="slots">
          <div class="slot-result">
            <span class="slot-title correct">{{ r.puzzlesSolved }} / {{ r.totalPuzzles }}</span>
            <span class="slot-label">Puzzles Solved</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.averageSolveTimeSec | number:'1.1-1' }}s</span>
            <span class="slot-label">Avg Solve Time</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.totalHintsUsed }}</span>
            <span class="slot-label">Hints Used</span>
          </div>
          <div class="slot-result">
            <span class="slot-title streak">{{ r.longestNoHintStreak }}</span>
            <span class="slot-label">No-Hint Streak</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.accuracy | number:'1.0-0' }}%</span>
            <span class="slot-label">Accuracy</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.difficulty }}</span>
            <span class="slot-label">Difficulty</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.boxDimension[0] }}×{{ r.boxDimension[1] }}</span>
            <span class="slot-label">Box Size</span>
          </div>
          <div class="slot-result">
            <span class="slot-title">{{ r.speedMode }}</span>
            <span class="slot-label">Speed</span>
          </div>
        </div>
      }

      <div class="actions">
        <button class="dismiss-btn back" (click)="game.goToIdle()">Back</button>
        <button class="dismiss-btn play-again" (click)="game.startSession()">Play Again</button>
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
      min-width: 18rem;
      max-width: 380px;
      width: 90%;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #a5b4fc;
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
    .slot-title.streak { color: #fde68a; }

    .slot-label {
      font-size: 0.6rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: center;
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
  readonly game = inject(GameService);
}
