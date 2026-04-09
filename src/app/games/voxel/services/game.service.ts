import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  DEFAULT_CONFIG, InteractionMode, RoundResult, ScoringState, Trial, TrialResult,
  VoxelColor, VoxelConfig, VoxelPosition, VoxelStage, VoxelSymbol, VOXEL_COLORS, VOXEL_SYMBOLS,
  MAX_COLORS, MAX_SYMBOLS,
} from '../models/game.models';
import { generateShape } from '../utils/shape-generator.util';
import { compareShapes, shapesMatchRotationInvariant } from '../utils/shape-comparator.util';
import {
  calculateAccuracy, calculateCombinedScore, calculatePrecision,
  calculateRoundResult, initialScoringState, processTrialResult,
} from '../utils/scoring.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<VoxelStage> = signal<VoxelStage>('idle');
  readonly config: WritableSignal<VoxelConfig> = signal<VoxelConfig>(DEFAULT_CONFIG);
  readonly currentTrial: WritableSignal<Trial | null> = signal<Trial | null>(null);
  readonly playerBuild: WritableSignal<VoxelPosition[]> = signal<VoxelPosition[]>([]);
  readonly interactionMode: WritableSignal<InteractionMode> = signal<InteractionMode>('build');
  readonly selectedColor: WritableSignal<VoxelColor> = signal<VoxelColor>(VOXEL_COLORS[0]);
  readonly selectedSymbol: WritableSignal<VoxelSymbol | null> = signal<VoxelSymbol | null>(null);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly lastTrialResult: WritableSignal<TrialResult | null> = signal<TrialResult | null>(null);
  readonly solved: WritableSignal<boolean> = signal<boolean>(false);

  private buildStartTime = 0;
  private currentStudyTimeMs = 0;

  readonly isMultiColor = computed(() => this.config().colorCount > 1);
  readonly isMultiSymbol = computed(() => this.config().symbolCount > 1);

  updateConfig(partial: Partial<VoxelConfig>): void {
    const c = this.config();
    this.config.set({
      cubeCount: clamp(partial.cubeCount ?? c.cubeCount, 3, 50),
      colorCount: clamp(partial.colorCount ?? c.colorCount, 1, MAX_COLORS),
      symbolCount: clamp(partial.symbolCount ?? c.symbolCount, 1, MAX_SYMBOLS),
    });
  }

  startSession(): void {
    this.scoringState.set(initialScoringState());
    this.lastTrialResult.set(null);
    this.solved.set(false);
    this.generateNextTrial();
    this.stage.set('studying');
  }

  getEffectiveStudyTimeSec(): number | null {
    return null;
  }

  endStudy(studyTimeMs: number): void {
    this.currentStudyTimeMs = studyTimeMs;
    this.playerBuild.set([{ x: 0, y: 0, z: 0, color: VOXEL_COLORS[0], symbol: null }]);
    this.interactionMode.set('build');
    this.selectedColor.set(VOXEL_COLORS[0]);
    this.selectedSymbol.set(this.config().symbolCount > 1 ? VOXEL_SYMBOLS[0] : null);
    this.solved.set(false);
    this.buildStartTime = Date.now();
    this.stage.set('building');
  }

  addCube(pos: { x: number; y: number; z: number }, color?: VoxelColor, symbol?: VoxelSymbol | null): void {
    const b = this.playerBuild();
    if (b.some(v => v.x === pos.x && v.y === pos.y && v.z === pos.z)) return;
    const nb = [...b, {
      x: pos.x, y: pos.y, z: pos.z,
      color: color ?? this.selectedColor(),
      symbol: symbol !== undefined ? symbol : this.selectedSymbol(),
    }];
    this.playerBuild.set(nb);
    this.checkSolved(nb);
  }

  removeCube(pos: { x: number; y: number; z: number }): void {
    if (pos.x === 0 && pos.y === 0 && pos.z === 0) return;
    const nb = this.playerBuild().filter(v => !(v.x === pos.x && v.y === pos.y && v.z === pos.z));
    this.playerBuild.set(nb);
    this.checkSolved(nb);
  }

  setInteractionMode(mode: InteractionMode): void {
    this.interactionMode.set(mode);
  }

  setSelectedColor(color: VoxelColor): void {
    this.selectedColor.set(color);
  }

  setSelectedSymbol(symbol: VoxelSymbol | null): void {
    this.selectedSymbol.set(symbol);
  }

  giveUp(): void {
    this.completeTrial(true);
    this.stage.set('comparison');
  }

  nextRound(): void {
    this.lastTrialResult.set(null);
    this.solved.set(false);
    this.generateNextTrial();
    this.stage.set('studying');
  }

  endSession(): void {
    this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
    this.stage.set('summary');
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  private completeTrial(gaveUp: boolean): void {
    const trial = this.currentTrial();
    if (!trial) return;
    const build = this.playerBuild();
    const target: VoxelPosition[] = trial.shape.voxels.map(v => ({
      x: v.position[0], y: v.position[1], z: v.position[2], color: v.color, symbol: v.symbol,
    }));
    const diff = compareShapes(target, build, false);
    const acc = gaveUp ? calculateAccuracy(diff.correct.length, target.length) : 100;
    const prec = gaveUp ? calculatePrecision(diff.correct.length, build.length) : 100;
    const result: TrialResult = {
      trial,
      playerBuild: build,
      shapeDiff: diff,
      accuracyScore: acc,
      precisionScore: prec,
      combinedScore: calculateCombinedScore(acc, prec),
      buildTimeMs: Date.now() - this.buildStartTime,
      studyTimeMs: this.currentStudyTimeMs,
      perfect: !gaveUp,
    };
    this.lastTrialResult.set(result);
    this.scoringState.set(processTrialResult(this.scoringState(), result));
  }

  private checkSolved(build: VoxelPosition[]): void {
    const trial = this.currentTrial();
    if (!trial) return;
    const target: VoxelPosition[] = trial.shape.voxels.map(v => ({
      x: v.position[0], y: v.position[1], z: v.position[2], color: v.color, symbol: v.symbol,
    }));
    if (shapesMatchRotationInvariant(target, build)) {
      this.solved.set(true);
      this.completeTrial(false);
    }
  }

  private generateNextTrial(): void {
    const cfg = this.config();
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const shape = generateShape(seed, cfg.cubeCount, cfg.cubeCount <= 5);

    // Simple seeded RNG for random assignment
    let s = seed;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

    // Assign colors — random per cube from active palette
    if (cfg.colorCount > 1) {
      const ac = VOXEL_COLORS.slice(0, cfg.colorCount);
      shape.voxels = shape.voxels.map(v => ({ ...v, color: ac[Math.floor(rng() * ac.length)] }));
    } else {
      shape.voxels = shape.voxels.map(v => ({ ...v, color: VOXEL_COLORS[0] }));
    }

    // Assign symbols — random per cube, independent from colors
    if (cfg.symbolCount > 1) {
      const as = VOXEL_SYMBOLS.slice(0, cfg.symbolCount);
      shape.voxels = shape.voxels.map(v => ({ ...v, symbol: as[Math.floor(rng() * as.length)] }));
    } else {
      shape.voxels = shape.voxels.map(v => ({ ...v, symbol: null }));
    }

    this.currentTrial.set({ shape, studyTimeSec: this.getEffectiveStudyTimeSec(), seed });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}