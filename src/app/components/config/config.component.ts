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
    :host {
      display: block;
      width: 100%;
    }

    .config {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      padding: 1.25rem;
      backdrop-filter: blur(10px);
    }
    label {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    button {
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      padding: 0.5rem 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }
    button:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    button.active {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      border-color: transparent;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
    }
    .center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flex-column {
      flex-direction: column;
      gap: 0.5rem;
    }
    .mode-buttons {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      justify-content: center;
    }
    input[type='number'] {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      color: #e2e8f0;
      font-size: 0.9rem;
      font-family: 'Inter', system-ui, sans-serif;
      outline: none;
      transition: border-color 0.15s ease;
    }
    input[type='number']:focus {
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
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
