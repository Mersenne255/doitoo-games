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
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.scss',
})
export class CountdownComponent implements OnDestroy {
  done = output<void>();
  count = signal(3);

  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    afterNextRender(() => {
      this.timeouts.push(
        setTimeout(() => this.count.set(2), 1000),
        setTimeout(() => this.count.set(1), 2000),
        setTimeout(() => this.done.emit(), 3000),
      );
    });
  }

  ngOnDestroy(): void {
    for (const id of this.timeouts) {
      clearTimeout(id);
    }
    this.timeouts.length = 0;
  }
}
