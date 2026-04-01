import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { GameService } from '../../services/game.service';
import { MathEquationsComponent } from '../minigames/math-equations/math-equations.component';
import { CometComponent } from '../minigames/comet/comet.component';
import { AlikeComponent } from '../minigames/alike/alike.component';
import { MatcherComponent } from '../minigames/matcher/matcher.component';
import { MinigameResult, MathEquationsConfig, CometConfig } from '../../models/game.models';

@Component({
  selector: 'app-slot',
  standalone: true,
  imports: [MathEquationsComponent, CometComponent, AlikeComponent, MatcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (slotConfig().minigameId) {
      @case ('math-equations') {
        <app-math-equations
          [config]="$any(slotConfig()!.config)"
          [active]="true"
          [slotIndex]="slotIndex()"
          (completed)="onMinigameComplete($event)"
        />
      }
      @case ('comet') {
        <app-comet
          [config]="$any(slotConfig()!.config)"
          [active]="true"
          [slotIndex]="slotIndex()"
          (completed)="onMinigameComplete($event)"
        />
      }
      @case ('alike') {
        <app-alike
          [config]="$any(slotConfig()!.config)"
          [active]="true"
          [slotIndex]="slotIndex()"
          (completed)="onMinigameComplete($event)"
        />
      }
      @case ('matcher') {
        <app-matcher
          [config]="$any(slotConfig()!.config)"
          [active]="true"
          [slotIndex]="slotIndex()"
          (completed)="onMinigameComplete($event)"
        />
      }
      @default {
        <div class="placeholder">No minigame</div>
      }
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      max-width: 400px;
      max-height: 500px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 0.75rem;
      background: rgba(15, 15, 26, 0.8);
      min-height: 0;
      overflow: hidden;
      touch-action: none;
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #64748b;
      font-style: italic;
    }
  `],
})
export class SlotComponent {
  readonly game = inject(GameService);
  readonly slotIndex = input.required<number>();

  readonly slotConfig = computed(() => this.game.slotConfigs()[this.slotIndex()]);

  onMinigameComplete(result: MinigameResult): void {
    this.game.reportSlotComplete(result);
  }
}
