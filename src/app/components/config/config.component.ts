import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { GameMode, Config } from '../../models/game.models';

@Component({
  selector: 'app-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config">
      <label class="center flex-column">
        Mode
        <div class="mode-buttons">
          <button [class.active]="mode() === 'sequence'" (click)="modeChange.emit('sequence')">Sequence</button>
          <button [class.active]="mode() === 'complete'" (click)="modeChange.emit('complete')">Complete</button>
        </div>
      </label>
      <label class="center flex-column">
        Numbers count
        <input type="number" [value]="config().numberLength" (input)="onNumberLength($event)" />
      </label>
      <label class="center flex-column">
        @if (mode() === 'sequence') { Interval (ms) } @else { Duration (ms) }
        <input type="number" [value]="mode() === 'sequence' ? config().interval : config().duration" (input)="onTiming($event)" />
      </label>
    </div>
  `,
  styles: [`
    .config {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    button {
      background: #888888;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
    button.active {
      background: #2563eb;
    }
    .center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flex-column {
      flex-direction: column;
    }
    .mode-buttons {
      display: flex;
      flex-direction: row;
      gap: 1rem;
      justify-content: center;
    }
    input[type='number'] {
      width: 100%;
      padding: 0.4rem;
      border: 1px solid #ddd;
      border-radius: 0.4rem;
    }
  `],
})
export class ConfigComponent {
  mode = input<GameMode>('sequence');
  config = input<Config>({ numberLength: 8, interval: 1000, duration: 2000 });

  modeChange = output<GameMode>();
  configChange = output<Partial<Config>>();

  onNumberLength(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.configChange.emit({ numberLength: +value });
  }

  onTiming(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.mode() === 'sequence') {
      this.configChange.emit({ interval: +value });
    } else {
      this.configChange.emit({ duration: +value });
    }
  }
}
