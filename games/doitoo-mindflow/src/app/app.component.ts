import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit } from '@angular/core';
import { GameService } from './services/game.service';
import { StorageService } from './services/storage.service';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { SummaryComponent } from './components/summary/summary.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [ConfigPanelComponent, CountdownComponent, GameBoardComponent, SummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (game.stage() === 'idle') {
      <app-config-panel />
    }
    @if (game.stage() === 'countdown') {
      <app-countdown (done)="game.onCountdownDone()" />
    }
    @if (game.stage() === 'playing') {
      <app-game-board />
    }
    @if (game.stage() === 'summary') {
      <app-summary />
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
    }
  `],
})
export class AppComponent implements OnInit {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);

  ngOnInit(): void {
    const saved = this.storage.loadConfig();
    this.game.updateConfig(saved);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();
    if (stage === 'playing' && event.key === 'Escape') {
      this.game.abortSession();
    } else if (stage === 'idle' && event.key === 'Enter') {
      this.game.startSession();
    }
  }
}
