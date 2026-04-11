import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { SpeedMode } from '../../models/game.models';
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
          [min]="1" [max]="20" (valueChange)="onDifficulty($event)" />

        <app-number-slider label="Trials" [value]="game.config().trialCount"
          [min]="10" [max]="50" [step]="5" (valueChange)="onTrialCount($event)" />

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

  onDifficulty(value: number): void {
    this.game.updateConfig({ difficulty: value });
    this.storage.saveConfig(this.game.config());
  }

  onTrialCount(value: number): void {
    this.game.updateConfig({ trialCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: SpeedMode): void {
    this.game.updateConfig({ speedMode: speed });
    this.storage.saveConfig(this.game.config());
  }
}
