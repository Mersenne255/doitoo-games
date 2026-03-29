import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { ModalityType, MODALITY_LABELS, MODALITY_KEYS } from '../../models/game.models';

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

  matchPress = output<ModalityType>();

  readonly labels = MODALITY_LABELS;
  readonly keys = MODALITY_KEYS;
}
