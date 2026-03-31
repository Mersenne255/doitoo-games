import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import {
  GameStage,
  ModalityType,
  NBackConfig,
  Stimulus,
  MatchFlags,
  ResponseClass,
  ModalityScore,
  SessionResult,
  SessionRecord,
  GeneratedSequence,
} from '../models/game.models';
import { StorageService } from './storage.service';
import { StimulusService } from './stimulus.service';
import { AudioService } from './audio.service';
import { generateSequence } from '../utils/stimulus-generator.util';
import { validateConfig } from '../utils/config-validation.util';
import {
  classifyResponse,
  calculateModalityScore,
  calculateSessionResult,
} from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService);
  private readonly stimulusService = inject(StimulusService);
  private readonly audioService = inject(AudioService);

  // ── Signals ──
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<NBackConfig> = signal<NBackConfig>(this.storage.loadConfig());
  readonly currentStepIndex: WritableSignal<number> = signal(-1);
  readonly currentStimulus: WritableSignal<Stimulus | null> = signal(null);
  readonly currentMatchFlags: WritableSignal<MatchFlags | null> = signal(null);
  readonly pressedThisStep: WritableSignal<Set<ModalityType>> = signal(new Set());
  readonly stepFeedback: WritableSignal<Map<ModalityType, ResponseClass>> = signal(new Map());
  readonly sessionResult: WritableSignal<SessionResult | null> = signal(null);
  readonly history: WritableSignal<SessionRecord[]> = signal(this.storage.loadHistory());

  // ── Computed ──
  readonly showAudioFallback = computed(
    () => this.config().activeModalities.includes('auditory') && !this.audioService.isAvailable(),
  );

  readonly progress = computed(
    () => `${this.currentStepIndex() + 1} / ${this.config().stepCount}`,
  );

  // ── Private state ──
  private sequence: GeneratedSequence | null = null;
  private stepClassifications = new Map<number, Map<ModalityType, ResponseClass>>();

  // ── Public methods ──

  /** Transition to countdown and generate the stimulus sequence. */
  startSession(): void {
    this.stage.set('countdown');
    this.sequence = generateSequence(this.config());
    this.stepClassifications = new Map();
    this.sessionResult.set(null);
    window.parent?.postMessage({ type: 'HIDE_NAV' }, '*');
  }

  /** Called by CountdownComponent when the 3-2-1 countdown finishes. */
  beginPlaying(): void {
    if (!this.sequence) return;

    this.stage.set('playing');

    const seq = this.sequence;
    const cfg = this.config();

    this.stimulusService.runSession(seq, cfg, {
      onStepStart: (index, stimulus, matchFlags) => {
        this.currentStepIndex.set(index);
        this.currentStimulus.set(stimulus);
        this.currentMatchFlags.set(matchFlags);
        this.pressedThisStep.set(new Set());
        this.stepFeedback.set(new Map());
      },

      onStepEnd: (index) => {
        const flags = seq.matchFlags[index];
        const pressed = this.pressedThisStep();
        const classifications = new Map<ModalityType, ResponseClass>();

        for (const modality of cfg.activeModalities) {
          classifications.set(
            modality,
            classifyResponse(flags[modality], pressed.has(modality)),
          );
        }

        this.stepClassifications.set(index, classifications);

        // Merge: keep existing immediate feedback, add miss (yellow) for unpressed matches
        const fb = new Map(this.stepFeedback());
        for (const modality of cfg.activeModalities) {
          if (!fb.has(modality)) {
            const cls = classifications.get(modality)!;
            if (cls === 'miss') {
              fb.set(modality, cls);
            }
          }
        }
        this.stepFeedback.set(fb);

        // Clear stimulus during the gap so there's a visible blink between steps
        this.currentStimulus.set(null);
        this.currentMatchFlags.set(null);
      },

      onSessionEnd: () => {
        this.finishSession();
      },
    });
  }

  /** Record a match button press for the given modality (idempotent per step). */
  pressMatch(modality: ModalityType): void {
    if (this.stage() !== 'playing') return;

    const current = this.pressedThisStep();
    if (current.has(modality)) return;

    const next = new Set(current);
    next.add(modality);
    this.pressedThisStep.set(next);

    // Immediate feedback: green (hit) or red (false_alarm)
    const flags = this.currentMatchFlags();
    if (flags) {
      const result = classifyResponse(flags[modality], true);
      const fb = new Map(this.stepFeedback());
      fb.set(modality, result);
      this.stepFeedback.set(fb);
    }
  }

  /** Abort the current session and return to idle without recording. */
  abortSession(): void {
    this.stimulusService.abort();
    this.resetPlayingState();
    this.stage.set('idle');
    window.parent?.postMessage({ type: 'SHOW_NAV' }, '*');
  }

  /** Accept the N-level suggestion from the session result. */
  acceptSuggestion(): void {
    const result = this.sessionResult();
    if (result?.nLevelSuggestion != null) {
      const updated = { ...this.config(), nLevel: result.nLevelSuggestion };
      this.config.set(updated);
      this.storage.saveConfig(updated);
      this.sessionResult.set({ ...result, nLevelSuggestion: null });
    }
  }

  /** Dismiss the N-level suggestion without applying it. */
  dismissSuggestion(): void {
    const result = this.sessionResult();
    if (result) {
      this.sessionResult.set({ ...result, nLevelSuggestion: null });
    }
  }

  /** Update config with partial values, validate, and persist. */
  updateConfig(partial: Partial<NBackConfig>): void {
    const merged = validateConfig({ ...this.config(), ...partial });
    this.config.set(merged);
    this.storage.saveConfig(merged);
  }

  /** Transition back to idle (e.g. dismiss summary). */
  goToIdle(): void {
    this.stage.set('idle');
  }

  /** Clear all session history. */
  clearHistory(): void {
    this.history.set([]);
    this.storage.clearHistory();
  }

  // ── Private helpers ──

  private finishSession(): void {
    const cfg = this.config();
    const totalSteps = cfg.stepCount;

    const modalityScores: ModalityScore[] = cfg.activeModalities.map((modality) => {
      const classifications: ResponseClass[] = [];
      for (let i = 0; i < totalSteps; i++) {
        const stepMap = this.stepClassifications.get(i);
        if (stepMap?.has(modality)) {
          classifications.push(stepMap.get(modality)!);
        }
      }
      return calculateModalityScore(modality, classifications, totalSteps);
    });

    const result = calculateSessionResult(modalityScores, cfg.nLevel);
    this.sessionResult.set(result);

    const record: SessionRecord = {
      timestamp: Date.now(),
      nLevel: cfg.nLevel,
      activeModalities: [...cfg.activeModalities],
      gridSize: cfg.gridSize,
      stepCount: cfg.stepCount,
      intensity: cfg.intensity,
      modalityScores: result.modalityScores,
      overallPercentage: result.overallPercentage,
    };

    const updatedHistory = [record, ...this.history()];
    this.history.set(updatedHistory);
    this.storage.saveHistory(updatedHistory);

    this.resetPlayingState();
    this.stage.set('summary');
    window.parent?.postMessage({ type: 'SHOW_NAV' }, '*');
  }

  private resetPlayingState(): void {
    this.currentStepIndex.set(-1);
    this.currentStimulus.set(null);
    this.currentMatchFlags.set(null);
    this.pressedThisStep.set(new Set());
    this.stepFeedback.set(new Map());
    this.sequence = null;
    this.stepClassifications = new Map();
  }
}
