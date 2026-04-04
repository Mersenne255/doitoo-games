import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavService {
  readonly hidden = signal(false);

  hide(): void {
    this.hidden.set(true);
  }

  show(): void {
    this.hidden.set(false);
  }
}
