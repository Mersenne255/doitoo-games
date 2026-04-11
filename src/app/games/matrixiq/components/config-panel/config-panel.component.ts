import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { StorageService } from '../../services/storage.service';
import {
  SpeedMode,
  RuleType,
  PatternDimension,
  RuleDirection,
  RULE_TYPES,
  DIMENSIONS,
  DebugOverrides,
} from '../../models/game.models';
import { NumberSliderComponent } from '../../../../shared/components/number-slider/number-slider.component';

@Component({
  selector: 'app-config-panel',
  standalone: true,
  imports: [NumberSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config-panel">
      <div class="config-card">
        <app-number-slider label="Difficulty" [value]="game.config().difficulty"
          [min]="1" [max]="100" (valueChange)="onDifficulty($event)" />

        <app-number-slider label="Puzzles" [value]="game.config().puzzleCount"
          [min]="5" [max]="30" (valueChange)="onPuzzleCount($event)" />

        <label class="section-label">Speed</label>
        <div class="button-group">
          @for (s of speeds; track s) {
            <button [class.active]="game.config().speedMode === s"
              (click)="onSpeed(s)">{{ s }}</button>
          }
        </div>
      </div>

      <!-- Debug overrides -->
      <div class="config-card">
        <label class="section-label">🔧 Debug: Rule Type</label>
        <div class="button-group wrap">
          <button [class.active]="!overrides.ruleType" (click)="setRuleType(null)">auto</button>
          @for (rt of ruleTypes; track rt) {
            <button [class.active]="overrides.ruleType === rt" (click)="setRuleType(rt)">{{ rt }}</button>
          }
        </div>

        <label class="section-label">🔧 Debug: Dimension</label>
        <div class="button-group wrap">
          <button [class.active]="!overrides.dimension" (click)="setDimension(null)">auto</button>
          @for (d of dimensions; track d) {
            <button [class.active]="overrides.dimension === d" (click)="setDimension(d)">{{ d }}</button>
          }
        </div>

        <label class="section-label">🔧 Debug: Direction</label>
        <div class="button-group wrap">
          <button [class.active]="!overrides.direction" (click)="setDirection(null)">auto</button>
          <button [class.active]="overrides.direction === 'row-wise'" (click)="setDirection('row-wise')">row</button>
          <button [class.active]="overrides.direction === 'column-wise'" (click)="setDirection('column-wise')">col</button>
        </div>

        <label class="section-label">🔧 Debug: Rule Count</label>
        <div class="button-group wrap">
          <button [class.active]="!overrides.ruleCount" (click)="setRuleCount(null)">auto</button>
          @for (n of [1,2,3,4,5,6]; track n) {
            <button [class.active]="overrides.ruleCount === n" (click)="setRuleCount(n)">{{ n }}</button>
          }
        </div>
      </div>

      <button class="start-btn" (click)="game.startSession()">Start</button>
    </div>
  `,
  styleUrl: './config-panel.component.scss',
})
export class ConfigPanelComponent implements OnInit {
  readonly game = inject(GameService);
  private readonly storage = inject(StorageService);
  readonly speeds: SpeedMode[] = ['relaxed', 'standard', 'intense'];
  readonly ruleTypes: RuleType[] = [...RULE_TYPES];
  readonly dimensions: PatternDimension[] = [...DIMENSIONS];

  overrides: DebugOverrides = {
    ruleType: null,
    dimension: null,
    direction: null,
    ruleCount: null,
  };

  ngOnInit(): void {
    const saved = this.game.config().debugOverrides;
    if (saved) {
      this.overrides = { ...saved };
    }
  }

  onDifficulty(value: number): void {
    this.game.updateConfig({ difficulty: value });
    this.storage.saveConfig(this.game.config());
  }

  onPuzzleCount(value: number): void {
    this.game.updateConfig({ puzzleCount: value });
    this.storage.saveConfig(this.game.config());
  }

  onSpeed(speed: SpeedMode): void {
    this.game.updateConfig({ speedMode: speed });
    this.storage.saveConfig(this.game.config());
  }

  setRuleType(rt: RuleType | null): void {
    this.overrides = { ...this.overrides, ruleType: rt };
    this.applyOverrides();
  }

  setDimension(d: PatternDimension | null): void {
    this.overrides = { ...this.overrides, dimension: d };
    this.applyOverrides();
  }

  setDirection(dir: RuleDirection | null): void {
    this.overrides = { ...this.overrides, direction: dir };
    this.applyOverrides();
  }

  setRuleCount(n: number | null): void {
    this.overrides = { ...this.overrides, ruleCount: n };
    this.applyOverrides();
  }

  private applyOverrides(): void {
    const hasAny = this.overrides.ruleType || this.overrides.dimension ||
                   this.overrides.direction || this.overrides.ruleCount;
    this.game.updateConfig({
      debugOverrides: hasAny ? { ...this.overrides } : null,
    });
    this.storage.saveConfig(this.game.config());
  }
}
