import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { GameMode, ModeConfig } from '../../models/game.models';

@Component({
  selector: 'app-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
})
export class ConfigComponent {
  mode = input<GameMode>('sequence');
  config = input<ModeConfig>({ numberLength: 8, timing: 1 });

  disabled = input<boolean>(false);

  modeChange = output<GameMode>();
  configChange = output<Partial<ModeConfig>>();

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
    const num = Math.max(0.1, Math.min(+el.value, 100));
    el.value = String(num);
    this.configChange.emit({ timing: num });
  }
}
