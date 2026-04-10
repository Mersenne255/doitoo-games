import {
  Component,
  inject,
  HostListener,
  OnInit,
  OnDestroy,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-popup',
  standalone: true,
  template: `
    <div class="backdrop" (click)="onBackdrop($event)" role="dialog" aria-modal="true">
      <div class="panel" #panel>
        <p class="message">{{ svc.options().message }}</p>
        <div class="actions">
          <button class="btn cancel" (click)="svc.dismiss()">
            {{ svc.options().cancelLabel || 'Cancel' }}
          </button>
          @if (svc.options().secondaryLabel) {
            <button class="btn cancel" (click)="svc.secondary()">
              {{ svc.options().secondaryLabel }}
              @if (svc.options().secondarySubLabel) {
                <span class="btn-sub">{{ svc.options().secondarySubLabel }}</span>
              }
            </button>
          }
          <button class="btn confirm" #confirmBtn
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
    }

    .cancel {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }
    .cancel:hover { background: rgba(255, 255, 255, 0.1); }

    .btn-sub {
      display: block;
      font-size: 0.6rem;
      font-weight: 400;
      opacity: 0.7;
      margin-top: 0.1rem;
    }

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
export class ConfirmPopupComponent implements OnInit, OnDestroy {
  readonly svc = inject(ConfirmService);
  private readonly elRef = inject(ElementRef);
  private readonly confirmBtnRef = viewChild<ElementRef>('confirmBtn');
  private readonly panelRef = viewChild<ElementRef>('panel');
  private inertTarget: HTMLElement | null = null;

  constructor() {
    // Auto-focus the confirm button after render
    afterNextRender(() => {
      const btn = this.confirmBtnRef()?.nativeElement;
      if (btn) btn.focus();
    });
  }

  ngOnInit(): void {
    const main = document.querySelector('main');
    if (main) {
      main.setAttribute('inert', '');
      this.inertTarget = main;
    }
  }

  ngOnDestroy(): void {
    if (this.inertTarget) {
      this.inertTarget.removeAttribute('inert');
      this.inertTarget = null;
    }
  }

  onBackdrop(event: MouseEvent): void {
    const panel = this.panelRef()?.nativeElement;
    if (panel && !panel.contains(event.target as Node)) {
      this.svc.dismiss();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.svc.dismiss();
      return;
    }
    // Focus trap: Tab cycles within the panel only
    if (event.key === 'Tab') {
      const el = this.elRef.nativeElement as HTMLElement;
      const focusable = el.querySelectorAll<HTMLElement>('button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }
}
