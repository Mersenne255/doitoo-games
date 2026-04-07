import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import { SpeedMode } from '../../models/game.models';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel">
      <div class="config-card">
        <label class="section-label">Difficulty</label>
        <div class="slider-row">
          <input type="range" min="1" max="20" step="1"
            [value]="game.config().difficulty"
            (input)="onDifficulty($event)"
            aria-label="Difficulty" />
          <span class="range-value">{{ game.config().difficulty }}</span>
        </div>

        <label class="section-label">Cards</label>
        <div class="slider-row">
          <input type="range" min="15" max="40" step="5"
            [value]="game.config().cardCount"
            (input)="onCardCount($event)"
            aria-label="Card count" />
          <span class="range-value">{{ game.config().cardCount }}</span>
        </div>

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
  readonly speeds: SpeedMode[] = ['relaxed', 'standard', 'intense'];
  readonly start = output<void>();

  onDifficulty(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.game.updateConfig({ difficulty: value });
    this.storage.saveConfig(this.game.config());
  }

  onCardCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
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
