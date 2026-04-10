import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'danger' | 'primary';
  secondaryLabel?: string;
  secondaryColor?: 'danger' | 'primary';
}

export type ConfirmResult = 'confirm' | 'secondary' | 'cancel';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly isOpen = signal(false);
  readonly options = signal<ConfirmOptions>({ message: '' });

  private resolve: ((result: ConfirmResult) => void) | null = null;

  confirm(opts: ConfirmOptions): Promise<ConfirmResult> {
    this.options.set(opts);
    this.isOpen.set(true);
    return new Promise<ConfirmResult>(res => {
      this.resolve = res;
    });
  }

  accept(): void {
    this.isOpen.set(false);
    this.resolve?.('confirm');
    this.resolve = null;
  }

  secondary(): void {
    this.isOpen.set(false);
    this.resolve?.('secondary');
    this.resolve = null;
  }

  dismiss(): void {
    this.isOpen.set(false);
    this.resolve?.('cancel');
    this.resolve = null;
  }
}
