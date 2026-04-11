import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { BoxDimension } from '../../models/game.models';
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

        <label class="section-label">Grid Size</label>
        <div class="button-group">
          @for (dim of boxDims; track dim.label) {
            <button [class.active]="isBoxDimActive(dim.value)"
              (click)="onBoxDim(dim.value)">{{ dim.label }}</button>
          }
        </div>
      </div>

      <button class="start-btn" (click)="game.startSession()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  readonly boxDims = [
    { label: '4×4', value: [2, 2] as BoxDimension },
    { label: '6×6', value: [2, 3] as BoxDimension },
    { label: '9×9', value: [3, 3] as BoxDimension },
  ];

  isBoxDimActive(dim: BoxDimension): boolean {
    const current = this.game.config().boxDimension;
    return current[0] === dim[0] && current[1] === dim[1];
  }

  onDifficulty(value: number): void {
    this.game.updateConfig({ difficulty: value });
  }

  onBoxDim(dim: BoxDimension): void {
    this.game.updateConfig({ boxDimension: dim });
  }
}
