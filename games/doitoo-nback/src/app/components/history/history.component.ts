import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SessionRecord, MODALITY_LABELS, ModalityType, StimulusIntensity } from '../../models/game.models';

interface DisplayRow {
  record: SessionRecord;
  date: string;
  time: string;
  score: string;
  nLevel: string;
  grid: string;
  steps: string;
  intensity: string;
  modalities: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent {
  history = input<SessionRecord[]>([]);
  clearHistory = output<void>();

  private readonly DITTO = '〃';

  sortedHistory = computed(() =>
    [...this.history()].sort((a, b) => b.timestamp - a.timestamp)
  );

  averageScore = computed(() => {
    const h = this.sortedHistory();
    const last10 = h.slice(0, 10);
    if (last10.length === 0) return null;
    return last10.reduce((sum, r) => sum + r.overallPercentage, 0) / last10.length;
  });

  private static readonly MOD_ABBREV: Record<ModalityType, string> = {
    spatial: 'P',
    auditory: 'A',
    color: 'C',
    shape: 'S',
  };

  private static readonly INTENSITY_SHORT: Record<StimulusIntensity, string> = {
    low: 'Low',
    medium: 'Med',
    high: 'High',
  };

  displayRows = computed<DisplayRow[]>(() => {
    const sorted = this.sortedHistory();
    return sorted.map((record, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const d = new Date(record.timestamp);
      const nStr = `N${record.nLevel}`;
      const gridStr = `${record.gridSize}×${record.gridSize}`;
      const stepsStr = `${record.stepCount}`;
      const intStr = HistoryComponent.INTENSITY_SHORT[record.intensity];
      const modStr = record.activeModalities.map(m => HistoryComponent.MOD_ABBREV[m]).join('');

      return {
        record,
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        time: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
        score: `${Math.round(record.overallPercentage)}%`,
        nLevel: prev && prev.nLevel === record.nLevel ? this.DITTO : nStr,
        grid: prev && prev.gridSize === record.gridSize ? this.DITTO : gridStr,
        steps: prev && prev.stepCount === record.stepCount ? this.DITTO : stepsStr,
        intensity: prev && prev.intensity === record.intensity ? this.DITTO : intStr,
        modalities: prev && this.sameModalities(prev, record) ? this.DITTO : modStr,
      };
    });
  });

  private sameModalities(a: SessionRecord, b: SessionRecord): boolean {
    if (a.activeModalities.length !== b.activeModalities.length) return false;
    return a.activeModalities.every((m, i) => m === b.activeModalities[i]);
  }
}
