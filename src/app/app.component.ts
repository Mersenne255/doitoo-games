import { Component, ChangeDetectionStrategy, HostListener, inject } from '@angular/core';
import { GameService } from './services/game.service';
import { DisplayComponent } from './components/display/display.component';
import { KeyboardComponent } from './components/keyboard/keyboard.component';
import { ConfigComponent } from './components/config/config.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [DisplayComponent, KeyboardComponent, ConfigComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameService);

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();

    if (stage === 'input') {
      if (/^[0-9]$/.test(event.key)) {
        this.game.appendDigit(event.key);
      } else if (event.key === 'Enter') {
        this.game.confirm();
      } else if (event.key === 'Backspace') {
        this.game.deleteLast();
      }
    } else if (stage === 'result' || stage === 'idle') {
      if (event.key === 'Enter') {
        this.game.startGame();
      }
    }
  }

  onVirtualKey(key: string): void {
    const stage = this.game.stage();
    if (stage === 'input') {
      if (key === 'del') {
        this.game.deleteLast();
      } else if (key === 'ok') {
        this.game.confirm();
      } else if (/^[0-9]$/.test(key)) {
        this.game.appendDigit(key);
      }
    } else if (stage === 'result' || stage === 'idle') {
      if (key === 'ok') {
        this.game.startGame();
      }
    }
  }
}
