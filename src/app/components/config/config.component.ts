import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { GameMode, Config } from '../../models/game.models';

@Component({
  selector: 'app-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
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
