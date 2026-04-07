import {
  Component,
  inject,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { GameInfoService } from '../../services/game-info.service';

@Component({
  selector: 'app-game-info-popup',
  standalone: true,
  template: `
    <div
      class="backdrop"
      (click)="onBackdropClick($event)"
      (keydown.escape)="close()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="gameInfo.gameTitle() + ' info'"
    >
      <div class="panel" #panel>
        <div class="panel-header">
          @if (gameInfo.titleImage()) {
            <img class="title-image" [src]="gameInfo.titleImage()" [alt]="gameInfo.gameTitle()" />
          }
          <h2 class="panel-title">{{ gameInfo.gameTitle() }}</h2>
          <button
            class="close-btn"
            (click)="close()"
            aria-label="Close info popup"
          >×</button>
        </div>
        <div class="panel-content" [innerHTML]="gameInfo.content()"></div>
        @if (gameInfo.loading()) {
          <div class="loading">Loading…</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      padding: 1rem;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .panel {
      position: relative;
      width: 100%;
      max-width: 520px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      background: rgba(20, 20, 40, 0.97);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 16px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1);
      animation: slide-up 0.25s ease;
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(99, 102, 241, 0.12);
      flex-shrink: 0;
    }

    .title-image {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .panel-title {
      margin: 0;
      flex: 1;
      font-size: 1.15rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 1.4rem;
      line-height: 1;
      color: #94a3b8;
      background: none;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: color 0.2s;
      flex-shrink: 0;
    }

    .close-btn:hover {
      color: #f1f5f9;
    }

    .panel-content {
      padding: 1rem 1.25rem 1.5rem;
      overflow-y: auto;
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .panel-content ::ng-deep h3 {
      margin: 0 0 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .panel-content ::ng-deep ul {
      margin: 0 0 1.25rem;
      padding-left: 1.25rem;
    }

    .panel-content ::ng-deep li {
      margin-bottom: 0.4rem;
    }

    .panel-content ::ng-deep li strong {
      color: #e2e8f0;
    }

    .panel-content ::ng-deep p {
      margin: 0 0 0.75rem;
    }

    .panel-content ::ng-deep section.mechanics {
      border-top: 1px solid rgba(99, 102, 241, 0.1);
      padding-top: 1rem;
    }

    .panel-content ::ng-deep section.minigames {
      border-top: 1px solid rgba(99, 102, 241, 0.1);
      padding-top: 1rem;
    }

    .panel-content ::ng-deep section.minigames h4 {
      margin: 0.75rem 0 0.25rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .panel-content ::ng-deep section.minigames h4:first-of-type {
      margin-top: 0;
    }

    .panel-content ::ng-deep section.references {
      border-top: 1px solid rgba(99, 102, 241, 0.1);
      padding-top: 1rem;
      margin-top: 0.5rem;
    }

    .panel-content ::ng-deep section.references ol {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .panel-content ::ng-deep section.references li {
      margin-bottom: 0.35rem;
    }

    .loading {
      padding: 2rem;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }
  `],
})
export class GameInfoPopupComponent {
  readonly gameInfo = inject(GameInfoService);
  private readonly elRef = inject(ElementRef);
  private readonly panelRef = viewChild<ElementRef>('panel');

  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      this.previouslyFocused = document.activeElement as HTMLElement;
      this.trapFocusInit();
    });
  }

  close(): void {
    this.gameInfo.close();
    this.previouslyFocused?.focus();
  }

  onBackdropClick(event: MouseEvent): void {
    const panel = this.panelRef()?.nativeElement;
    if (panel && !panel.contains(event.target as Node)) {
      this.close();
    }
  }

  private trapFocusInit(): void {
    const el = this.elRef.nativeElement as HTMLElement;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableEls = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
}
