import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { NBackConfig, DEFAULT_CONFIG, ModalityType, StimulusIntensity, MODALITY_LABELS, INTENSITY_OPTIONS } from '../../models/game.models';

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

  canUncheck = computed(() => this.config().activeModalities.length > 1);

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
    const num = Math.max(1, Math.min(+el.value, 10));
    el.value = String(num);
    this.configChange.emit({ stepDuration: num });
  }

  onStepCount(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(5, Math.min(+el.value, 1000));
    el.value = String(num);
    this.configChange.emit({ stepCount: num });
  }

  readonly intensityOptions = INTENSITY_OPTIONS;

  onIntensity(intensity: StimulusIntensity): void {
    this.configChange.emit({ intensity });
  }

  private static readonly CANONICAL_ORDER: ModalityType[] = ['spatial', 'shape', 'color', 'auditory'];

  toggleModality(modality: ModalityType): void {
    const current = this.config().activeModalities;
    const isActive = current.includes(modality);

    if (isActive) {
      if (current.length <= 1) return; // keep at least one
      this.configChange.emit({ activeModalities: current.filter(m => m !== modality) });
    } else {
      const updated = [...current, modality];
      updated.sort((a, b) =>
        ConfigComponent.CANONICAL_ORDER.indexOf(a) - ConfigComponent.CANONICAL_ORDER.indexOf(b)
      );
      this.configChange.emit({ activeModalities: updated });
    }
  }

  onColorCount(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.value === '') return;
    const num = Math.max(2, Math.min(+el.value, 10));
    el.value = String(num);
    this.configChange.emit({ colorCount: num });
  }

  readonly modalityIcons: Record<ModalityType, string> = {
    spatial: 'assets/icons/nback/position.svg',
    auditory: 'assets/icons/nback/auditory.svg',
    color: 'assets/icons/nback/color.svg',
    shape: 'assets/icons/nback/shape.svg',
  };

  isModalityActive(modality: ModalityType): boolean {
    return this.config().activeModalities.includes(modality);
  }

  modalityIcon(modality: ModalityType): string {
    return this.modalityIcons[modality];
  }

  modalityLabel(modality: ModalityType): string {
    return MODALITY_LABELS[modality];
  }
}
