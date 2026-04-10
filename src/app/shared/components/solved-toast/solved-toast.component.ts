import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-solved-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="toast">{{ text() }}</div>`,
  styles: [`
    .toast {
      position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
      z-index: 30; pointer-events: none;
      font-size: 2rem; font-weight: 800;
      color: #86efac;
      text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
      animation: toast-pop 1.8s ease forwards;
    }
    @keyframes toast-pop {
      0% { opacity: 0; transform: translateX(-50%) scale(0.8); }
      15% { opacity: 1; transform: translateX(-50%) scale(1.05); }
      30% { transform: translateX(-50%) scale(1); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
  `],
})
export class SolvedToastComponent {
  text = input('Correct');
}
