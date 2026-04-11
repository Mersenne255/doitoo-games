import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { MAX_SYMBOL_COUNT } from '../../models/game.models';
import { NumberSliderComponent } from '../../../../shared/components/number-slider/number-slider.component';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [NumberSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <app-number-slider label="Symbols" [value]="game.config().symbolCount"
          [min]="3" [max]="maxSymbols" (valueChange)="onSymbolCount($event)" />
      </div>

      <button class="start-btn" (click)="game.startSession()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  readonly maxSymbols = MAX_SYMBOL_COUNT;

  onSymbolCount(value: number): void {
    this.game.updateConfig({ symbolCount: value });
    this.storage.saveConfig(this.game.config());
  }
}
