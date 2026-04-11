import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { MAX_SYMBOL_COUNT } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <label class="section-label">Symbols</label>
        <div class="slider-row">
          <input type="range" min="3" [max]="maxSymbols" step="1"
            [value]="game.config().symbolCount"
            (input)="onSymbolCount($event)"
            aria-label="Symbol count" />
          <span class="range-value">{{ game.config().symbolCount }}</span>
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
  readonly maxSymbols = MAX_SYMBOL_COUNT;

  onSymbolCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ symbolCount: value });
    this.storage.saveConfig(this.game.config());
  }
}
