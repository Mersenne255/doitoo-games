import { Component, ChangeDetectionStrategy, HostListener, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { GameService } from './services/game.service';
import { StorageService } from './services/storage.service';
import { ConfigPanelComponent } from './components/config-panel/config-panel.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { SummaryComponent } from './components/summary/summary.component';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-voxel-game',
  standalone: true,
  imports: [ConfigPanelComponent, GameBoardComponent, SummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (game.stage() === 'idle') {
      <app-config-panel />
    }
    @if (game.stage() === 'studying' || game.stage() === 'building' || game.stage() === 'comparison') {
      <app-game-board />
    }
    @if (game.stage() === 'summary') {
      <app-summary />
    }
  `,
  styles: [`:host { display: block; height: 100%; }`],
})
export class VoxelGameComponent implements OnInit, OnDestroy {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  private readonly nav = inject(NavService);

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      stage === 'idle' ? this.nav.show() : this.nav.hide();
    });
  }

  ngOnInit(): void {
    this.game.updateConfig(this.storage.loadConfig());
  }

  ngOnDestroy(): void {
    this.game.abortSession();
    this.nav.show();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();
    if (['studying', 'building', 'comparison'].includes(stage) && event.key === 'Escape') {
      this.game.abortSession();
    } else if (stage === 'idle' && event.key === 'Enter') {
      this.game.startSession();
    }
  }
}
