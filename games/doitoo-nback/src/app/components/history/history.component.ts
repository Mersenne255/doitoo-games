import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SessionRecord, MODALITY_LABELS, ModalityType } from '../../models/game.models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent {
  history = input<SessionRecord[]>([]);

  clearHistory = output<void>();

  sortedHistory = computed(() =>
    [...this.history()].sort((a, b) => b.timestamp - a.timestamp)
  );

  averageScore = computed(() => {
    const h = this.sortedHistory();
    const last10 = h.slice(0, 10);
    if (last10.length === 0) return null;
    return last10.reduce((sum, r) => sum + r.overallPercentage, 0) / last10.length;
  });

  getModalityLabels(modalities: ModalityType[]): string {
    return modalities.map(m => MODALITY_LABELS[m]).join(', ');
  }
}
