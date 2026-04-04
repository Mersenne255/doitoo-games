import { Component, ChangeDetectionStrategy, HostListener, inject, effect, OnDestroy } from '@angular/core';
import { GameService } from './services/game.service';
import { MultitaskShellComponent } from './components/multitask-shell/multitask-shell.component';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-multitask',
  standalone: true,
  imports: [MultitaskShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './multitask-game.component.html',
  styleUrl: './multitask-game.component.scss',
})
export class MultitaskGameComponent implements OnDestroy {
  readonly game = inject(GameService);
  private readonly nav = inject(NavService);

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      if (stage === 'playing' || stage === 'countdown') {
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
    if (stage === 'idle' && event.key === 'Enter') {
      this.game.startSession();
    } else if (stage === 'playing' && event.key === 'Escape') {
      this.game.abortSession();
    }
  }
}
