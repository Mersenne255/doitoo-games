import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavService } from './shared/services/nav.service';
import { GameInfoService, routeToGameId } from './shared/services/game-info.service';
import { GameInfoPopupComponent } from './shared/components/game-info-popup/game-info-popup.component';
import { BUILD_INFO } from '../environments/build-info';
import { GAME_LIST } from './home/game-list';

const GAME_ROUTE_MAP = new Map(GAME_LIST.map(g => [g.route, g]));

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, GameInfoPopupComponent],
  template: `
    <nav class="nav-bar" [class.nav-hidden]="nav.hidden()" role="navigation">
      <div class="nav-inner">
        @if (isGameRoute()) {
          <a class="back-button" routerLink="/" aria-label="Back to game selector">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5"/><path d="M19 9.5V19a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1V9.5"/></svg>
          </a>
        }
        <div class="nav-brand">
          <img class="nav-logo" src="assets/doitoo-games.svg" alt="Doitoo Games" />
          @if (isGameRoute()) {
            <span class="nav-subtitle">{{ gameTitle() }}</span>
          }
        </div>
        @if (isGameRoute()) {
          <button class="info-button" (click)="openGameInfo()" aria-label="Game info">
            <img src="assets/icons/info-icon.svg" alt="Info" class="info-icon" />
          </button>
        }
      </div>
    </nav>
    <main [class.full-height]="nav.hidden()">
      <router-outlet />
    </main>
    @if (!isGameRoute()) {
      <footer class="app-footer">
        <img class="footer-brain" src="assets/icons/doitoo-brain.svg" alt="Doitoo Brain" />
        <span class="footer-meta">v{{ buildInfo.version }} · {{ buildInfo.buildTime }} · {{ buildInfo.gitHash }}</span>
      </footer>
    }
    @if (gameInfo.isOpen()) {
      <app-game-info-popup />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
    }

    main {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }

    .nav-bar {
      flex-shrink: 0;
      z-index: 100;
      display: flex;
      justify-content: center;
      padding: 0.4rem 1rem;
      background: rgba(15, 15, 26, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(99, 102, 241, 0.15);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .nav-bar.nav-hidden {
      display: none;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: 100%;
      max-width: 600px;
    }

    .nav-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: padding 0.2s ease;
    }

    .back-button:not(.hidden) ~ .nav-brand {
      padding: 0 45px;
    }

    .nav-logo {
      height: 22px;
      width: auto;
      max-width: 100%;
      flex-shrink: 0;
    }

    .nav-subtitle {
      font-size: 0.65rem;
      font-weight: 500;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .back-button {
      position: absolute;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      color: #c7d2fe;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      flex-shrink: 0;
      text-decoration: none;
    }

    .back-button:hover {
      background: rgba(99, 102, 241, 0.25);
      border-color: rgba(99, 102, 241, 0.5);
    }

    .back-button svg {
      width: 18px;
      height: 18px;
    }

    .info-button {
      position: absolute;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }

    .info-button:hover {
      opacity: 0.7;
    }

    .info-icon {
      width: 20px;
      height: 20px;
      filter: brightness(0) invert(0.75);
    }

    .full-height {
      min-height: 0;
    }

    .nav-hidden ~ main.full-height {
      min-height: 0;
    }

    .app-footer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.2rem 1rem 0.6rem 1rem;
      background: rgba(15, 15, 26, 0.9);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(99, 102, 241, 0.15);
    }

    .footer-brain {
      height: 40px;
      width: auto;
      color: #fff;
      filter: brightness(0) invert(1);
    }

    .footer-meta {
      font-size: 0.6rem;
      color: var(--color-text-dim, #64748b);
      letter-spacing: 0.02em;
    }
  `],
})
export class AppComponent {
  readonly nav = inject(NavService);
  readonly gameInfo = inject(GameInfoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly buildInfo = BUILD_INFO;
  readonly isGameRoute = signal(false);
  readonly gameTitle = signal('');
  private readonly currentRoute = signal('');
  private readonly gameIcon = signal('');

  constructor() {
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        const game = GAME_ROUTE_MAP.get(url);
        this.isGameRoute.set(!!game);
        this.gameTitle.set(game?.name ?? '');
        this.currentRoute.set(url);
        this.gameIcon.set(game?.icon ?? '');

        // Always show nav on route change; games hide it themselves during gameplay
        this.nav.show();
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  openGameInfo(): void {
    this.gameInfo.open(routeToGameId(this.currentRoute()), this.gameTitle(), this.gameIcon());
  }
}
