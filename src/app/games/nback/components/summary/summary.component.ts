import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SessionResult, MODALITY_LABELS, ModalityType } from '../../models/game.models';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.scss',
})
export class SummaryComponent {
  sessionResult = input<SessionResult | null>(null);

  playAgain = output<void>();
  dismiss = output<void>();
  acceptSuggestion = output<void>();
  dismissSuggestion = output<void>();

  showDetails = signal(false);

  readonly MODALITY_LABELS = MODALITY_LABELS;

  toggleDetails(): void {
    this.showDetails.update(v => !v);
  }

  getModalityLabel(modality: ModalityType): string {
    return MODALITY_LABELS[modality];
  }
}
