import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { GameService } from './services/game.service';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-polyomino-game',
  standalone: true,
  imports: [ConfigPanelComponent, GameBoardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (game.isGenerating()) {
      <div class="generating-overlay">
        <span class="generating-text">Generating board...</span>
      </div>
    }
    @if (game.stage() === 'idle' && !game.isGenerating()) {
      <app-config-panel />
    }
    @if (game.stage() === 'playing') {
      <app-game-board />
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .generating-overlay {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; gap: 1.5rem;
    }
    .generating-text {
      color: #a5b4fc; font-size: 1.2rem; font-weight: 600;
      animation: pulse 1s ease-in-out infinite alternate;
    }
    @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }
    .abort-gen-btn {
      padding: 0.5rem 1.5rem; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0.35rem; background: rgba(255,255,255,0.04);
      color: #94a3b8; font-size: 0.85rem; cursor: pointer;
    }
    .abort-gen-btn:hover { background: rgba(255,255,255,0.08); }
  `],
})
export class PolyominoGameComponent implements OnInit, OnDestroy {
  readonly game = inject(GameService);
  private readonly nav = inject(NavService);

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      const generating = this.game.isGenerating();
      (stage === 'idle' && !generating) ? this.nav.show() : this.nav.hide();
    });
  }

  ngOnInit(): void {
    this.game.loadConfig();

    if (this.game.restoreSession()) {
      this.game.stage.set('playing');
    }
  }

  ngOnDestroy(): void {
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
