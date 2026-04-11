import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { SpeedMode } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <label class="section-label">Difficulty</label>
        <div class="slider-row">
          <input type="range" min="1" max="20" step="1"
            [value]="game.config().difficulty"
            (input)="onDifficulty($event)"
            aria-label="Difficulty" />
          <span class="range-value">{{ game.config().difficulty }}</span>
        </div>

        <label class="section-label">Trials</label>
        <div class="slider-row">
          <input type="range" min="10" max="50" step="5"
            [value]="game.config().trialCount"
            (input)="onTrialCount($event)"
            aria-label="Trials" />
          <span class="range-value">{{ game.config().trialCount }}</span>
        </div>

        <label class="section-label">Speed</label>
        <div class="button-group">
          @for (s of speeds; track s) {
            <button [class.active]="game.config().speedMode === s"
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
  readonly speeds: SpeedMode[] = ['relaxed', 'standard', 'intense'];

  onDifficulty(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ difficulty: value });
    this.storage.saveConfig(this.game.config());
  }

  onTrialCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ trialCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: SpeedMode): void {
    this.game.updateConfig({ speedMode: speed });
    this.storage.saveConfig(this.game.config());
  }
}
