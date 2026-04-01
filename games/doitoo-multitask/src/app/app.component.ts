import { Component, ChangeDetectionStrategy, HostListener, inject } from '@angular/core';
import { GameService } from './services/game.service';
import { MultitaskShellComponent } from './components/multitask-shell/multitask-shell.component';

@Component({
  selector: 'app-multitask',
  standalone: true,
  imports: [MultitaskShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly game = inject(GameService);

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
