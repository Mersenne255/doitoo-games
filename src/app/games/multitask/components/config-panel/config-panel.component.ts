import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameService } from '../../services/game.service';
import { MINIGAME_REGISTRY, ProgressionSpeed } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-card">
      <!-- Slots -->
      <label class="section-label">Slots</label>
      <div class="slot-fields">
        <label class="slot-field">
          <span class="field-label">#1</span>
          <select (change)="onSlotAssign(0, $event)"
            aria-label="Assign minigame to slot 1">
            @for (entry of registry; track entry.id) {
              <option [value]="entry.id"
                [selected]="game.slotConfigs()[0].minigameId === entry.id">{{ entry.name }}</option>
            }
          </select>
        </label>
        @for (i of [1, 2]; track i) {
          <label class="slot-field" [class.disabled]="i === 2 && !slot2Enabled()">
            <span class="field-label">#{{ i + 1 }}</span>
            <select (change)="onSlotAssign(i, $event)"
              [disabled]="i === 2 && !slot2Enabled()"
              aria-label="Assign minigame to slot {{ i + 1 }}">
              <option value="" class="none-option"
                [selected]="game.slotConfigs()[i].minigameId === null">-</option>
              @for (entry of registry; track entry.id) {
                <option [value]="entry.id"
                  [selected]="game.slotConfigs()[i].minigameId === entry.id">{{ entry.name }}</option>
              }
            </select>
          </label>
        }
      </div>

      @if (game.validationErrors().length > 0) {
        <div class="validation" role="alert">
          @for (idx of game.validationErrors(); track idx) {
            <span>Slot {{ idx + 1 }} needs a minigame</span>
          }
        </div>
      }

      <!-- Initial Difficulty -->
      <label class="section-label">Initial Difficulty</label>
      <div class="slider-row">
        <input type="range" min="1" max="100"
          [value]="game.startingDifficulty()"
          (input)="onDifficultyChange($event)" />
        <span class="range-value">{{ game.startingDifficulty() }}</span>
      </div>

      <!-- Progression -->
      <label class="section-label">Progression</label>
      <div class="button-group">
        @for (s of speeds; track s) {
          <button [class.active]="game.progressionSpeed() === s"
            (click)="game.setProgressionSpeed(s)">{{ s }}</button>
        }
      </div>
    </div>

    <button class="start-btn" [disabled]="!allAssigned()"
      (click)="game.startSession()">Start Game</button>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent {
  readonly game = inject(GameService);
  readonly registry = MINIGAME_REGISTRY;
  readonly speeds: ProgressionSpeed[] = ['slow', 'medium', 'fast'];

  readonly slot2Enabled = computed(() => this.game.slotConfigs()[1].minigameId !== null);

  readonly allAssigned = computed(() => {
    const configs = this.game.slotConfigs();
    return configs[0].minigameId !== null;
  });

  onDifficultyChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.setStartingDifficulty(value);
  }

  onSlotAssign(slotIndex: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.game.assignMinigame(slotIndex, value || null);
    // When slot 2 is cleared, also clear slot 3
    if (slotIndex === 1 && !value) {
      this.game.assignMinigame(2, null);
    }
  }
}
