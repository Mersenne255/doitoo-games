import {
  Component, ChangeDetectionStrategy, OnDestroy, inject,
  signal, effect, computed, ViewChild, ElementRef, afterNextRender, Injector,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameService } from '../../services/game.service';
import { ThreeSceneService } from '../../services/three-scene.service';
import { GameInfoService } from '../../../../shared/services/game-info.service';
import { InteractionMode, VoxelColor, VoxelStage, VOXEL_COLORS } from '../../models/game.models';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- ═══ STUDY PHASE ═══ -->
      @if (stage() === 'studying') {
        <div class="canvas-wrapper full">
          <canvas #studyCanvas class="three-canvas"></canvas>
        </div>
        <button class="abort-float" (click)="onAbort()" aria-label="Close">✕</button>
        <div class="overlay-controls">
          <button class="ready-text-btn" (click)="onReady()" aria-label="Ready">Ready</button>
        </div>
      }

      <!-- ═══ BUILD PHASE ═══ -->
      @if (stage() === 'building') {
        <div class="canvas-wrapper full"
          (pointerdown)="onPointerDown($event)"
          (pointerup)="onPointerUp($event)"
          (pointermove)="onPointerMove($event)">
          <canvas #buildCanvas class="three-canvas"></canvas>
        </div>
        <button class="abort-float" (click)="onAbort()" aria-label="Close">✕</button>

        <!-- Solved overlay -->
        @if (game.solved()) {
          <div class="solved-overlay">
            <div class="solved-glow">Correct!</div>
            <div class="solved-actions">
              <button class="solved-btn back" (click)="onAbort()">Back</button>
              <button class="solved-btn again" (click)="onNextRound()">Again</button>
            </div>
          </div>
        }

        <!-- Bottom overlay controls -->
        <div class="overlay-controls">
          @if (showColorPicker()) {
            <div class="color-row">
              @for (c of colors(); track c) {
                <button class="color-dot"
                  [style.background-color]="c"
                  [class.selected]="selectedColor() === c"
                  (click)="onColorSelect(c)"></button>
              }
            </div>
          }
          <div class="ctrl-row">
            <span class="cube-label">
              <svg class="cube-icon" viewBox="0 0 32 32" width="32" height="32">
                <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                <path d="M4 9 L16 16 L28 9" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                <path d="M16 16 L16 30" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
              </svg>
              <span class="cube-num">{{ cubeCount() }}</span>
            </span>
            <div class="mode-group">
              <button class="ctrl-btn" [class.active]="interactionMode() === 'build'"
                (click)="onModeChange('build')" aria-label="Build">＋</button>
              <button class="ctrl-btn" [class.active]="interactionMode() === 'remove'"
                (click)="onModeChange('remove')" aria-label="Remove">－</button>
            </div>
            <div class="right-group">
              <button class="ctrl-btn info-btn" (click)="onOpenInfo()" aria-label="Info">?</button>
              <button class="ctrl-btn giveup-btn" (click)="onGiveUp()" aria-label="Give up">🏳</button>
            </div>
          </div>
        </div>
      }

      <!-- ═══ COMPARISON (Give Up) — side by side ═══ -->
      @if (stage() === 'comparison') {
        <div class="comparison-split">
          <div class="split-pane">
            <div class="split-label-overlay">Original</div>
            <div class="canvas-wrapper split-canvas">
              <canvas #compOriginalCanvas class="three-canvas"></canvas>
            </div>
          </div>
          <div class="split-divider"></div>
          <div class="split-pane">
            <div class="split-label-overlay">Your build</div>
            <div class="canvas-wrapper split-canvas">
              <canvas #compBuildCanvas class="three-canvas"></canvas>
            </div>
          </div>
        </div>
        <div class="comparison-actions">
          <button class="comp-btn back" (click)="onAbort()">Back</button>
          <button class="comp-btn again" (click)="onNextRound()">Again</button>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .board { display: flex; flex-direction: column; height: 100vh; height: 100dvh; position: relative; }

    .canvas-wrapper { position: relative; overflow: hidden; touch-action: none; }
    .canvas-wrapper.full { flex: 1; min-height: 0; }
    .three-canvas { width: 100%; height: 100%; display: block; }

    /* Abort button floating top-right */
    .abort-float {
      position: absolute; top: 0.75rem; right: 0.75rem; z-index: 15;
      width: 2.25rem; height: 2.25rem; border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .abort-float:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.6);
    }

    /* Timer */
    .timer-bar-track { height: 4px; background: rgba(255,255,255,0.1); overflow: hidden; }
    .timer-bar-fill { height: 100%; background: #6366f1; transition: width 50ms linear; }
    .timer-bar-fill.urgent { background: #ef4444; }

    /* Overlay controls at bottom */
    .overlay-controls {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
      padding: 0.75rem 0.75rem; z-index: 10;
      background: linear-gradient(transparent, rgba(15,15,26,0.85) 30%);
      pointer-events: none;
    }
    .overlay-controls > * { pointer-events: auto; }

    .ctrl-row {
      display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: 0.4rem;
      width: 100%;
    }
    .mode-group { display: flex; gap: 0.3rem; justify-self: center; }
    .right-group { display: flex; gap: 0.3rem; justify-self: end; }
    .cube-label { justify-self: start; }

    .color-row {
      display: flex; gap: 0.3rem; justify-content: center;
    }

    .ctrl-btn {
      width: 2.75rem; height: 2.75rem; border-radius: 0.6rem;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(15,15,26,0.9);
      color: #cbd5e1; font-size: 1.1rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      transition: all 0.15s;
    }
    .ctrl-btn:hover { background: rgba(255,255,255,0.1); }
    .ctrl-btn.active {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white; border-color: transparent;
      box-shadow: 0 2px 10px rgba(99,102,241,0.4);
    }
    .ctrl-btn.ready-btn { background: rgba(34,197,94,0.25); border-color: rgba(34,197,94,0.5); color: #86efac; font-size: 1.3rem; }

    .ready-text-btn {
      padding: 0.6rem 2.5rem; border-radius: 0.75rem;
      border: 1px solid rgba(34,197,94,0.5);
      background: rgba(34,197,94,0.2);
      color: #86efac; font-weight: 700; font-size: 1rem;
      cursor: pointer; min-height: 44px;
      backdrop-filter: blur(8px);
    }
    .ready-text-btn:hover { background: rgba(34,197,94,0.35); }
    .ctrl-btn.next-btn { background: rgba(99,102,241,0.25); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }
    .ctrl-btn.end-btn { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #94a3b8; }
    .ctrl-btn.giveup-btn { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #fca5a5; }
    .ctrl-btn.info-btn { font-weight: 800; }

    .cube-label {
      justify-self: start;
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 2.75rem; height: 2.75rem;
    }
    .cube-icon { position: absolute; inset: 0; }
    .cube-num {
      position: relative; z-index: 1;
      color: #94a3b8; font-size: 0.8rem; font-weight: 700;
      margin-top: 0.15rem;
    }

    .color-dot {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 2px solid transparent; cursor: pointer;
      min-width: 44px; min-height: 44px;
    }
    .color-dot.selected { border-color: white; box-shadow: 0 0 8px rgba(255,255,255,0.5); }

    /* Solved overlay */
    .solved-overlay {
      position: absolute; inset: 0; z-index: 20;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(15,15,26,0.75); backdrop-filter: blur(6px);
    }
    .solved-glow {
      font-size: 2.5rem; font-weight: 900; color: #22c55e;
      text-shadow: 0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.15);
      letter-spacing: 0.02em;
    }
    .solved-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
    .solved-btn {
      padding: 0.6rem 2rem; border-radius: 0.6rem;
      font-weight: 700; font-size: 0.95rem; cursor: pointer;
      min-height: 44px; min-width: 100px;
      transition: background 0.2s;
    }
    .solved-btn.back {
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06); color: #94a3b8;
    }
    .solved-btn.back:hover { background: rgba(255,255,255,0.12); }
    .solved-btn.again {
      border: 1px solid rgba(34,197,94,0.5);
      background: rgba(34,197,94,0.2); color: #86efac;
    }
    .solved-btn.again:hover { background: rgba(34,197,94,0.35); }

    .comparison-split {
      flex: 1; display: flex; gap: 0; min-height: 0;
    }
    @media (orientation: portrait) {
      .comparison-split { flex-direction: column; }
      .split-divider { height: 1px; width: 100%; background: rgba(255,255,255,0.12); }
    }
    @media (orientation: landscape) {
      .split-divider { width: 1px; height: 100%; background: rgba(255,255,255,0.12); }
    }
    .split-pane { flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0; position: relative; }
    .split-label-overlay {
      position: absolute; top: 0; left: 0; right: 0; z-index: 5;
      text-align: center; color: rgba(255,255,255,0.5); font-size: 0.65rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 0.35rem 0;
      background: linear-gradient(rgba(15,15,26,0.7), transparent);
      pointer-events: none;
    }
    .split-canvas { flex: 1; }

    .comparison-actions {
      display: flex; gap: 0.75rem; justify-content: center;
      padding: 0.6rem 1rem;
    }
    .comp-btn {
      padding: 0.55rem 2rem; border-radius: 0.6rem;
      font-weight: 700; font-size: 0.9rem; cursor: pointer;
      min-height: 44px; min-width: 100px;
      transition: background 0.2s;
    }
    .comp-btn.back {
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.06); color: #94a3b8;
    }
    .comp-btn.back:hover { background: rgba(255,255,255,0.12); }
    .comp-btn.again {
      border: 1px solid rgba(34,197,94,0.5);
      background: rgba(34,197,94,0.2); color: #86efac;
    }
    .comp-btn.again:hover { background: rgba(34,197,94,0.35); }

  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);
  private readonly threeScene = inject(ThreeSceneService);
  private readonly gameInfo = inject(GameInfoService);
  // Second scene service for comparison side-by-side (original shape)
  private compOriginalScene = new ThreeSceneService();

  @ViewChild('studyCanvas') studyCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('buildCanvas') buildCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('compOriginalCanvas') compOriginalCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('compBuildCanvas') compBuildCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly stage = this.game.stage;
  readonly interactionMode = this.game.interactionMode;
  readonly selectedColor = this.game.selectedColor;
  readonly cubeCount = computed(() => this.game.playerBuild().length);
  readonly showColorPicker = computed(() => this.game.isMultiColor() && this.game.interactionMode() === 'build');
  readonly hasStudyTimer = computed(() => this.game.getEffectiveStudyTimeSec() !== null);
  readonly studyTimerPercent = signal<number>(100);
  readonly colors = computed(() => VOXEL_COLORS.slice(0, this.game.config().colorCount));

  private studyStartTime = 0;
  private studyTimerIntervalId: ReturnType<typeof setInterval> | null = null;
  private threeInitialized = false;
  private previousStage: VoxelStage | null = null;
  private readonly injector = inject(Injector);
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const currentStage = this.game.stage();
      this.game.currentTrial();
      const prev = this.previousStage;
      this.previousStage = currentStage;

      if (currentStage === 'studying' && prev !== 'studying') {
        afterNextRender(() => this.initStudyPhase(), { injector: this.injector });
      }
      if (currentStage === 'building' && prev !== 'building') {
        this.cleanupAll();
        afterNextRender(() => this.initBuildPhase(), { injector: this.injector });
      }
      if (currentStage === 'comparison' && prev !== 'comparison') {
        this.cleanupAll();
        afterNextRender(() => this.initComparisonPhase(), { injector: this.injector });
      }
    });
  }

  ngOnDestroy(): void {
    this.clearStudyTimer();
    this.cleanupAll();
    this.destroyResizeObserver();
  }

  onReady(): void {
    this.clearStudyTimer();
    this.game.endStudy(Date.now() - this.studyStartTime);
  }

  onModeChange(mode: InteractionMode): void {
    this.game.setInteractionMode(mode);
    this.threeScene.setInteractionMode(mode);
  }

  onColorSelect(color: VoxelColor): void { this.game.setSelectedColor(color); }

  onPointerDown(event: PointerEvent): void { this.threeScene.recordPointerDown(event); }

  onPointerUp(event: PointerEvent): void {
    const mode = this.game.interactionMode();
    if (this.game.solved()) return;
    if (!this.threeScene.isTap(event)) return;

    if (mode === 'build') {
      const result = this.threeScene.getClickedFace(event);
      if (result) {
        const color = this.game.isMultiColor() ? this.game.selectedColor() : undefined;
        this.game.addCube({ x: result.position[0], y: result.position[1], z: result.position[2] }, color);
        this.threeScene.addCubeToScene(result.position, color);
      }
    } else if (mode === 'remove') {
      const pos = this.threeScene.getClickedCube(event);
      if (pos && !(pos[0] === 0 && pos[1] === 0 && pos[2] === 0)) {
        this.game.removeCube({ x: pos[0], y: pos[1], z: pos[2] });
        this.threeScene.removeCubeFromScene(pos);
      }
    }
  }

  onPointerMove(event: PointerEvent): void {
    const mode = this.game.interactionMode();
    if (mode === 'build') {
      const r = this.threeScene.getClickedFace(event);
      this.threeScene.setHoverPreview(r?.position ?? null, this.game.isMultiColor() ? this.game.selectedColor() : undefined);
    } else if (mode === 'remove') {
      const p = this.threeScene.getClickedCube(event);
      this.threeScene.setHoverHighlight(p);
    }
  }

  onGiveUp(): void { this.game.giveUp(); }
  onAbort(): void { this.cleanupAll(); this.game.abortSession(); }
  onOpenInfo(): void { this.gameInfo.open('voxel', 'Voxel', 'assets/icons/voxel-icon.png'); }
  onNextRound(): void { this.game.nextRound(); }
  onEnd(): void { this.cleanupAll(); this.game.endSession(); }

  // ── Phase init ──

  private initStudyPhase(): void {
    this.studyStartTime = Date.now();
    const trial = this.game.currentTrial();
    const canvas = this.studyCanvasRef?.nativeElement;
    if (!trial || !canvas) return;

    this.threeScene.dispose();
    this.threeScene.init(canvas, trial.shape, this.game.isMultiColor());
    this.threeScene.startAnimationLoop();
    this.threeInitialized = true;
    this.setupResizeObserver(canvas);

    const sec = this.game.getEffectiveStudyTimeSec();
    if (sec !== null) {
      this.studyTimerPercent.set(100);
      this.startStudyTimer(sec);
    }
  }

  private startStudyTimer(totalSec: number): void {
    const totalMs = totalSec * 1000;
    const start = Date.now();
    this.studyTimerIntervalId = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / totalMs) * 100);
      this.studyTimerPercent.set(pct);
      if (pct <= 0) { this.clearStudyTimer(); this.game.endStudy(totalMs); }
    }, 50);
  }

  private initBuildPhase(): void {
    const canvas = this.buildCanvasRef?.nativeElement;
    if (!canvas) return;
    this.threeScene.dispose();
    this.threeScene.initBuildScene(canvas, [0, 0, 0], this.game.isMultiColor());
    this.threeScene.startAnimationLoop();
    this.threeInitialized = true;
    this.setupResizeObserver(canvas);
  }

  private initComparisonPhase(): void {
    const trial = this.game.currentTrial();
    const result = this.game.lastTrialResult();
    if (!trial || !result) return;

    // Left pane: original shape
    const origCanvas = this.compOriginalCanvasRef?.nativeElement;
    if (origCanvas) {
      this.compOriginalScene.dispose();
      this.compOriginalScene.init(origCanvas, trial.shape, this.game.isMultiColor());
      this.compOriginalScene.startAnimationLoop();
      this.setupResizeObserver(origCanvas);
    }

    // Right pane: player build as a VoxelShape
    const buildCanvas = this.compBuildCanvasRef?.nativeElement;
    if (buildCanvas) {
      const buildShape = this.buildToVoxelShape(result.playerBuild);
      this.threeScene.dispose();
      this.threeScene.init(buildCanvas, buildShape, this.game.isMultiColor());
      this.threeScene.startAnimationLoop();
      this.threeInitialized = true;
    }
  }

  private buildToVoxelShape(build: import('../../models/game.models').VoxelPosition[]): import('../../models/game.models').VoxelShape {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const v of build) {
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); maxZ = Math.max(maxZ, v.z);
    }
    return {
      voxels: build.map(v => ({ position: [v.x, v.y, v.z] as [number,number,number], color: v.color })),
      boundingBox: {
        min: [build.length ? minX : 0, build.length ? minY : 0, build.length ? minZ : 0],
        max: [build.length ? maxX : 0, build.length ? maxY : 0, build.length ? maxZ : 0],
      },
    };
  }

  private cleanupAll(): void {
    this.destroyResizeObserver();
    if (this.threeInitialized) { this.threeScene.stopAnimationLoop(); this.threeScene.dispose(); this.threeInitialized = false; }
    this.compOriginalScene.stopAnimationLoop();
    this.compOriginalScene.dispose();
  }

  private clearStudyTimer(): void {
    if (this.studyTimerIntervalId !== null) { clearInterval(this.studyTimerIntervalId); this.studyTimerIntervalId = null; }
  }

  private setupResizeObserver(canvas: HTMLCanvasElement): void {
    this.destroyResizeObserver();
    const parent = canvas.parentElement;
    if (!parent) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.threeScene.resize();
      this.compOriginalScene.resize();
    });
    this.resizeObserver.observe(parent);
  }

  private destroyResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
