import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-container">
      <div class="config-card">
        <div class="config-row">
          <label class="section-label">Difficulty</label>
          <div class="slider-row">
            <input type="range" min="1" max="100" step="1"
              [value]="game.config().difficulty"
              (input)="onDifficulty($event)"
              aria-label="Difficulty — controls piece complexity" />
            <span class="range-value">{{ game.config().difficulty }}</span>
          </div>
        </div>

        <div class="config-row">
          <label class="section-label">Pieces</label>
          <div class="slider-row">
            <input type="range" min="3" max="20" step="1"
              [value]="game.config().pieceCount"
              (input)="onPieceCount($event)"
              aria-label="Number of pieces" />
            <span class="range-value">{{ game.config().pieceCount }}</span>
          </div>
        </div>
      </div>

      <button class="start-btn" (click)="start()">Start</button>
    </div>
  `,
  styles: [`
    :host {
      display: flex; align-items: flex-start; justify-content: center;
      min-height: 100%; padding-top: 1.5rem;
    }
    .config-container {
      display: flex; flex-direction: column; align-items: center;
      gap: 1.25rem; width: 100%; max-width: 450px; padding: 0 1.5rem 1.5rem;
    }
    .config-card {
      display: flex; flex-direction: column; gap: 0.75rem; width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem; padding: 1rem; backdrop-filter: blur(10px);
    }
    .config-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .section-label {
      color: #94a3b8; font-size: 0.7rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em; text-align: center;
    }
    .slider-row {
      display: flex; align-items: center; gap: 0.5rem;
      input[type="range"] { flex: 1; accent-color: #6366f1; }
    }
    .range-value {
      min-width: 2.5rem; text-align: center; font-weight: 600;
      font-size: 0.85rem; color: #a5b4fc;
    }
    .start-btn {
      width: 100%; padding: 0.75rem 3rem;
      border: 1px solid rgba(34, 197, 94, 0.5); border-radius: 0.5rem;
      background: rgba(34, 197, 94, 0.2); color: #86efac;
      font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s;
      &:hover { background: rgba(34, 197, 94, 0.35); }
    }
  `],
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);

  onDifficulty(event: Event): void {
    this.game.updateConfig({ difficulty: +(event.target as HTMLInputElement).value });
  }

  onPieceCount(event: Event): void {
    this.game.updateConfig({ pieceCount: +(event.target as HTMLInputElement).value });
  }

  start(): void {
    this.game.startSession();
  }
}
