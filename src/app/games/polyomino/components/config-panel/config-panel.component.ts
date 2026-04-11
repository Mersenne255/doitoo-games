import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
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
  styleUrl: './config-panel.component.scss',
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
