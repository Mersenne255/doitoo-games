import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameService } from '../../services/game.service';
import { MINIGAME_REGISTRY, ProgressionSpeed } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config">
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
  styles: [`
    :host { display: block; width: 100%; }

    .config {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      padding: 0.75rem 1rem;
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

    .slot-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .slot-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      &.disabled {
        opacity: 0.35;
        pointer-events: none;
      }
    }

    .field-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      text-align: center;
    }

    select {
      width: 100%;
      padding: 0.4rem 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.85rem;
      font-family: 'Inter', system-ui, sans-serif;
      outline: none;
      text-align: center;
      transition: border-color 0.15s ease;
      min-width: 7rem;

      &:focus {
        border-color: rgba(99, 102, 241, 0.5);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
      }
    }

    select option {
      background: #1e1e32;
      color: #e2e8f0;
    }

    select option.none-option,
    select option[value=""] {
      color: #64748b;
      font-style: italic;
    }

    .validation {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #fca5a5;
      text-align: center;
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
      min-width: 2rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.85rem;
      color: #a5b4fc;
    }

    .button-group {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;

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
      margin-top: 0.5rem;

      &:hover:not(:disabled) { background: rgba(34, 197, 94, 0.35); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  `],
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
