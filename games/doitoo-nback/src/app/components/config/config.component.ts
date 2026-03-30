import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { NBackConfig, DEFAULT_CONFIG, ModalityType, StimulusIntensity, MODALITY_LABELS } from '../../models/game.models';

@Component({
  selector: 'app-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
})
export class ConfigComponent {
  config = input<NBackConfig>(DEFAULT_CONFIG);
  disabled = input(false);

  configChange = output<Partial<NBackConfig>>();

  isColorActive = computed(() => this.config().activeModalities.includes('color'));

  canUncheck = computed(() => this.config().activeModalities.length > 2);

  onGridSize(size: number): void {
    this.configChange.emit({ gridSize: size });
  }

  onNLevel(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(1, Math.min(+el.value, 20));
    el.value = String(num);
    this.configChange.emit({ nLevel: num });
  }

  onStepDuration(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(1, Math.min(+el.value, 6));
    el.value = String(num);
    this.configChange.emit({ stepDuration: num });
  }

  onStepCount(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(20, Math.min(+el.value, 50));
    el.value = String(num);
    this.configChange.emit({ stepCount: num });
  }

  onIntensity(intensity: StimulusIntensity): void {
    this.configChange.emit({ intensity });
  }

  onModalityToggle(modality: ModalityType, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.config().activeModalities;

    if (checked) {
      this.configChange.emit({ activeModalities: [...current, modality] });
    } else if (current.length > 2) {
      this.configChange.emit({ activeModalities: current.filter(m => m !== modality) });
    } else {
      // Prevent unchecking — re-check the box
      (event.target as HTMLInputElement).checked = true;
    }
  }

  onColorCount(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(2, Math.min(+el.value, 10));
    el.value = String(num);
    this.configChange.emit({ colorCount: num });
  }

  isModalityActive(modality: ModalityType): boolean {
    return this.config().activeModalities.includes(modality);
  }

  modalityLabel(modality: ModalityType): string {
    return MODALITY_LABELS[modality];
  }
}
