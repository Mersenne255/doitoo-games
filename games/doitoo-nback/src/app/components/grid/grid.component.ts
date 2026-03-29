import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { ShapeType } from '../../models/game.models';

@Component({
  selector: 'app-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
})
export class GridComponent {
  gridSize = input(3);
  activeCell = input<number | null>(null);
  cellColor = input<string | null>(null);
  cellShape = input<ShapeType | null>(null);
  fallbackLetter = input<string | null>(null);

  cells = computed(() => {
    const size = this.gridSize();
    return Array.from({ length: size * size }, (_, i) => i);
  });
}
