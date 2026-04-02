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
    <div class="panel">
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
  styles: [`
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100%;
      padding-top: 1.5rem;
    }

    .panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      width: 100%;
      max-width: 400px;
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

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;

      button {
        flex: 1;
        background: rgba(255, 255, 255, 0.06);
        color: #94a3b8;
        padding: 0.4rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.5rem;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: capitalize;
        transition: all 0.15s ease;
        outline: none;

        &:hover { background: rgba(255, 255, 255, 0.1); }

        &.active {
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
        }
      }
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
