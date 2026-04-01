import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  signal,
  output,
  afterNextRender,
} from '@angular/core';

@Component({
  selector: 'app-countdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay">
      @switch (step()) {
        @case (0) { <div class="word">Ready</div> }
        @case (1) { <div class="word">Steady</div> }
        @case (2) { <div class="word go">Go!</div> }
      }
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
    }
    .overlay {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
    }
    @keyframes zoom-in {
      from { transform: scale(0.7); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .word {
      font-size: 3rem;
      font-weight: 900;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-shadow: 0 0 40px rgba(99,102,241,0.8), 0 0 80px rgba(99,102,241,0.4);
      animation: zoom-in 0.3s ease-out both;
    }
    .word.go {
      color: #22c55e;
      text-shadow: 0 0 40px rgba(34,197,94,0.8), 0 0 80px rgba(34,197,94,0.4);
    }
  `],
})
export class CountdownComponent implements OnDestroy {
  done = output<void>();
  step = signal(0);

  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    afterNextRender(() => {
      this.timeouts.push(
        setTimeout(() => this.step.set(1), 500),
        setTimeout(() => this.step.set(2), 1000),
        setTimeout(() => this.done.emit(), 1500),
      );
    });
  }

  ngOnDestroy(): void {
    for (const id of this.timeouts) clearTimeout(id);
    this.timeouts.length = 0;
  }
}
