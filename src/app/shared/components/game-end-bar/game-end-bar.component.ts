import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';

@Component({
  selector: 'app-game-end-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="end-bar">
      <!-- Collapsible content area -->
      <div class="end-info" [class.collapsed]="collapsed()">
        <ng-content></ng-content>
      </div>
      <!-- Always-visible buttons row with toggle -->
      <div class="end-row">
        <div class="end-actions">
          <button class="back-btn" (click)="back.emit()">Back</button>
          <button class="again-btn" (click)="again.emit()">Again</button>
        </div>
        <button class="collapse-toggle" (click)="collapsed.set(!collapsed())">
          <span class="toggle-arrow" [class.flipped]="collapsed()">▾</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .end-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.5rem 1rem;
      display: flex; flex-direction: column; align-items: center;
    }
    .end-info {
      display: flex; align-items: center; justify-content: center; gap: 0.75rem;
      width: 100%; max-width: 600px;
      overflow: hidden; max-height: 4rem;
      transition: max-height 0.25s ease, opacity 0.25s ease, margin 0.25s ease;
      opacity: 1; margin-bottom: 0.4rem;
    }
    .end-info.collapsed {
      max-height: 0; opacity: 0; margin-bottom: 0;
    }
    .end-row {
      display: flex; align-items: center; gap: 0.5rem;
      width: 100%; max-width: 600px; justify-content: center;
    }
    .end-actions { display: flex; gap: 0.75rem; }
    .collapse-toggle {
      width: 1.75rem; height: 1.75rem;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 0.25rem;
      background: rgba(255,255,255,0.04); color: #94a3b8; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; margin-left: 0.25rem;
      &:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
    }
    .toggle-arrow {
      display: inline-block; transition: transform 0.25s;
    }
    .toggle-arrow.flipped { transform: rotate(180deg); }
    .back-btn {
      padding: 0.5rem 1.5rem; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.35rem; background: rgba(255,255,255,0.04);
      color: #94a3b8; font-weight: 600; cursor: pointer;
      &:hover { background: rgba(255,255,255,0.08); }
    }
    .again-btn {
      padding: 0.5rem 1.5rem; border: 1px solid rgba(34,197,94,0.5);
      border-radius: 0.35rem; background: rgba(34,197,94,0.2);
      color: #86efac; font-weight: 600; cursor: pointer;
      &:hover { background: rgba(34,197,94,0.35); }
    }
  `],
})
export class GameEndBarComponent {
  back = output<void>();
  again = output<void>();
  collapsed = signal(false);
}
