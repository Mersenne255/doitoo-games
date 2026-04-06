import { Component, ChangeDetectionStrategy, HostListener, inject, OnDestroy } from '@angular/core';
import { GameService } from './services/game.service';
import { DisplayComponent } from './components/display/display.component';
import { KeyboardComponent } from './components/keyboard/keyboard.component';
import { ConfigComponent } from './components/config/config.component';

@Component({
  selector: 'app-numbers-game',
  standalone: true,
  imports: [DisplayComponent, KeyboardComponent, ConfigComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './numbers-game.component.html',
  styleUrl: './numbers-game.component.scss',
})
export class NumbersGameComponent implements OnDestroy {
  readonly game = inject(GameService);

  ngOnDestroy(): void {
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();

    if (stage === 'showing') {
      if (event.key === 'Enter') {
        this.game.confirm();
      }
    } else if (stage === 'input') {
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
    if (stage === 'showing') {
      if (key === 'ok') {
        this.game.confirm();
      }
    } else if (stage === 'input') {
      if (key === 'del') {
        this.game.deleteLast();
      } else if (key === '⨯') {
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
