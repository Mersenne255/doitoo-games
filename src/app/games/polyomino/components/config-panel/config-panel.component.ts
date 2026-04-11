import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { NumberSliderComponent } from '../../../../shared/components/number-slider/number-slider.component';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [NumberSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <app-number-slider label="Difficulty" [value]="game.config().difficulty"
          [min]="1" [max]="100" (valueChange)="onDifficulty($event)" />

        <app-number-slider label="Pieces" [value]="game.config().pieceCount"
          [min]="3" [max]="20" (valueChange)="onPieceCount($event)" />
      </div>

      <button class="start-btn" (click)="start()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);

  onDifficulty(value: number): void {
    this.game.updateConfig({ difficulty: value });
  }

  onPieceCount(value: number): void {
    this.game.updateConfig({ pieceCount: value });
  }

  start(): void {
    this.game.startSession();
  }
}
