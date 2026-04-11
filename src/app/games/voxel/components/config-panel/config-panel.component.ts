import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { VOXEL_COLORS, VOXEL_SYMBOLS, MAX_COLORS, MAX_SYMBOLS } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <div class="config-row">
          <label class="section-label">Cube Count</label>
          <div class="slider-row">
            <input type="range" min="3" max="50" step="1"
              [value]="game.config().cubeCount"
              (input)="onCubeCount($event)"
              aria-label="Cube count" />
            <span class="range-value">{{ game.config().cubeCount }}</span>
          </div>
        </div>

        <div class="config-row">
          <label class="section-label">Colors</label>
          <div class="slider-row">
            <input type="range" min="1" [max]="maxColors" step="1"
              [value]="game.config().colorCount"
              (input)="onColorCount($event)"
              aria-label="Color count" />
            <span class="range-value">{{ game.config().colorCount }}</span>
          </div>
          <div class="color-preview">
            @if (game.config().colorCount > 1) {
              @for (c of activeColors(); track c) {
                <span class="color-dot" [style.background-color]="c"></span>
              }
            }
          </div>
        </div>

        <div class="config-row">
          <label class="section-label">Symbols</label>
          <div class="slider-row">
            <input type="range" min="1" [max]="maxSymbols" step="1"
              [value]="game.config().symbolCount"
              (input)="onSymbolCount($event)"
              aria-label="Symbol count" />
            <span class="range-value">{{ game.config().symbolCount === 1 ? '—' : game.config().symbolCount }}</span>
          </div>
          <div class="symbol-preview">
            @if (game.config().symbolCount > 1) {
              @for (s of activeSymbols(); track s) {
                <span class="symbol-chip">{{ s }}</span>
              }
            }
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
  private readonly storage = inject(StorageService);
  readonly maxColors = MAX_COLORS;
  readonly maxSymbols = MAX_SYMBOLS;

  readonly activeColors = () => VOXEL_COLORS.slice(0, this.game.config().colorCount);
  readonly activeSymbols = () => VOXEL_SYMBOLS.slice(0, this.game.config().symbolCount);

  onCubeCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ cubeCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onColorCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ colorCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSymbolCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ symbolCount: value });
    this.storage.saveConfig(this.game.config());
  }

  start(): void {
    this.game.startSession();
  }
}
