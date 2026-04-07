import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { Puzzle } from '../../models/game.models';
import { generateExplanation } from '../../utils/explanation.util';

@Component({
  selector: 'app-explanation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.enter)': 'next.emit()',
  },
  template: `
    <div class="explanation-panel">
      <div class="entries">
        @for (entry of explanationData().entries; track $index) {
          <div class="entry">
            <div class="entry-header">
              <span class="dot" [style.background]="entry.highlightColor"></span>
              <span class="direction-label">{{
                entry.direction === 'row-wise' ? 'Row pattern' : 'Column pattern'
              }}</span>
            </div>
            <p class="description">{{ entry.description }}</p>
          </div>
        }
      </div>
      <button class="next-btn" (click)="next.emit()">Next</button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .explanation-panel {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 1rem;
      padding: 1rem;
      backdrop-filter: blur(10px);
    }

    .entries {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .entry {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .entry-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .direction-label {
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .description {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.85rem;
      line-height: 1.4;
      padding-left: 1.25rem;
    }

    .next-btn {
      width: 100%;
      padding: 0.75rem 3rem;
      border: 1px solid rgba(34, 197, 94, 0.5);
      border-radius: 0.5rem;
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 0.25rem;

      &:hover { background: rgba(34, 197, 94, 0.35); }
    }
  `],
})
export class ExplanationComponent {
  readonly puzzle = input.required<Puzzle>();
  readonly next = output<void>();

  readonly explanationData = computed(() => generateExplanation(this.puzzle()));
}
