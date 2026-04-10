import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameService } from '../../services/game.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-container">
      <div class="summary-card">
        <div class="status" [class]="statusClass()">{{ statusText() }}</div>

        <div class="metrics">
          <div class="metric">
            <span class="metric-label">Score</span>
            <span class="metric-value">{{ result()?.combinedScore | number:'1.0-0' }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Time</span>
            <span class="metric-value">{{ formatTime(result()?.solveTimeSec ?? 0) }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Moves</span>
            <span class="metric-value">{{ result()?.moveCount }}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Efficiency</span>
            <span class="metric-value">{{ result()?.efficiencyScore | number:'1.0-0' }}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Hints</span>
            <span class="metric-value">{{ result()?.hintsUsed }}</span>
          </div>
        </div>

        <div class="config-info">
          <span>Difficulty {{ game.config().difficulty }}</span>
          <span>{{ game.config().pieceCount }} pieces</span>
        </div>
      </div>

      <div class="actions">
        <button class="play-again-btn" (click)="playAgain()">Play Again</button>
        <button class="back-btn" (click)="back()">Back</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex; align-items: center; justify-content: center;
      min-height: 100%; padding: 1.5rem;
    }
    .summary-container {
      display: flex; flex-direction: column; align-items: center;
      gap: 1.25rem; width: 100%; max-width: 400px;
    }
    .summary-card {
      width: 100%; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1rem; padding: 1.5rem;
      display: flex; flex-direction: column; gap: 1rem; align-items: center;
    }
    .status {
      font-size: 1.5rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status.solved { color: #86efac; }
    .status.timed_out { color: #fbbf24; }
    .status.aborted { color: #f87171; }
    .metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
      width: 100%;
    }
    .metric {
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
    }
    .metric-label { color: #64748b; font-size: 0.65rem; text-transform: uppercase; }
    .metric-value { color: #e2e8f0; font-size: 1.1rem; font-weight: 600; }
    .config-info {
      display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;
      span {
        color: #64748b; font-size: 0.7rem; padding: 0.15rem 0.4rem;
        background: rgba(255,255,255,0.04); border-radius: 0.25rem;
        text-transform: capitalize;
      }
    }
    .actions { display: flex; gap: 0.75rem; width: 100%; }
    .play-again-btn {
      flex: 1; padding: 0.75rem; border: 1px solid rgba(34,197,94,0.5);
      border-radius: 0.5rem; background: rgba(34,197,94,0.2); color: #86efac;
      font-weight: 600; font-size: 1rem; cursor: pointer;
      &:hover { background: rgba(34,197,94,0.35); }
    }
    .back-btn {
      flex: 1; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.5rem; background: rgba(255,255,255,0.04); color: #94a3b8;
      font-weight: 600; font-size: 1rem; cursor: pointer;
      &:hover { background: rgba(255,255,255,0.08); }
    }
  `],
})
export class SummaryComponent {
  readonly game = inject(GameService);

  readonly result = computed(() => this.game.puzzleResult());

  readonly statusText = computed(() => {
    const r = this.result();
    if (!r) return '';
    switch (r.status) {
      case 'solved': return 'Solved';
      case 'timed_out': return 'Time\'s Up';
      case 'aborted': return 'Aborted';
    }
  });

  readonly statusClass = computed(() => this.result()?.status ?? '');

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  playAgain(): void {
    this.game.startSession();
  }

  back(): void {
    this.game.abortSession();
  }
}
