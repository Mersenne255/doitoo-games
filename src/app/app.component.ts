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
  template: `
    <div class="container">
      <h1><span class="brand">Doitoo</span> Numbers</h1>

      <app-display
        [displayValue]="game.displayValue()"
        [inputValue]="game.inputValue()"
        [stage]="game.stage()"
        [result]="game.result()" />

      <app-keyboard
        [disabled]="game.stage() !== 'input'"
        (keyPress)="onVirtualKey($event)" />

      <div class="start-button">
        <button class="active" [disabled]="game.stage() === 'showing'" (click)="game.startGame()">Start Game</button>
      </div>

      <app-config
        [mode]="game.mode()"
        [config]="game.config()"
        (modeChange)="game.setMode($event)"
        (configChange)="game.updateConfig($event)" />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
    }
    h1 {
      margin: 0;
      text-align: center;
    }
    .brand {
      color: #2563eb;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }
    .start-button {
      text-align: center;
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
    button:disabled {
      filter: opacity(0.5);
    }
  `],
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
