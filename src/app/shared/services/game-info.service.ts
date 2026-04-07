import { inject, Injectable, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Strips the leading `/` from a route string to produce a game ID.
 * e.g. `/nback` → `nback`, `multitask` → `multitask`
 */
export function routeToGameId(route: string): string {
  return route.startsWith('/') ? route.slice(1) : route;
}

@Injectable({ providedIn: 'root' })
export class GameInfoService {
  private readonly sanitizer = inject(DomSanitizer);

  readonly isOpen = signal(false);
  readonly gameId = signal<string | null>(null);
  readonly gameTitle = signal('');
  readonly titleImage = signal<string | null>(null);
  readonly content = signal<SafeHtml>('');
  readonly loading = signal(false);

  /** Opens the popup for the given game. No-op if already open. */
  open(gameId: string, gameTitle: string, titleImage?: string): void {
    if (this.isOpen()) {
      return;
    }

    this.isOpen.set(true);
    this.gameId.set(gameId);
    this.gameTitle.set(gameTitle);
    this.titleImage.set(titleImage ?? null);
    this.loading.set(true);
    this.content.set('');

    fetch(`assets/game-info/${gameId}.html`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load game info: ${res.status}`);
        }
        return res.text();
      })
      .then((html) => {
        this.content.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.loading.set(false);
      })
      .catch(() => {
        this.content.set(this.sanitizer.bypassSecurityTrustHtml('<p>Info not available.</p>'));
        this.loading.set(false);
      });
  }

  /** Closes the popup and resets all state. */
  close(): void {
    this.isOpen.set(false);
    this.gameId.set(null);
    this.gameTitle.set('');
    this.titleImage.set(null);
    this.content.set('');
    this.loading.set(false);
  }
}
