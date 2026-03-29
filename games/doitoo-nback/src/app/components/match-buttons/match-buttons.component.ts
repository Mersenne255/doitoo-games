import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { ModalityType, ResponseClass, MODALITY_LABELS, MODALITY_KEYS } from '../../models/game.models';

@Component({
  selector: 'app-match-buttons',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-buttons.component.html',
  styleUrl: './match-buttons.component.scss',
})
export class MatchButtonsComponent {
  modalities = input<ModalityType[]>([]);
  disabled = input(false);
  pressedThisStep = input<Set<ModalityType>>(new Set());
  feedback = input<Map<ModalityType, ResponseClass>>(new Map());

  matchPress = output<ModalityType>();

  readonly labels = MODALITY_LABELS;
  readonly keys = MODALITY_KEYS;

  getFeedbackClass(modality: ModalityType): string {
    const fb = this.feedback().get(modality);
    if (!fb) return '';
    switch (fb) {
      case 'hit': return 'fb-hit';
      case 'miss': return 'fb-miss';
      case 'false_alarm': return 'fb-false-alarm';
      default: return '';
    }
  }
}
