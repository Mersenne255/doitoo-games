import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { GameStage } from '../../models/game.models';

@Component({
  selector: 'app-keyboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './keyboard.component.html',
  styleUrl: './keyboard.component.scss',
})
export class KeyboardComponent {
  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', '⨯'];

  disabled = input<boolean>(false);
  showStart = input<boolean>(false);
  stage = input<GameStage>('idle');
  keyPress = output<string>();
  startGame = output<void>();
  abort = output<void>();

  onKey(key: string): void {
    this.keyPress.emit(key);
  }

  onStartOrAbort(): void {
    if (this.stage() === 'showing') {
      this.abort.emit();
    } else {
      this.startGame.emit();
    }
  }
}
