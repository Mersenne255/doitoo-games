import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { VOXEL_COLORS, VOXEL_SYMBOLS } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-container">
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
            <input type="range" min="1" max="9" step="1"
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
            <input type="range" min="1" max="9" step="1"
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
  styles: [`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100%;
      padding-top: 1.5rem;
    }

    .config-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
      max-width: 450px;
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

    .config-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
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

      input[type="range"] {
        flex: 1;
        accent-color: #6366f1;
      }
    }

    .range-value {
      min-width: 2.5rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.85rem;
      color: #a5b4fc;
    }

    .color-preview {
      display: flex;
      gap: 0.3rem;
      justify-content: center;
      padding: 0.25rem 0;
    }

    .color-dot {
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .symbol-preview {
      display: flex;
      gap: 0.3rem;
      justify-content: center;
      padding: 0.25rem 0;
    }

    .symbol-chip {
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      color: #e2e8f0;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 0.25rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
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
  private readonly storage = inject(StorageService);

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
