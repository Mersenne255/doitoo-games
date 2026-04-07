import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'doitoo:favorites';
const FILTER_KEY = 'doitoo:favorites-filter';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _favorites = signal<Set<string>>(this.load());
  readonly favorites = this._favorites.asReadonly();
  readonly filterOn = signal(this.loadFilter());

  toggleFavorite(route: string): void {
    const next = new Set(this._favorites());
    if (next.has(route)) {
      next.delete(route);
    } else {
      next.add(route);
    }
    this._favorites.set(next);
    this.save(next);
  }

  toggleFilter(): void {
    this.filterOn.update(v => {
      const next = !v;
      this.saveFilter(next);
      return next;
    });
  }

  isFavorite(route: string): boolean {
    return this._favorites().has(route);
  }

  private load(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((v: unknown) => typeof v === 'string'));
        }
      }
    } catch { /* ignore */ }
    return new Set();
  }

  private save(favorites: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    } catch { /* ignore */ }
  }

  private loadFilter(): boolean {
    try {
      return localStorage.getItem(FILTER_KEY) === 'true';
    } catch { return false; }
  }

  private saveFilter(on: boolean): void {
    try {
      localStorage.setItem(FILTER_KEY, String(on));
    } catch { /* ignore */ }
  }
}
