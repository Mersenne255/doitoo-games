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

  disabled = input<boolean>(false);

  modeChange = output<GameMode>();
  configChange = output<Partial<Config>>();

  onNumberLength(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(1, Math.min(+el.value, 30));
    el.value = String(num);
    this.configChange.emit({ numberLength: num });
  }

  onTiming(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(1, Math.min(+el.value, 100000));
    el.value = String(num);
    if (this.mode() === 'sequence') {
      this.configChange.emit({ interval: num });
    } else {
      this.configChange.emit({ duration: num });
    }
  }
}
