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
    this.generateBoardLayout();
    this.startAnimationLoop();
    // Hide platform toolbar when game board is active
    window.parent?.postMessage({ type: 'HIDE_NAV' }, '*');
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    // Restore platform toolbar
    window.parent?.postMessage({ type: 'SHOW_NAV' }, '*');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeCanvas();
    this.generateBoardLayout();
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
    generateLayoutAsync(config.trainCount, canvas.width, canvas.height).then(layout => {
      this.layout = layout;
      this.isGenerating = false;
    });
  }

  // ── Game state reset ──

  private resetGameState(): void {
    this.generateBoardLayout();
    this.activeShapes = [];
    this.feedbackAnimations = [];
    this.spawnedCount = 0;
    this.shapeIdCounter = 0;
    this.nextSpawnTime = performance.now();
    this.lastFrameTime = performance.now();
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
    if (this.spawnedCount >= config.shapeCount) return;
    if (timestamp < this.nextSpawnTime) return;

    const spawnPoints = this.layout.spawnPoints;
    if (spawnPoints.length === 0) return;

    const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const stations = this.layout.stations;
    const identities = stations.map(s => s.identity);

    const shape = spawnShape(
      identities,
      spawnPoint,
      `shape-${this.shapeIdCounter++}`,
      timestamp,
    );
    this.activeShapes.push(shape);
    this.spawnedCount++;
    this.nextSpawnTime = timestamp + config.spawnInterval * 1000;
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
    if (this.spawnedCount === config.shapeCount && this.activeShapes.length === 0) {
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
    const hitRadius = 28;
    for (let i = 0; i < this.layout.junctions.length; i++) {
      const junction = this.layout.junctions[i];
      const dx = x - junction.position.x;
      const dy = y - junction.position.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        this.layout.junctions[i] = cycleJunction(junction);
        return;
      }
    }
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
    this.renderSpawnPoints(ctx);

    // Layer 4: Junctions
    this.renderJunctions(ctx);

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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
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
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(station.position.x, station.position.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main station outline — thicker and brighter
      ctx.strokeStyle = station.identity.color;
      ctx.lineWidth = 4;
      this.drawShape(ctx, station.position.x, station.position.y, station.identity.shapeType, 20, false);
    }
  }

  private renderSpawnPoints(ctx: CanvasRenderingContext2D): void {
    for (const sp of this.layout.spawnPoints) {
      // Bright outer ring
      ctx.strokeStyle = 'rgba(165, 180, 252, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sp.position.x, sp.position.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Inner filled dot
      ctx.fillStyle = 'rgba(165, 180, 252, 0.5)';
      ctx.beginPath();
      ctx.arc(sp.position.x, sp.position.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderJunctions(ctx: CanvasRenderingContext2D): void {
    for (const junction of this.layout.junctions) {
      // Draw junction circle — bigger and brighter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(junction.position.x, junction.position.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw directional arrow
      this.drawJunctionArrow(ctx, junction);
    }
  }

  private drawJunctionArrow(ctx: CanvasRenderingContext2D, junction: Junction): void {
    if (junction.outgoingPathIds.length === 0) return;
    const currentPathId = junction.outgoingPathIds[junction.switchIndex];
    const path = this.layout.paths.find(p => p.id === currentPathId);
    if (!path || path.waypoints.length < 2) return;

    const target = path.waypoints.length > 1 ? path.waypoints[1] : path.waypoints[0];
    const dx = target.x - junction.position.x;
    const dy = target.y - junction.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const arrowLen = 10;
    const tipX = junction.position.x + nx * 14;
    const tipY = junction.position.y + ny * 14;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - nx * arrowLen + ny * 5, tipY - ny * arrowLen - nx * 5);
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - nx * arrowLen - ny * 5, tipY - ny * arrowLen + nx * 5);
    ctx.stroke();
  }

  private renderActiveShapes(ctx: CanvasRenderingContext2D): void {
    for (const shape of this.activeShapes) {
      const path = this.layout.paths.find(p => p.id === shape.currentPathId);
      if (!path) continue;

      const pos = this.interpolatePath(path, shape.progressAlongPath);

      // Glow effect
      ctx.shadowColor = shape.identity.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = shape.identity.color;
      this.drawShape(ctx, pos.x, pos.y, shape.identity.shapeType, 14, true);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }

  private renderFeedback(ctx: CanvasRenderingContext2D, timestamp: number): void {
    this.feedbackAnimations = this.feedbackAnimations.filter(fb => {
      const elapsed = timestamp - fb.startTime;
      if (elapsed > fb.duration) return false;

      const progress = elapsed / fb.duration;
      const alpha = 1 - progress;
      const radius = 20 + progress * 30;

      ctx.strokeStyle = fb.correct
        ? `rgba(34, 197, 94, ${alpha})`
        : `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 3;
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
    const remaining = config.shapeCount - delivered;

    ctx.font = '16px Inter, sans-serif';
    ctx.textBaseline = 'top';

    // Helper: draw text with a dark pill background behind it
    const drawBadge = (text: string, x: number, y: number, color: string): number => {
      const metrics = ctx.measureText(text);
      const padX = 6;
      const padY = 3;
      const w = metrics.width + padX * 2;
      const h = 20 + padY * 2;
      // Dark background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.roundRect(x - padX, y - padY, w, h, 6);
      ctx.fill();
      // Text
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      return w;
    };

    ctx.textAlign = 'left';
    let curX = 16;
    const y = 16;

    curX += drawBadge(`${scoring.correctDeliveries}`, curX, y, '#86efac');
    curX += 4; // gap

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('/', curX, y);
    curX += ctx.measureText('/').width + 4;

    curX += drawBadge(`${scoring.misdeliveries}`, curX, y, '#fca5a5');
    curX += 4;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('/', curX, y);
    curX += ctx.measureText('/').width + 4;

    drawBadge(`${remaining}`, curX, y, '#94a3b8');
  }

  // ── Path interpolation ──

  private interpolatePath(path: PathSegment, t: number): Point {
    const clamped = Math.max(0, Math.min(1, t));
    const wp = path.waypoints;

    if (wp.length < 2) return wp[0] ?? { x: 0, y: 0 };

    // All paths now have exactly 2 waypoints (straight lines) — linear interpolation
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
