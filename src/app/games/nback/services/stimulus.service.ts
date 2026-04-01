import { Injectable, inject } from '@angular/core';
import { AudioService } from './audio.service';
import { GeneratedSequence, NBackConfig, Stimulus, MatchFlags } from '../models/game.models';

export interface StepCallbacks {
  onStepStart(index: number, stimulus: Stimulus, matchFlags: MatchFlags): void;
  onStepEnd(index: number): void;
  onSessionEnd(): void;
}

@Injectable({ providedIn: 'root' })
export class StimulusService {
  private readonly audio = inject(AudioService);
  private aborted = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Run a full session, calling callbacks for each step. */
  async runSession(
    sequence: GeneratedSequence,
    config: NBackConfig,
    callbacks: StepCallbacks,
  ): Promise<void> {
    this.aborted = false;
    this.audio.resetFallback();

    const { stimuli, matchFlags } = sequence;
    const stepDurationMs = config.stepDuration * 1000;
    const gapMs = 200;

    for (let i = 0; i < stimuli.length; i++) {
      if (this.aborted) return;

      // Start step
      callbacks.onStepStart(i, stimuli[i], matchFlags[i]);

      // Play audio if auditory modality is active
      if (config.activeModalities.includes('auditory')) {
        this.audio.speak(stimuli[i].letter);
      }

      // Wait for step duration
      await this.wait(stepDurationMs);
      if (this.aborted) return;

      // End step
      callbacks.onStepEnd(i);

      // Gap between steps (except after last step)
      if (i < stimuli.length - 1) {
        await this.wait(gapMs);
        if (this.aborted) return;
      }
    }

    if (!this.aborted) {
      callbacks.onSessionEnd();
    }
  }

  /** Abort the current session. */
  abort(): void {
    this.aborted = true;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        resolve();
      }, ms);
    });
  }
}
