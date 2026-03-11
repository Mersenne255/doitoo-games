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
    .keyboard {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      justify-content: center;
    }

    button {
      font-size: 1.25rem;
      padding: 1rem;
      background: #4b5563;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    .disabled {
      filter: opacity(0.5);
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
