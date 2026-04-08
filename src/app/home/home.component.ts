import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_LIST, TAGLINES, GameEntry } from './game-list';
import { GameInfoService, routeToGameId } from '../shared/services/game-info.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <p class="tagline">{{ tagline }}</p>
    <section class="game-selector">
      @for (game of games; track game.route) {
        <a class="game-card" [routerLink]="game.route">
          <button class="card-info-btn"
                  (click)="openInfo($event, game)"
                  [attr.aria-label]="'Info about ' + game.name">
            <img src="assets/icons/info-icon.svg" alt="Info" class="card-info-icon" />
          </button>
          <img class="card-icon" [src]="game.icon" [alt]="game.name + ' icon'" />
          <span class="card-name">{{ game.name }}</span>
          <span class="card-label">{{ game.label }}</span>
          <span class="card-description">{{ game.description }}</span>
        </a>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .tagline {
      text-align: center;
      max-width: 600px;
      margin: 0.75rem auto 0;
      padding: 0 1rem;
      font-size: 0.95rem;
      font-weight: 500;
      font-style: italic;
      letter-spacing: 0.04em;
      background: linear-gradient(90deg, #64748b 0%, #cbd5e1 45%, #f8fafc 50%, #cbd5e1 55%, #64748b 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: tagline-shine 8s ease-in-out infinite;
    }

    @keyframes tagline-shine {
      0%, 100% { background-position: 100% 0; }
      50% { background-position: -100% 0; }
    }

    .game-selector {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      padding: 1.25rem 1rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .game-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 0.75rem;
      background: rgba(30, 30, 60, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.12);
      border-radius: 14px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      text-align: center;
      text-decoration: none;
      color: inherit;
    }

    .game-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow:
        0 8px 24px rgba(99, 102, 241, 0.15),
        0 0 0 1px rgba(99, 102, 241, 0.1);
    }

    .game-card:active {
      transform: translateY(-1px);
    }

    .card-icon {
      width: 48px;
      height: 48px;
      object-fit: cover;
    }

    .card-name {
      font-size: 1rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .card-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #818cf8;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
    }

    .card-description {
      font-size: 0.8rem;
      line-height: 1.4;
      color: #94a3b8;
    }

    .card-info-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: none;
      border: none;
      cursor: pointer;
      transition: opacity 0.2s;
      z-index: 1;
    }

    .card-info-btn:hover {
      opacity: 0.7;
    }

    .card-info-icon {
      width: 16px;
      height: 16px;
      filter: brightness(0) invert(0.6);
    }
  `],
})
export class HomeComponent {
  private readonly gameInfo = inject(GameInfoService);
  readonly games = GAME_LIST;
  readonly tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  openInfo(event: Event, game: GameEntry): void {
    event.stopPropagation();
    event.preventDefault();
    this.gameInfo.open(routeToGameId(game.route), game.name, game.icon);
  }
}
