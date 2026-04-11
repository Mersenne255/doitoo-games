import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
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

        <app-number-slider label="Cards" [value]="game.config().cardCount"
          [min]="15" [max]="40" [step]="5" (valueChange)="onCardCount($event)" />

        <label class="section-label">Speed</label>
        <div class="button-group">
          @for (s of speeds; track s) {
            <button [class.active]="game.config().speedMode === s"
              (click)="onSpeed(s)">{{ s }}</button>
          }
        </div>
      </div>

      <button class="start-btn" (click)="onStart()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  readonly speeds: SpeedMode[] = ['relaxed', 'standard', 'intense'];
  readonly start = output<void>();

  onDifficulty(value: number): void {
    this.game.updateConfig({ difficulty: value });
    this.storage.saveConfig(this.game.config());
  }

  onCardCount(value: number): void {
    this.game.updateConfig({ cardCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: SpeedMode): void {
    this.game.updateConfig({ speedMode: speed });
    this.storage.saveConfig(this.game.config());
  }

  onStart(): void {
    this.start.emit();
  }
}
