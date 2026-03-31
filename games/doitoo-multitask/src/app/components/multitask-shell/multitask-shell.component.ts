import { Component, ChangeDetectionStrategy, inject, OnDestroy, viewChild, ElementRef, effect } from '@angular/core';
import { GameService } from '../../services/game.service';
import { SlotComponent } from '../slot/slot.component';
import { ConfigPanelComponent } from '../config-panel/config-panel.component';

import { CountdownComponent } from '../countdown/countdown.component';

@Component({
  selector: 'app-multitask-shell',
  standalone: true,
  imports: [SlotComponent, ConfigPanelComponent, CountdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (game.stage() === 'countdown') {
      <app-countdown (done)="game.beginPlaying()" />
    }

    @switch (game.stage()) {
      @case ('idle') {
        <div class="config-container">
          <app-config-panel />
        </div>
      }
    }

    @if (game.stage() === 'playing' || game.stage() === 'summary') {
      <div class="playing-container">
        @if (game.stage() === 'playing') {
          <div class="difficulty-indicator">Lv {{ game.currentDifficulty() }}</div>
          <button class="abort-fab" (click)="game.abortSession()" title="Abort (Esc)">
            ✕
          </button>
        }
        <div class="slot-grid" #slotGrid [class.frozen]="game.stage() === 'summary'">
          @for (slot of game.activeSlots(); track slot.index) {
            <app-slot class="slot" [slotIndex]="slot.index" />
          }
        </div>
        @if (game.stage() === 'summary') {
          <div class="summary-bar" [class.collapsed]="summaryCollapsed">
            @if (!summaryCollapsed) {
              <div class="summary-content">
                <div class="summary-stats">
                  <div class="stat">
                    <span class="stat-label">Time</span>
                    <span class="stat-value">{{ game.sessionElapsedSec() }}s</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Level</span>
                    <span class="stat-value">{{ game.maxDifficultyReached() }}</span>
                  </div>
                </div>
                <div class="summary-actions">
                  <button class="back-btn" (click)="game.dismissSummary()">Back</button>
                  <button class="again-btn" (click)="game.playAgain()">Again</button>
                </div>
              </div>
            }
            <button class="summary-toggle" (click)="summaryCollapsed = !summaryCollapsed"
              [attr.title]="summaryCollapsed ? 'Show results' : 'Hide results'">
              <span class="toggle-icon" [class.flipped]="summaryCollapsed">‹</span>
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 1rem;
      gap: 1rem;
    }

    .config-container {
      max-width: 500px;
      width: 100%;
      margin: 0 auto;
    }

    .playing-container {
      position: fixed;
      inset: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      touch-action: none;
    }

    .slot-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
      min-height: 0;
      padding: 0.5rem;
      justify-content: center;      
      height: 100%;
      overflow: hidden;
      touch-action: none;
      align-items: center;
    }

    .slot{
      height: 100%;
      width: 100%;
    }

    @media (min-aspect-ratio: 1/1) {
      .slot-grid {
        flex-direction: row;
        align-items: stretch;
        margin: auto 0;
        .slot{
          margin: auto 0;          
        }
      }
    }

    .difficulty-indicator {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 10;
      padding: 0.2rem 0.5rem;
      border-radius: 0.4rem;
      background: rgba(15, 15, 26, 0.85);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      font-size: 0.75rem;
      font-weight: 700;
      backdrop-filter: blur(4px);
    }

    .abort-fab {
      position: fixed;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 10;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, border-color 0.2s;
      backdrop-filter: blur(4px);

      &:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.6);
      }
    }

    .slot-grid.frozen {
      pointer-events: none;
    }

    .summary-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 10;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      background: rgba(15, 15, 26, 0.94);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255,255,255,0.08);
      transition: transform 0.25s ease;
    }

    .summary-bar.collapsed {
      transform: translateY(100%);
    }

    .summary-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem;
    }

    .summary-toggle {
      background: rgba(15, 15, 26, 0.94);
      border: none;
      border-left: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      color: #64748b;
      font-size: 1rem;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .summary-bar.collapsed .summary-toggle {
      position: fixed;
      bottom: 0; right: 0;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.4rem 0 0 0;
      padding: 0.3rem 0.5rem;
      backdrop-filter: blur(10px);
    }

    .summary-toggle:hover { color: #94a3b8; }

    .toggle-icon {
      display: inline-block;
      transition: transform 0.25s;
    }
    .toggle-icon.flipped {
      transform: rotate(180deg);
    }

    .summary-stats {
      display: flex; gap: 2rem; justify-content: center;
    }

    .stat {
      display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
    }

    .stat-label {
      font-size: 0.6rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: #64748b;
    }

    .stat-value {
      font-size: 1.25rem; font-weight: 800; color: #e2e8f0;
      letter-spacing: -0.02em;
    }

    .summary-actions {
      display: flex; gap: 0.75rem; width: 100%; max-width: 20rem;
    }

    .back-btn, .again-btn {
      flex: 1;
      padding: 0.6rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600; font-size: 0.9rem;
      cursor: pointer; transition: background 0.2s;
      outline: none; text-align: center;
    }

    .back-btn {
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
      &:hover { background: rgba(255,255,255,0.12); }
    }

    .again-btn {
      border: 1px solid rgba(34, 197, 94, 0.5);
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      &:hover { background: rgba(34, 197, 94, 0.35); }
    }
  `],
})
export class MultitaskShellComponent implements OnDestroy {
  readonly game = inject(GameService);
  summaryCollapsed = false;

  private readonly slotGrid = viewChild<ElementRef<HTMLElement>>('slotGrid');
  private preventTouch = (e: TouchEvent) => e.preventDefault();
  private boundEl: HTMLElement | null = null;

  private touchEffect = effect(() => {
    const ref = this.slotGrid();
    const el = ref?.nativeElement ?? null;
    if (el === this.boundEl) return;
    // Unbind old
    if (this.boundEl) {
      this.boundEl.removeEventListener('touchstart', this.preventTouch);
      this.boundEl.removeEventListener('touchmove', this.preventTouch);
    }
    // Bind new
    this.boundEl = el;
    if (el) {
      el.addEventListener('touchstart', this.preventTouch, { passive: false });
      el.addEventListener('touchmove', this.preventTouch, { passive: false });
    }
  });

  ngOnDestroy(): void {
    if (this.boundEl) {
      this.boundEl.removeEventListener('touchstart', this.preventTouch);
      this.boundEl.removeEventListener('touchmove', this.preventTouch);
      this.boundEl = null;
    }
  }
}
