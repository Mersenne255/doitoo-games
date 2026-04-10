import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { GameService } from './services/game.service';
import { StorageService } from './services/storage.service';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { SummaryComponent } from './components/summary/summary.component';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-sudoku-game',
  standalone: true,
  imports: [ConfigPanelComponent, GameBoardComponent, SummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (game.stage() === 'idle') {
      <app-config-panel />
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
      height: 100%;
    }
  `],
})
export class SudokuGameComponent implements OnInit, OnDestroy {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  private readonly nav = inject(NavService);

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      if (stage === 'idle') {
        this.nav.show();
      } else {
        this.nav.hide();
      }
    });
  }

  ngOnInit(): void {
    // Try to restore a saved game first
    if (!this.game.restoreSession()) {
      const saved = this.storage.loadConfig();
      this.game.updateConfig(saved);
    }
  }

  ngOnDestroy(): void {
    // Persist state if playing, then clean up
    if (this.game.stage() === 'playing' && !this.game.solved()) {
      this.game.persistState();
    }
    this.game.stage.set('idle');
    this.nav.show();
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
