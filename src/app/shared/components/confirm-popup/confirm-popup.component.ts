import { Component, inject, HostListener } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-popup',
  standalone: true,
  template: `
    <div class="backdrop" (click)="onBackdrop($event)" role="dialog" aria-modal="true">
      <div class="panel">
        <p class="message">{{ svc.options().message }}</p>
        <div class="actions">
          <button class="btn cancel" (click)="svc.dismiss()">
            {{ svc.options().cancelLabel || 'Cancel' }}
          </button>
          @if (svc.options().secondaryLabel) {
            <button class="btn confirm"
              [class.danger]="svc.options().secondaryColor === 'danger'"
              [class.primary]="svc.options().secondaryColor !== 'danger'"
              (click)="svc.secondary()">
              {{ svc.options().secondaryLabel }}
            </button>
          }
          <button class="btn confirm"
            [class.danger]="svc.options().confirmColor === 'danger'"
            [class.primary]="svc.options().confirmColor !== 'danger'"
            (click)="svc.accept()">
            {{ svc.options().confirmLabel || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      padding: 1rem;
      animation: fade-in 0.15s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .panel {
      background: rgba(20, 20, 40, 0.97);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 320px;
      width: 90%;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      animation: slide-up 0.2s ease;
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message {
      margin: 0 0 1.25rem;
      color: #e2e8f0;
      font-size: 0.95rem;
      font-weight: 500;
      text-align: center;
      line-height: 1.4;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .btn {
      flex: 1 1 40%;
      min-width: 0;
      padding: 0.6rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
    }

    .cancel {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
    .cancel:hover { background: rgba(255, 255, 255, 0.1); }

    .confirm.primary {
      border: 1px solid rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }
    .confirm.primary:hover { background: rgba(99, 102, 241, 0.35); }

    .confirm.danger {
      border: 1px solid rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }
    .confirm.danger:hover { background: rgba(239, 68, 68, 0.35); }
  `],
})
export class ConfirmPopupComponent {
  readonly svc = inject(ConfirmService);

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      this.svc.dismiss();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.svc.dismiss();
  }
}
