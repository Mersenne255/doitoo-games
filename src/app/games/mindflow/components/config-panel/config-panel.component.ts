import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal, HostListener } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { BaseSpeed } from '../../models/game.models';
import { computeMaxStationCount } from '../../models/grid.models';
import { TRACK_GENERATION_DEFAULTS } from '../../models/track-generation.config';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <label class="section-label">Destinations</label>
        <div class="slider-row">
          <input type="range" min="2" [max]="maxDestinations()" step="1"
            [value]="game.config().destinations"
            (input)="onDestinations($event)"
            aria-label="Destinations" />
          <span class="range-value">{{ game.config().destinations }}</span>
        </div>

        <label class="section-label">Runners</label>
        <div class="slider-row">
          <input type="range" min="5" max="100" step="5"
            [value]="game.config().runners"
            (input)="onRunners($event)"
            aria-label="Runners" />
          <span class="range-value">{{ game.config().runners }}</span>
        </div>

        <label class="section-label">Spawn Interval (s)</label>
        <div class="slider-row">
          <input type="range" min="1" max="5" step="0.5"
            [value]="game.config().spawnInterval"
            (input)="onSpawnInterval($event)"
            aria-label="Spawn interval" />
          <span class="range-value">{{ formatInterval(game.config().spawnInterval) }}s</span>
        </div>

        <label class="section-label">Speed</label>
        <div class="button-group">
          @for (s of speeds; track s) {
            <button [class.active]="game.config().baseSpeed === s"
              (click)="onSpeed(s)">{{ s }}</button>
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
  private readonly cdr = inject(ChangeDetectorRef);
  readonly speeds: BaseSpeed[] = ['slow', 'medium', 'fast'];

  /** Max destinations based on current screen size. */
  readonly maxDestinations = signal(this.calcMaxDestinations());

  @HostListener('window:resize')
  onResize(): void {
    const newMax = this.calcMaxDestinations();
    this.maxDestinations.set(newMax);
    // Clamp current destinations to new max
    const current = this.game.config().destinations;
    if (current > newMax) {
      this.game.updateConfig({ destinations: newMax });
      this.storage.saveConfig(this.game.config());
    }
    this.cdr.markForCheck();
  }

  private calcMaxDestinations(): number {
    const cellSize = TRACK_GENERATION_DEFAULTS.cellSizePx;
    const cols = Math.max(3, Math.floor(window.innerWidth / cellSize));
    const rows = Math.max(3, Math.floor(window.innerHeight / cellSize));
    const max = computeMaxStationCount({ cols, rows });
    return Math.min(max, 20);
  }

  formatInterval(value: number): string {
    return Number(value.toFixed(1)).toString();
  }

  onDestinations(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ destinations: value });
    this.storage.saveConfig(this.game.config());
  }

  onRunners(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ runners: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpawnInterval(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ spawnInterval: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: BaseSpeed): void {
    this.game.updateConfig({ baseSpeed: speed });
    this.storage.saveConfig(this.game.config());
  }
}
