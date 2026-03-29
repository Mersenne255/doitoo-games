import { Component, ChangeDetectionStrategy, HostListener, inject } from '@angular/core';
import { GameService } from './services/game.service';
import { AudioService } from './services/audio.service';
import { GridComponent } from './components/grid/grid.component';
import { MatchButtonsComponent } from './components/match-buttons/match-buttons.component';
import { ConfigComponent } from './components/config/config.component';
import { SummaryComponent } from './components/summary/summary.component';
import { HistoryComponent } from './components/history/history.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import packageJson from '../../package.json';

@Component({
  selector: 'app-game',
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
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameService);
  readonly audio = inject(AudioService);
  readonly version = packageJson.version;

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const stage = this.game.stage();

    if (stage === 'playing') {
      const keyMap: Record<string, number> = { a: 0, s: 1, d: 2, f: 3 };
      const index = keyMap[event.key.toLowerCase()];
      if (index !== undefined) {
        const modalities = this.game.config().activeModalities;
        if (index < modalities.length) {
          this.game.pressMatch(modalities[index]);
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
