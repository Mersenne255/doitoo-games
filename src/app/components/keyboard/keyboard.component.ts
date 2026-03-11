import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-keyboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="keyboard" [class.disabled]="disabled()">
      @for (key of keys; track key) {
        <button (click)="onKey(key)">{{ key }}</button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .keyboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      width: 100%;
      max-width: 320px;
      transition: opacity 0.2s ease;
    }

    button {
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'Inter', system-ui, sans-serif;
      padding: 0.9rem;
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
      backdrop-filter: blur(4px);
    }

    button:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0) scale(0.97);
      background: rgba(255, 255, 255, 0.08);
    }

    .disabled {
      opacity: 0.3;
      pointer-events: none;
    }
  `],
})
export class KeyboardComponent {
  readonly keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

  disabled = input<boolean>(false);
  keyPress = output<string>();

  onKey(key: string): void {
    this.keyPress.emit(key);
  }
}
