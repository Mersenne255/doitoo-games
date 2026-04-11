import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, signal, HostListener } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { BaseSpeed } from '../../models/game.models';
import { computeMaxStationCount } from '../../models/grid.models';
import { TRACK_GENERATION_DEFAULTS } from '../../models/track-generation.config';
import { NumberSliderComponent } from '../../../../shared/components/number-slider/number-slider.component';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [NumberSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <app-number-slider label="Destinations" [value]="game.config().destinations"
          [min]="2" [max]="maxDestinations()" (valueChange)="onDestinations($event)" />

        <app-number-slider label="Runners" [value]="game.config().runners"
          [min]="5" [max]="100" [step]="5" (valueChange)="onRunners($event)" />

        <app-number-slider label="Spawn Interval" [value]="game.config().spawnInterval"
          [min]="1" [max]="5" [step]="0.5" [displayFn]="spawnIntervalDisplay"
          (valueChange)="onSpawnInterval($event)" />

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

  readonly spawnIntervalDisplay = (v: number) => this.formatInterval(v) + 's';

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

  onDestinations(value: number): void {
    this.game.updateConfig({ destinations: value });
    this.storage.saveConfig(this.game.config());
  }

  onRunners(value: number): void {
    this.game.updateConfig({ runners: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpawnInterval(value: number): void {
    this.game.updateConfig({ spawnInterval: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: BaseSpeed): void {
    this.game.updateConfig({ baseSpeed: speed });
    this.storage.saveConfig(this.game.config());
  }
}
