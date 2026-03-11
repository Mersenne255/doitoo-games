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
        [result]="game.result()"
        [numberLength]="game.config().numberLength" />

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
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
    }
    h1 {
      margin: 0;
      text-align: center;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      gap: 1.5rem;
      max-width: 500px;
      margin: 0 auto;
    }
    .start-button {
      text-align: center;
      width: 100%;
    }
    .start-button button {
      width: 100%;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }
    .start-button button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }
    .start-button button:active:not(:disabled) {
      transform: translateY(0);
    }
    .start-button button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
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
