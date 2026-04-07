import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  effect,
  HostListener,
} from '@angular/core';
import {
  ActiveShape,
  BASE_SPEED_VALUES,
  BoardLayout,
  Junction,
  PathSegment,
  Point,
} from '../../models/game.models';
import { GameService } from '../../services/game.service';
import { generateLayout, generateLayoutAsync } from '../../utils/layout-generator.util';
import { classifyDelivery } from '../../utils/delivery.util';
import { cycleJunction, getNextPathForShape } from '../../utils/junction.util';
import { spawnShape } from '../../utils/shape-spawner.util';
import { VISUAL_CONFIG } from '../../models/visual.config';

interface FeedbackAnimation {
  x: number;
  y: number;
  correct: boolean;
  startTime: number;
  duration: number;
}

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #gameCanvas (click)="onCanvasClick($event)"
    (touchstart)="onCanvasTouchStart($event)"></canvas>
    <button class="abort-fab" (click)="onAbort()" title="Abort (Esc)">✕</button>`,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      position: fixed;
      inset: 0;
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }
    .abort-fab {
      position: fixed;
      top: 0.5rem;
      right: 0.5rem;
      z-index: 10;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, border-color 0.2s;
      backdrop-filter: blur(4px);
    }
    .abort-fab:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.6);
    }
  `],
})
export class GameBoardComponent implements OnInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly gameService = inject(GameService);

  private ctx!: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastFrameTime = 0;

  // Game state
  private layout!: BoardLayout;
  private activeShapes: ActiveShape[] = [];
  private feedbackAnimations: FeedbackAnimation[] = [];
  private spawnedCount = 0;
  private nextSpawnTime = 0;
  private shapeIdCounter = 0;
  private isGenerating = false;
  private gameStartTime = 0;
  private nextShapePreview: { identity: import('../../models/game.models').StationIdentity; spawnPoint: import('../../models/game.models').SpawnPoint } | null = null;

  // Junction animation state
  private junctionAngles = new Map<string, number>();       // current rendered angle
  private junctionTargetAngles = new Map<string, number>(); // target angle after switch
  private junctionTapTimes = new Map<string, number>();     // timestamp of last tap
  private layoutGeneration = 0; // monotonic counter to discard stale async results

  constructor() {
    effect(() => {
      const stage = this.gameService.stage();
      if (stage === 'playing') {
        this.resetGameState();
      }
    });
  }

  ngOnInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.startAnimationLoop();
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
    if (this.gameService.stage() === 'playing') {
      this.generateBoardLayout();
    }
  }

  // ── 17.7: Responsive canvas sizing ──

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private generateBoardLayout(): void {
    const canvas = this.canvasRef.nativeElement;
    const config = this.gameService.config();
    this.isGenerating = true;
    const gen = ++this.layoutGeneration;
    generateLayoutAsync(config.destinations, canvas.width, canvas.height).then(layout => {
      if (gen !== this.layoutGeneration) return; // stale result, discard
      this.layout = layout;
      this.isGenerating = false;
      this.junctionAngles.clear();
      this.junctionTargetAngles.clear();
      this.prepareNextPreview();
    });
  }

  // ── Game state reset ──

  private resetGameState(): void {
    this.generateBoardLayout();
    this.activeShapes = [];
    this.feedbackAnimations = [];
    this.spawnedCount = 0;
    this.shapeIdCounter = 0;
    const now = performance.now();
    this.gameStartTime = now;
    this.nextSpawnTime = now + 2000; // 2-second delay before first spawn
    this.lastFrameTime = now;
    this.nextShapePreview = null; // will be set when layout is ready
    this.junctionTapTimes.clear();
  }

  // ── 17.1: Animation loop ──

  private startAnimationLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (timestamp: number): void => {
      this.animFrameId = requestAnimationFrame(loop);
      const rawDelta = timestamp - this.lastFrameTime;
      const deltaTime = Math.min(rawDelta, 100); // cap at 100ms
      this.lastFrameTime = timestamp;

      if (this.gameService.stage() === 'playing') {
        this.updateSpawning(timestamp);
        this.updateShapes(deltaTime, timestamp);
        this.checkRoundEnd();
      }

      this.render(timestamp);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // ── 17.3: Shape spawning ──

  private updateSpawning(timestamp: number): void {
    const config = this.gameService.config();
    if (this.spawnedCount >= config.runners) return;
    if (timestamp < this.nextSpawnTime) return;

    const spawnPoints = this.layout.spawnPoints;
    if (spawnPoints.length === 0) return;

    // Use the pre-computed preview if available, otherwise pick randomly
    let spawnPoint: import('../../models/game.models').SpawnPoint;
    let identity: import('../../models/game.models').StationIdentity;

    if (this.nextShapePreview) {
      spawnPoint = this.nextShapePreview.spawnPoint;
      identity = this.nextShapePreview.identity;
    } else {
      spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      const identities = this.layout.stations.map(s => s.identity);
      identity = identities[Math.floor(Math.random() * identities.length)];
    }

    const shape: ActiveShape = {
      id: `shape-${this.shapeIdCounter++}`,
      identity,
      currentPathId: spawnPoint.outgoingPathId,
      progressAlongPath: 0,
      spawnTime: timestamp,
    };
    this.activeShapes.push(shape);
    this.spawnedCount++;
    this.nextSpawnTime = timestamp + config.spawnInterval * 1000;

    // Prepare preview for the next shape
    this.prepareNextPreview();
  }

  private prepareNextPreview(): void {
    const config = this.gameService.config();
    if (this.spawnedCount >= config.runners) {
      this.nextShapePreview = null;
      return;
    }
    const spawnPoints = this.layout.spawnPoints;
    if (spawnPoints.length === 0) {
      this.nextShapePreview = null;
      return;
    }
    const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const identities = this.layout.stations.map(s => s.identity);
    const identity = identities[Math.floor(Math.random() * identities.length)];
    this.nextShapePreview = { identity, spawnPoint };
  }

  // ── 17.2: Shape movement system ──

  private updateShapes(deltaTime: number, timestamp: number): void {
    const config = this.gameService.config();
    const speed = BASE_SPEED_VALUES[config.baseSpeed];
    const toRemove: string[] = [];

    for (const shape of this.activeShapes) {
      const path = this.layout.paths.find(p => p.id === shape.currentPathId);
      if (!path || path.length === 0) {
        toRemove.push(shape.id);
        continue;
      }

      const progressDelta = (speed * (deltaTime / 1000)) / path.length;
      shape.progressAlongPath += progressDelta;

      if (shape.progressAlongPath >= 1.0) {
        shape.progressAlongPath = 1.0;
        const destNodeId = path.to;

        // Check if destination is a junction
        const junction = this.layout.junctions.find(j => j.id === destNodeId);
        if (junction) {
          const nextPathId = getNextPathForShape(junction);
          shape.currentPathId = nextPathId;
          shape.progressAlongPath = 0;
          continue;
        }

        // Check if destination is a station
        const station = this.layout.stations.find(s => s.id === destNodeId);
        if (station) {
          const correct = classifyDelivery(shape.identity, station.identity);
          this.gameService.onDelivery(correct, shape.spawnTime, timestamp);
          this.feedbackAnimations.push({
            x: station.position.x,
            y: station.position.y,
            correct,
            startTime: timestamp,
            duration: 500,
          });
          toRemove.push(shape.id);
        } else {
          // Dead-end: remove as misdelivery
          toRemove.push(shape.id);
        }
      }
    }

    this.activeShapes = this.activeShapes.filter(s => !toRemove.includes(s.id));
  }

  // ── 17.5: Round-end detection ──

  private checkRoundEnd(): void {
    const config = this.gameService.config();
    if (this.spawnedCount === config.runners && this.activeShapes.length === 0) {
      this.gameService.onRoundEnd();
    }
  }

  // ── 17.4: Click/touch hit-testing for junctions ──

  onCanvasClick(event: MouseEvent): void {
    const pos = this.getCanvasCoords(event.clientX, event.clientY);
    this.hitTestJunction(pos.x, pos.y);
  }

  onAbort(): void {
    this.gameService.abortSession();
  }

  onCanvasTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.hitTestJunction(pos.x, pos.y);
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): Point {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  private hitTestJunction(x: number, y: number): void {
    const hitRadius = VISUAL_CONFIG.junction.hitRadius;
    for (let i = 0; i < this.layout.junctions.length; i++) {
      const junction = this.layout.junctions[i];
      const dx = x - junction.position.x;
      const dy = y - junction.position.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        this.layout.junctions[i] = cycleJunction(junction);
        this.junctionTapTimes.set(junction.id, performance.now());
        // Compute new target angle for the switched path
        const newJunction = this.layout.junctions[i];
        const targetAngle = this.computeJunctionAngle(newJunction);
        if (targetAngle !== null) {
          this.junctionTargetAngles.set(junction.id, targetAngle);
        }
        return;
      }
    }
  }

  /** Compute the angle a junction arrow should point toward based on its active path */
  private computeJunctionAngle(junction: Junction): number | null {
    if (junction.outgoingPathIds.length === 0) return null;
    const currentPathId = junction.outgoingPathIds[junction.switchIndex];
    const path = this.layout.paths.find(p => p.id === currentPathId);
    if (!path || path.waypoints.length < 2) return null;
    // Use the first waypoint (immediate next cell) for direction, not the far endpoint
    const target = path.waypoints[0];
    const dx = target.x - junction.position.x;
    const dy = target.y - junction.position.y;
    // If the first waypoint is at the junction position, fall back to the second
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && path.waypoints.length > 1) {
      const t2 = path.waypoints[1];
      return Math.atan2(t2.y - junction.position.y, t2.x - junction.position.x) + Math.PI / 2;
    }
    return Math.atan2(dy, dx) + Math.PI / 2;
  }

  // ── Rendering ──

  private render(timestamp: number): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const w = canvas.width;
    const h = canvas.height;

    // Layer 1: Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    if (!this.layout) return;

    // Show spinner while generating
    if (this.isGenerating) {
      this.renderSpinner(ctx, w, h, timestamp);
      return;
    }

    // Layer 2: Paths
    this.renderPaths(ctx);

    // Layer 3: Stations
    this.renderStations(ctx);

    // Layer 3b: Spawn points
    this.renderSpawnPoints(ctx, timestamp);

    // Layer 4: Junctions
    this.renderJunctions(ctx, timestamp);

    // Layer 5: Active shapes
    this.renderActiveShapes(ctx);

    // Layer 6: Feedback animations
    this.renderFeedback(ctx, timestamp);

    // Layer 7: HUD
    if (this.gameService.stage() === 'playing') {
      this.renderHUD(ctx, w);
    }
  }

  private renderPaths(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = VISUAL_CONFIG.paths.color;
    ctx.lineWidth = VISUAL_CONFIG.paths.lineWidth;
    for (const path of this.layout.paths) {
      if (path.waypoints.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path.waypoints[0].x, path.waypoints[0].y);
      for (let i = 1; i < path.waypoints.length; i++) {
        ctx.lineTo(path.waypoints[i].x, path.waypoints[i].y);
      }
      ctx.stroke();
    }
  }

  private renderStations(ctx: CanvasRenderingContext2D): void {
    for (const station of this.layout.stations) {
      // Outer glow ring
      ctx.strokeStyle = station.identity.color;
      ctx.lineWidth = VISUAL_CONFIG.station.glowLineWidth;
      ctx.globalAlpha = VISUAL_CONFIG.station.glowAlpha;
      ctx.beginPath();
      ctx.arc(station.position.x, station.position.y, VISUAL_CONFIG.station.glowRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main station outline — thicker and brighter
      ctx.strokeStyle = station.identity.color;
      ctx.lineWidth = VISUAL_CONFIG.station.outlineWidth;
      const stationSize = VISUAL_CONFIG.station.shapeSizeByType[station.identity.shapeType] ?? VISUAL_CONFIG.station.shapeSize;
      this.drawShape(ctx, station.position.x, station.position.y, station.identity.shapeType, stationSize, false);
    }
  }

  private renderSpawnPoints(ctx: CanvasRenderingContext2D, timestamp: number): void {
    const isPlaying = this.gameService.stage() === 'playing';
    const config = this.gameService.config();
    const spawnIntervalMs = config.spawnInterval * 1000;

    for (const sp of this.layout.spawnPoints) {
      const R = VISUAL_CONFIG.spawnPoint.outerRadius;
      const isPreviewSpawn = isPlaying && this.nextShapePreview?.spawnPoint.id === sp.id;

      // Background ring (white base)
      ctx.strokeStyle = VISUAL_CONFIG.spawnPoint.outerColor;
      ctx.lineWidth = VISUAL_CONFIG.spawnPoint.outerLineWidth;
      ctx.beginPath();
      ctx.arc(sp.position.x, sp.position.y, R, 0, Math.PI * 2);
      ctx.stroke();

      // Green progress arc on the spawn point that has the next shape
      if (isPreviewSpawn) {
        const elapsed = timestamp - (this.nextSpawnTime - spawnIntervalMs);
        const progress = Math.max(0, Math.min(1, elapsed / spawnIntervalMs));
        const startAngle = -Math.PI / 2; // 12 o'clock
        const endAngle = startAngle + progress * Math.PI * 2;

        // Glow effect
        ctx.save();
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = VISUAL_CONFIG.spawnPoint.outerLineWidth + 1.5;
        ctx.beginPath();
        ctx.arc(sp.position.x, sp.position.y, R, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();
      }

      // Inner dot
      ctx.fillStyle = VISUAL_CONFIG.spawnPoint.innerColor;
      ctx.beginPath();
      ctx.arc(sp.position.x, sp.position.y, VISUAL_CONFIG.spawnPoint.innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw next shape preview at its spawn point
    if (this.nextShapePreview && isPlaying) {
      const preview = this.nextShapePreview;
      const sp = preview.spawnPoint;
      ctx.fillStyle = preview.identity.color;
      const size = VISUAL_CONFIG.activeShape.sizeByType[preview.identity.shapeType] ?? VISUAL_CONFIG.activeShape.size;
      this.drawShape(ctx, sp.position.x, sp.position.y, preview.identity.shapeType, size, true);
    }
  }

  private renderJunctions(ctx: CanvasRenderingContext2D, timestamp: number): void {
    const R = VISUAL_CONFIG.junction.circleRadius;
    const PULSE_DURATION = 200; // ms

    for (const junction of this.layout.junctions) {
      // Initialize angle tracking if needed
      if (!this.junctionAngles.has(junction.id)) {
        const angle = this.computeJunctionAngle(junction);
        if (angle !== null) {
          this.junctionAngles.set(junction.id, angle);
          this.junctionTargetAngles.set(junction.id, angle);
        }
      }

      // Smoothly interpolate current angle toward target
      const currentAngle = this.junctionAngles.get(junction.id) ?? 0;
      const targetAngle = this.junctionTargetAngles.get(junction.id) ?? currentAngle;
      let diff = targetAngle - currentAngle;
      // Normalize to [-PI, PI] for shortest rotation
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const lerpSpeed = 0.15;
      const newAngle = currentAngle + diff * lerpSpeed;
      this.junctionAngles.set(junction.id, newAngle);

      // Pulse scale on tap
      let scale = 1;
      const tapTime = this.junctionTapTimes.get(junction.id);
      if (tapTime) {
        const elapsed = timestamp - tapTime;
        if (elapsed < PULSE_DURATION) {
          const t = elapsed / PULSE_DURATION;
          scale = 1 + 0.15 * Math.sin(t * Math.PI); // bump up then back
        }
      }

      ctx.save();
      ctx.translate(junction.position.x, junction.position.y);
      ctx.scale(scale, scale);

      // White filled circle
      ctx.fillStyle = VISUAL_CONFIG.junction.circleColor;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();

      // Small indicators on circle edge for each alternative (inactive) path
      this.drawPathIndicators(ctx, junction, R);

      // Arrow using animated angle
      this.drawJunctionArrowAnimated(ctx, R, newAngle);

      ctx.restore();
    }
  }

  /** Draw small dot indicators on the circle edge for inactive outgoing paths */
  private drawPathIndicators(ctx: CanvasRenderingContext2D, junction: Junction, R: number): void {
    for (let i = 0; i < junction.outgoingPathIds.length; i++) {
      if (i === junction.switchIndex) continue;
      const pathId = junction.outgoingPathIds[i];
      const path = this.layout.paths.find(p => p.id === pathId);
      if (!path || path.waypoints.length < 2) continue;

      const target = path.waypoints[1];
      const dx = target.x - junction.position.x;
      const dy = target.y - junction.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      // Position on the circle edge (relative to translated origin)
      const ix = nx * R;
      const iy = ny * R;

      ctx.fillStyle = VISUAL_CONFIG.junction.indicator.color;
      ctx.beginPath();
      ctx.arc(ix, iy, VISUAL_CONFIG.junction.indicator.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draw the junction arrow at a given angle (already translated to junction center) */
  private drawJunctionArrowAnimated(ctx: CanvasRenderingContext2D, R: number, angle: number): void {
    const tip = R * VISUAL_CONFIG.junction.arrow.tipExtent;
    const backY = R * VISUAL_CONFIG.junction.arrow.backExtent;
    const backW = R * VISUAL_CONFIG.junction.arrow.backWidth;
    const notchY = R * VISUAL_CONFIG.junction.arrow.notchDepth;

    ctx.save();
    ctx.rotate(angle);

    ctx.fillStyle = VISUAL_CONFIG.junction.arrow.color;
    ctx.beginPath();
    ctx.moveTo(0, -tip);
    ctx.lineTo(backW, backY);
    ctx.lineTo(0, notchY);
    ctx.lineTo(-backW, backY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderActiveShapes(ctx: CanvasRenderingContext2D): void {
    for (const shape of this.activeShapes) {
      const path = this.layout.paths.find(p => p.id === shape.currentPathId);
      if (!path) continue;

      const pos = this.interpolatePath(path, shape.progressAlongPath);

      ctx.fillStyle = shape.identity.color;
      const shapeSize = VISUAL_CONFIG.activeShape.sizeByType[shape.identity.shapeType] ?? VISUAL_CONFIG.activeShape.size;
      this.drawShape(ctx, pos.x, pos.y, shape.identity.shapeType, shapeSize, true);
    }
  }

  private renderFeedback(ctx: CanvasRenderingContext2D, timestamp: number): void {
    this.feedbackAnimations = this.feedbackAnimations.filter(fb => {
      const elapsed = timestamp - fb.startTime;
      if (elapsed > fb.duration) return false;

      const progress = elapsed / fb.duration;
      const alpha = 1 - progress;
      const radius = VISUAL_CONFIG.feedback.startRadius + progress * VISUAL_CONFIG.feedback.expandBy;

      ctx.strokeStyle = fb.correct
        ? `rgba(34, 197, 94, ${alpha})`
        : `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = VISUAL_CONFIG.feedback.lineWidth;
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });
  }

  private renderSpinner(ctx: CanvasRenderingContext2D, w: number, h: number, timestamp: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const radius = 24;
    const angle = (timestamp / 400) % (Math.PI * 2);

    ctx.strokeStyle = 'rgba(165, 180, 252, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle, angle + Math.PI * 1.5);
    ctx.stroke();

    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = 'rgba(165, 180, 252, 0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Generating track...', cx, cy + radius + 12);
  }

  // ── 17.6: HUD rendering ──

  private renderHUD(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    const scoring = this.gameService.scoringState();
    const config = this.gameService.config();
    const delivered = scoring.correctDeliveries + scoring.misdeliveries;
    const remaining = config.runners - delivered;

    ctx.font = '16px Inter, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const x = 12;
    const y1 = 10;

    // Line 1: green (correct)  red (incorrect)
    ctx.fillStyle = '#86efac';
    const correctText = `${scoring.correctDeliveries}`;
    ctx.fillText(correctText, x, y1);
    const correctWidth = ctx.measureText(correctText).width;

    const gap = 12;
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(`${scoring.misdeliveries}`, x + correctWidth + gap, y1);
    const incorrectWidth = ctx.measureText(`${scoring.misdeliveries}`).width;

    // Line 2: remaining count, centered under the two numbers above
    const totalTopWidth = correctWidth + gap + incorrectWidth;
    const centerX = x + totalTopWidth / 2;
    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(`${remaining}`, centerX, y1 + 20);

    // Reset
    ctx.textAlign = 'left';
  }

  // ── Path interpolation ──

  private interpolatePath(path: PathSegment, t: number): Point {
    const clamped = Math.max(0, Math.min(1, t));
    const wp = path.waypoints;

    if (wp.length < 2) return wp[0] ?? { x: 0, y: 0 };

    if (wp.length === 2) {
      return {
        x: wp[0].x + (wp[1].x - wp[0].x) * clamped,
        y: wp[0].y + (wp[1].y - wp[0].y) * clamped,
      };
    }

    // Fallback: linear through multiple segments
    const totalSegments = wp.length - 1;
    const segFloat = clamped * totalSegments;
    const segIndex = Math.min(Math.floor(segFloat), totalSegments - 1);
    const segT = segFloat - segIndex;
    return {
      x: wp[segIndex].x + (wp[segIndex + 1].x - wp[segIndex].x) * segT,
      y: wp[segIndex].y + (wp[segIndex + 1].y - wp[segIndex].y) * segT,
    };
  }

  // ── Shape drawing ──

  private drawShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    shapeType: string,
    size: number,
    filled: boolean,
  ): void {
    ctx.beginPath();
    switch (shapeType) {
      case 'circle':
        ctx.arc(x, y, size, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(x - size, y - size, size * 2, size * 2);
        break;
      case 'triangle': {
        const h = size * Math.sqrt(3);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - h / 2, y + size / 2);
        ctx.lineTo(x + h / 2, y + size / 2);
        ctx.closePath();
        break;
      }
      case 'diamond':
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        break;
      case 'hexagon': {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
    }

    if (filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }
}
