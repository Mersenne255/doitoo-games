import { Component, ChangeDetectionStrategy, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-number-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="section-label">{{ label() }}</label>
    <div class="slider-row">
      <input type="range" [min]="min()" [max]="max()" [step]="step()"
        [value]="value()" (input)="onSliderInput($event)"
        [attr.aria-label]="ariaLabel() || label()" />
      @if (editing()) {
        <input type="number" class="range-input"
          [min]="min()" [max]="max()" [step]="step()"
          [value]="value()"
          (blur)="onInputBlur($event)"
          (keydown.enter)="onInputConfirm($event)"
          (keydown.escape)="cancelEdit()"
          #numberInput />
      } @else {
        <span class="range-value" (click)="startEdit()"
          role="button" tabindex="0"
          (keydown.enter)="startEdit()"
          [attr.aria-label]="'Click to edit ' + label()">
          {{ displayValue() }}
        </span>
      }
    </div>
    <ng-content />
  `,
  styleUrl: './number-slider.component.scss',
})
export class NumberSliderComponent {
  // Required inputs
  label = input.required<string>();
  value = input.required<number>();
  min = input.required<number>();
  max = input.required<number>();

  // Optional inputs
  step = input<number>(1);
  ariaLabel = input<string>();
  displayFn = input<(value: number) => string>();

  // Output
  valueChange = output<number>();

  // Internal state
  editing = signal(false);
  private previousValue = 0;

  // ViewChild for auto-focus
  private numberInputRef = viewChild<ElementRef<HTMLInputElement>>('numberInput');

  // Auto-focus effect
  private focusEffect = effect(() => {
    const ref = this.numberInputRef();
    if (ref) {
      ref.nativeElement.focus();
      ref.nativeElement.select();
    }
  });

  // Computed display value
  displayValue = computed(() => {
    const fn = this.displayFn();
    const val = this.value();
    return fn ? fn(val) : String(val);
  });

  onSliderInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  startEdit(): void {
    this.previousValue = this.value();
    this.editing.set(true);
  }

  onInputBlur(event: Event): void {
    this.validateAndEmit(event);
  }

  onInputConfirm(event: Event): void {
    event.preventDefault();
    this.validateAndEmit(event);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  private validateAndEmit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    const parsed = parseFloat(raw);

    if (raw === '' || isNaN(parsed)) {
      this.editing.set(false);
      return;
    }

    const minVal = this.min();
    const maxVal = this.max();
    const stepVal = this.step();

    // Clamp to [min, max]
    let clamped = Math.max(minVal, Math.min(parsed, maxVal));

    // Snap to nearest step from min
    if (stepVal > 0) {
      clamped = minVal + Math.round((clamped - minVal) / stepVal) * stepVal;
      // Clamp again after snapping (can overshoot)
      clamped = Math.min(clamped, maxVal);
    }

    // Round to avoid floating point issues
    const decimals = (stepVal.toString().split('.')[1] || '').length;
    clamped = parseFloat(clamped.toFixed(decimals));

    this.editing.set(false);

    if (clamped !== this.previousValue) {
      this.valueChange.emit(clamped);
    }
  }
}
