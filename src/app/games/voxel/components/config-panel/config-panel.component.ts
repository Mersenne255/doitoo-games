import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { VOXEL_COLORS, VOXEL_SYMBOLS, MAX_COLORS, MAX_SYMBOLS } from '../../models/game.models';
import { NumberSliderComponent } from '../../../../shared/components/number-slider/number-slider.component';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [NumberSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <app-number-slider label="Cube Count" [value]="game.config().cubeCount"
          [min]="3" [max]="50" (valueChange)="onCubeCount($event)" />

        <app-number-slider label="Colors" [value]="game.config().colorCount"
          [min]="1" [max]="maxColors" (valueChange)="onColorCount($event)">
          <div class="color-preview">
            @if (game.config().colorCount > 1) {
              @for (c of activeColors(); track c) {
                <span class="color-dot" [style.background-color]="c"></span>
              }
            }
          </div>
        </app-number-slider>

        <app-number-slider label="Symbols" [value]="game.config().symbolCount"
          [min]="1" [max]="maxSymbols" [displayFn]="symbolDisplay"
          (valueChange)="onSymbolCount($event)">
          <div class="symbol-preview">
            @if (game.config().symbolCount > 1) {
              @for (s of activeSymbols(); track s) {
                <span class="symbol-chip">{{ s }}</span>
              }
            }
          </div>
        </app-number-slider>
      </div>

      <button class="start-btn" (click)="start()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  readonly maxColors = MAX_COLORS;
  readonly maxSymbols = MAX_SYMBOLS;

  readonly activeColors = () => VOXEL_COLORS.slice(0, this.game.config().colorCount);
  readonly activeSymbols = () => VOXEL_SYMBOLS.slice(0, this.game.config().symbolCount);

  readonly symbolDisplay = (v: number) => v === 1 ? '—' : String(v);

  onCubeCount(value: number): void {
    this.game.updateConfig({ cubeCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onColorCount(value: number): void {
    this.game.updateConfig({ colorCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSymbolCount(value: number): void {
    this.game.updateConfig({ symbolCount: value });
    this.storage.saveConfig(this.game.config());
  }

  start(): void {
    this.game.startSession();
  }
}
