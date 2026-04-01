import { Component, ChangeDetectionStrategy, HostListener, inject, effect, OnDestroy } from '@angular/core';
import { GameService } from './services/game.service';
import { AudioService } from './services/audio.service';
import { GridComponent } from './components/grid/grid.component';
import { MatchButtonsComponent } from './components/match-buttons/match-buttons.component';
import { ConfigComponent } from './components/config/config.component';
import { SummaryComponent } from './components/summary/summary.component';
import { HistoryComponent } from './components/history/history.component';
import { CountdownComponent } from '../../shared/components/countdown/countdown.component';
import { ModalityType, MODALITY_KEYS } from './models/game.models';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-nback-game',
  standalone: true,
  imports: [
    GridComponent,
    MatchButtonsComponent,
    ConfigComponent,
    SummaryComponent,
    HistoryComponent,
    CountdownComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nback-game.component.html',
  styleUrl: './nback-game.component.scss',
})
export class NbackGameComponent implements OnDestroy {
  readonly game = inject(GameService);
  readonly audio = inject(AudioService);
  private readonly nav = inject(NavService);

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      if (stage === 'playing') {
        this.nav.hide();
      } else if (stage === 'idle' || stage === 'summary') {
        this.nav.show();
      }
    });
  }

  ngOnDestroy(): void {
    this.nav.show();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();

    if (stage === 'playing') {
      // Fixed key-to-modality mapping (doesn't change with selection)
      const key = event.key.toLowerCase();
      const keyToModality = Object.entries(MODALITY_KEYS).find(([, k]) => k === key);
      if (keyToModality) {
        const modality = keyToModality[0] as ModalityType;
        if (this.game.config().activeModalities.includes(modality)) {
          this.game.pressMatch(modality);
        }
      }
      if (event.key === 'Escape') {
        this.game.abortSession();
      }
    } else if (stage === 'idle') {
      if (event.key === 'Enter') {
        this.game.startSession();
      }
    }
  }

  onDismissSummary(): void {
    this.game.goToIdle();
  }
}
