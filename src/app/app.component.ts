import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavService } from './shared/services/nav.service';

const ROUTE_TITLES: Record<string, string> = {
  '/numbers': 'Short-term memory',
  '/nback': 'Working memory',
  '/multitask': 'Multitask',
  '/mindflow': 'Context-switching',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
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
      </div>
    </nav>
    <main [class.full-height]="nav.hidden()">
      <router-outlet />
    </main>
  `,
  styles: [`
    .nav-bar {
      position: sticky;
      top: 0;
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
      transform: translateY(-100%);
      opacity: 0;
      pointer-events: none;
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

    .full-height {
      min-height: calc(100vh - var(--nav-height));
    }

    .nav-hidden ~ main.full-height {
      min-height: 100vh;
    }
  `],
})
export class AppComponent {
  readonly nav = inject(NavService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isGameRoute = signal(false);
  readonly gameTitle = signal('');

  constructor() {
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        const title = ROUTE_TITLES[url];
        this.isGameRoute.set(!!title);
        this.gameTitle.set(title ?? '');

        if (url === '/') {
          this.nav.show();
        }
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
