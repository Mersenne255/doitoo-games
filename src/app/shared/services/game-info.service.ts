import { Injectable, signal } from '@angular/core';

/**
 * Strips the leading `/` from a route string to produce a game ID.
 * e.g. `/nback` → `nback`, `multitask` → `multitask`
 */
export function routeToGameId(route: string): string {
  return route.startsWith('/') ? route.slice(1) : route;
}

@Injectable({ providedIn: 'root' })
export class GameInfoService {
  readonly isOpen = signal(false);
  readonly gameId = signal<string | null>(null);
  readonly gameTitle = signal('');
  readonly titleImage = signal<string | null>(null);

  /** Opens the popup for the given game. No-op if already open. */
  open(gameId: string, gameTitle: string, titleImage?: string): void {
    if (this.isOpen()) {
      return;
    }

    this.isOpen.set(true);
    this.gameId.set(gameId);
    this.gameTitle.set(gameTitle);
    this.titleImage.set(titleImage ?? null);
  }

  /** Closes the popup and resets all state. */
  close(): void {
    this.isOpen.set(false);
    this.gameId.set(null);
    this.gameTitle.set('');
    this.titleImage.set(null);
  }
}
