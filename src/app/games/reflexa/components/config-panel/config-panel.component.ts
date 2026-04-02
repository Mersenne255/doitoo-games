import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <div class="config-card">
        <label class="section-label">Difficulty</label>
        <div class="slider-row">
          <input type="range" min="1" max="20" step="1"
            [value]="game.config().difficulty"
            (input)="onDifficulty($event)"
            aria-label="Difficulty level" />
          <span class="range-value">{{ game.config().difficulty }}</span>
        </div>

        <label class="section-label">Trials per Round</label>
        <div class="slider-row">
          <input type="range" min="10" max="100" step="5"
            [value]="game.config().trialCount"
            (input)="onTrialCount($event)"
            aria-label="Trials per round" />
          <span class="range-value">{{ game.config().trialCount }}</span>
        </div>

        <div class="tier-description">{{ tierDescription() }}</div>
      </div>

      <button class="start-btn" (click)="game.startSession()">Start</button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100%;
      padding-top: 1.5rem;
    }
    .panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
      max-width: 400px;
      padding: 0 1.5rem 1.5rem;
    }
    .config-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      padding: 1rem;
      backdrop-filter: blur(10px);
    }
    .section-label {
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
      margin: 0;
    }
    .slider-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      input[type="range"] { flex: 1; accent-color: #6366f1; }
    }
    .range-value {
      min-width: 2.5rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.85rem;
      color: #a5b4fc;
    }
    .tier-description {
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      padding: 0.5rem;
      background: rgba(99, 102, 241, 0.05);
      border-radius: 0.5rem;
      line-height: 1.4;
    }
    .start-btn {
      width: 100%;
      padding: 0.75rem 3rem;
      border: 1px solid rgba(34, 197, 94, 0.5);
      border-radius: 0.5rem;
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      &:hover { background: rgba(34, 197, 94, 0.35); }
    }
  `],
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);

  readonly tierDescription = computed(() => {
    const d = this.game.config().difficulty;
    if (d <= 5) return 'Stroop only — respond to the color, not the word';
    if (d <= 10) return 'Stroop + Simon — position conflicts added';
    if (d <= 15) return 'All conflicts + NoGo trials — sometimes don\'t respond';
    return 'Full chaos — rules switch mid-round';
  });

  onDifficulty(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ difficulty: value });
  }

  onTrialCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ trialCount: value });
  }
}
