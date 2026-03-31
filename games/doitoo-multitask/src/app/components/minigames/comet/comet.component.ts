import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, inject, effect, ElementRef, viewChild, NgZone,
} from '@angular/core';
import {
  CometConfig, MinigameResult,
  scrollSpeedForDifficulty,
} from '../../../models/game.models';
import { GameService } from '../../../services/game.service';

// ── Game constants ──
const MOVE_SPEED = 80;          // px/s (linear up/down speed at reference height)
const REFERENCE_HEIGHT = 500; // px — physics tuned for this height
const REFERENCE_WIDTH = 400;  // px — scroll speed tuned for this width
const PILOT_WIDTH = 24;
const PILOT_HEIGHT = 24;
const PILOT_X = 60;            // fallback; actual position is 15% of canvas width
const OBSTACLE_WIDTH = 40;
const OBSTACLE_SPACING = 450;  // horizontal px between obstacles
const COLLISION_FLASH_MS = 400;
const SLOT_KEYS = ['a', 's', 'd']; // keyboard keys per slot index

interface Obstacle {
  x: number;
  gapY: number;
  gapSize: number;
  width: number;
  scored: boolean;
  side: 'top' | 'bottom' | 'both';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0–1, decreases over time
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;   // parallax speed multiplier
  brightness: number;
}

const MAX_PARTICLES = 120;
const STAR_COUNT = 40;
const OBS_RADIUS = 8; // border radius for obstacle caps

@Component({
  selector: 'app-comet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #gameCanvas
      (pointerdown)="onPress($event)"
      (pointerup)="onRelease($event)"
      (pointerleave)="onRelease($event)"
      (pointercancel)="onRelease($event)">
    </canvas>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
  `],
})
export class CometComponent implements OnInit, OnDestroy {
  readonly config = input.required<CometConfig>();
  readonly active = input.required<boolean>();
  readonly slotIndex = input.required<number>();
  readonly completed = output<MinigameResult>();

  private readonly game = inject(GameService);
  private readonly zone = inject(NgZone);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('gameCanvas');

  // Reactive state (read by template / effects)
  readonly score = signal(0);

  // High-frequency mutable state (no signals — too expensive at 60fps)
  private pilotY = 0;
  private pilotVelocity = 0;
  private obstacles: Obstacle[] = [];
  private totalObstacles = 0;
  private spawnOffset = 0; // random initial offset to desync slots
  private speedJitter = 1; // per-slot scroll speed multiplier for desync
  private finished = false;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private lastFrameTime = 0;
  private animFrameId = 0;
  private flashTimeout: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private pressing = false;
  private activePointerId: number | null = null;
  private particles: Particle[] = [];
  private stars: Star[] = [];

  /** Pilot X position — 15% of canvas width */
  private get pilotX(): number {
    return this.canvasWidth > 0 ? this.canvasWidth * 0.15 : PILOT_X;
  }

  // ── Lifecycle integration (task 4.6) ──
  private stageEffect = effect(() => {
    const stage = this.game.stage();
    if (stage === 'summary' && !this.finished) {
      // Another slot caused the game to end — stop this one
      this.finished = true;
      this.stopLoop();
    } else if (stage === 'playing' && this.finished) {
      // Restarting (playAgain) — reset everything
      this.resetState();
      this.startLoop();
    }
  });

  ngOnInit(): void {
    this.spawnOffset = Math.random() * OBSTACLE_SPACING * 0.5;
    this.speedJitter = 0.90 + Math.random() * 0.20; // ±10% scroll speed per slot
    this.setupCanvas();
    this.bindKeyboard();
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.unbindKeyboard();
    if (this.flashTimeout !== null) {
      clearTimeout(this.flashTimeout);
      this.flashTimeout = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // ── Input handling ──
  private get slotKey(): string {
    return SLOT_KEYS[this.slotIndex()] ?? 'a';
  }

  private bindKeyboard(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === this.slotKey && !e.repeat) {
        if (this.finished) return;
        this.pressing = true;
      }
    };
    this.keyupHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === this.slotKey) {
        this.pressing = false;
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
  }

  private unbindKeyboard(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.keyupHandler) {
      window.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
  }

  onPress(event: PointerEvent): void {
    if (this.finished) return;
    this.pressing = true;
    this.activePointerId = event.pointerId;
  }

  onRelease(event: PointerEvent): void {
    if (event.pointerId === this.activePointerId) {
      this.pressing = false;
      this.activePointerId = null;
    }
  }

  // ── Canvas setup ──
  private setupCanvas(): void {
    const host = this.hostEl.nativeElement;
    const canvas = this.canvasRef().nativeElement;
    this.updateCanvasSize(canvas, host);

    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize(canvas, host);
    });
    this.resizeObserver.observe(host);
  }

  private updateCanvasSize(canvas: HTMLCanvasElement, host: HTMLElement): void {
    const dpr = window.devicePixelRatio || 1;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;

    this.canvasWidth = w;
    this.canvasHeight = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // ── Game loop ──
  private startLoop(): void {
    if (this.canvasHeight === 0) {
      // Canvas not ready yet — try again next frame
      this.animFrameId = requestAnimationFrame(() => {
        this.setupCanvas();
        if (this.canvasHeight > 0) {
          this.pilotY = (this.canvasHeight - PILOT_HEIGHT) / 2;
          if (this.stars.length === 0) this.initStars();
          this.lastFrameTime = performance.now();
          this.gameLoop(this.lastFrameTime);
        } else {
          this.startLoop();
        }
      });
      return;
    }
    this.pilotY = (this.canvasHeight - PILOT_HEIGHT) / 2;
    if (this.stars.length === 0) this.initStars();
    this.lastFrameTime = performance.now();
    this.zone.runOutsideAngular(() => {
      this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    });
  }

  private stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private gameLoop(timestamp: number): void {
    if (this.finished) return;

    const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1); // cap at 100ms
    this.lastFrameTime = timestamp;

    this.updatePhysics(dt);
    this.updateObstacles(dt);
    this.updateParticles(dt);
    this.updateStars(dt);
    this.checkCollisions();

    if (this.finished) return; // collision detected

    this.checkScoring();
    this.render(timestamp);

    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  // ── Pilot physics (task 4.2) ──
  private updatePhysics(dt: number): void {
    const baseSpeed = scrollSpeedForDifficulty(1);
    const currentSpeed = scrollSpeedForDifficulty(this.game.currentDifficulty());
    const speedRatio = currentSpeed / baseSpeed;
    // Speed as fraction of panel height — identical difficulty at any size
    const speed = this.canvasHeight * 0.20 * Math.sqrt(speedRatio);

    // Target velocity: up when pressing, down when not
    const targetVelocity = this.pressing ? -speed : speed;

    // Smooth transition: lerp toward target (higher = snappier, 8–12 feels good)
    const smoothing = 8;
    this.pilotVelocity += (targetVelocity - this.pilotVelocity) * Math.min(1, smoothing * dt);
    this.pilotY += this.pilotVelocity * dt;

    // Clamp to canvas bounds
    if (this.pilotY <= 0) {
      this.pilotY = 0;
      this.pilotVelocity = 0;
    } else if (this.pilotY >= this.canvasHeight - PILOT_HEIGHT) {
      this.pilotY = this.canvasHeight - PILOT_HEIGHT;
      this.pilotVelocity = 0;
    }
  }

  // ── Obstacle generation, scrolling, removal (task 4.3) ──
  private updateObstacles(dt: number): void {
    const difficulty = this.game.currentDifficulty();
    const widthScale = this.canvasWidth / REFERENCE_WIDTH;
    const speed = scrollSpeedForDifficulty(difficulty) * this.speedJitter * widthScale;
    // Gap is always half the canvas height
    const effectiveGap = this.canvasHeight * 0.5;

    // Scroll existing obstacles
    for (const obs of this.obstacles) {
      obs.x -= speed * dt;
    }

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter(obs => obs.x + obs.width >= 0);

    // Spawn new obstacle when needed — distance measured from last obstacle
    const rightEdge = this.canvasWidth;
    const rightmostX = this.obstacles.length > 0
      ? Math.max(...this.obstacles.map(o => o.x + o.width))
      : -OBSTACLE_SPACING + this.spawnOffset; // offset desyncs slots

    // Spacing increases with difficulty so obstacles stay manageable at high speed
    // Constant spacing — difficulty only affects scroll speed
    const spacing = (300 + Math.random() * 300) * widthScale;
    if (rightmostX + spacing <= rightEdge) {
      // Decide obstacle type: ~70% single-sided, ~30% both sides
      const roll = Math.random();
      let side: 'top' | 'bottom' | 'both';
      let gapY: number;

      if (roll < 0.35) {
        // Top-only barrier: obstacle hangs from ceiling
        side = 'top';
        const barrierHeight = effectiveGap * 0.4 + Math.random() * (this.canvasHeight * 0.5 - effectiveGap * 0.4);
        gapY = barrierHeight; // gapY = bottom edge of the top barrier
      } else if (roll < 0.70) {
        // Bottom-only barrier: obstacle rises from floor
        side = 'bottom';
        const barrierHeight = effectiveGap * 0.4 + Math.random() * (this.canvasHeight * 0.5 - effectiveGap * 0.4);
        gapY = this.canvasHeight - barrierHeight; // gapY = top edge of the bottom barrier
      } else {
        // Both sides — classic gap
        side = 'both';
        const halfGap = effectiveGap / 2;
        const minGapY = halfGap;
        const maxGapY = this.canvasHeight - halfGap;
        gapY = maxGapY > minGapY
          ? minGapY + Math.random() * (maxGapY - minGapY)
          : this.canvasHeight / 2;
      }

      this.obstacles.push({
        x: rightEdge,
        gapY,
        gapSize: effectiveGap,
        width: OBSTACLE_WIDTH,
        scored: false,
        side,
      });
      this.totalObstacles++;
    }
  }

  // ── Collision detection (task 4.4) ──
  private checkCollisions(): void {
    const pilotLeft = this.pilotX;
    const pilotRight = this.pilotX + PILOT_WIDTH;
    const pilotTop = this.pilotY;
    const pilotBottom = this.pilotY + PILOT_HEIGHT;

    // Obstacle collision
    for (const obs of this.obstacles) {
      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;

      // Check horizontal overlap first
      if (pilotRight > obsLeft && pilotLeft < obsRight) {
        if (obs.side === 'top') {
          // Only top barrier: pilot collides if above gapY
          if (pilotTop < obs.gapY) {
            this.onCollision();
            return;
          }
        } else if (obs.side === 'bottom') {
          // Only bottom barrier: pilot collides if below gapY
          if (pilotBottom > obs.gapY) {
            this.onCollision();
            return;
          }
        } else {
          // Both sides: classic gap collision
          const gapTop = obs.gapY - obs.gapSize / 2;
          const gapBottom = obs.gapY + obs.gapSize / 2;
          if (pilotTop < gapTop || pilotBottom > gapBottom) {
            this.onCollision();
            return;
          }
        }
      }
    }

    // Floor collision
    if (pilotBottom >= this.canvasHeight) {
      this.onCollision();
      return;
    }

    // Ceiling collision — pilot pressed against top
    if (pilotTop <= 0) {
      this.onCollision();
      return;
    }
  }

  private onCollision(): void {
    if (this.finished) return;
    this.finished = true;
    this.stopLoop();

    // Show red flash, then emit result
    this.renderCollisionFlash();

    this.flashTimeout = setTimeout(() => {
      this.flashTimeout = null;
      this.zone.run(() => {
        this.completed.emit({
          slotIndex: this.slotIndex(),
          score: this.score(),
          total: this.totalObstacles,
          maxDifficulty: this.game.currentDifficulty(),
          details: {
            correct: this.score(),
            incorrect: 0,
            timedOut: 0,
          },
        });
      });
    }, COLLISION_FLASH_MS);
  }

  // ── Scoring and difficulty (task 4.4) ──
  private checkScoring(): void {
    const pilotCenterX = this.pilotX + PILOT_WIDTH / 2;

    for (const obs of this.obstacles) {
      if (obs.scored) continue;
      const obsCenterX = obs.x + obs.width / 2;
      if (obsCenterX < pilotCenterX) {
        obs.scored = true;
        this.score.update(s => s + 1);
      }
    }
  }

  // ── Particles ──
  private updateParticles(dt: number): void {
    // Spawn trail particles behind the pilot
    if (this.particles.length < MAX_PARTICLES) {
      // Spawn 2 particles per frame for denser trail
      for (let i = 0; i < 2 && this.particles.length < MAX_PARTICLES; i++) {
        this.particles.push({
          x: this.pilotX - 2,
          y: this.pilotY + PILOT_HEIGHT / 2 + (Math.random() - 0.5) * 3,
          vx: -80 - Math.random() * 60,
          vy: (Math.random() - 0.5) * 6,
          life: 1,
          size: 1.5 + Math.random() * 3,
        });
      }
    }
    // Update existing
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.8;
      p.size *= 0.98;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  // ── Stars (parallax background) ──
  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.4, // slower = further away
        brightness: 0.2 + Math.random() * 0.5,
      });
    }
  }

  private updateStars(dt: number): void {
    const scrollSpeed = scrollSpeedForDifficulty(this.game.currentDifficulty());
    for (const s of this.stars) {
      s.x -= scrollSpeed * s.speed * dt;
      if (s.x < -2) {
        s.x = this.canvasWidth + 2;
        s.y = Math.random() * this.canvasHeight;
      }
    }
  }

  // ── Rounded rect helper ──
  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Canvas rendering ──
  private render(_timestamp: number): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Background
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(200, 210, 255, ${s.brightness})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Obstacles with gradient and rounded caps
    for (const obs of this.obstacles) {
      const grad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0);
      grad.addColorStop(0, '#4338ca');
      grad.addColorStop(0.5, '#6366f1');
      grad.addColorStop(1, '#4338ca');
      ctx.fillStyle = grad;

      if (obs.side === 'top') {
        this.roundedRect(ctx, obs.x, -OBS_RADIUS, obs.width, obs.gapY + OBS_RADIUS, OBS_RADIUS);
        ctx.fill();
      } else if (obs.side === 'bottom') {
        this.roundedRect(ctx, obs.x, obs.gapY, obs.width, h - obs.gapY + OBS_RADIUS, OBS_RADIUS);
        ctx.fill();
      } else {
        const gapTop = obs.gapY - obs.gapSize / 2;
        const gapBottom = obs.gapY + obs.gapSize / 2;
        this.roundedRect(ctx, obs.x, -OBS_RADIUS, obs.width, gapTop + OBS_RADIUS, OBS_RADIUS);
        ctx.fill();
        this.roundedRect(ctx, obs.x, gapBottom, obs.width, h - gapBottom + OBS_RADIUS, OBS_RADIUS);
        ctx.fill();
      }
    }

    // Particles (trail behind pilot)
    for (const p of this.particles) {
      const alpha = p.life * 0.6;
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pilot with glow
    const cx = this.pilotX + PILOT_WIDTH / 2;
    const cy = this.pilotY + PILOT_HEIGHT / 2;
    const r = PILOT_WIDTH / 2;

    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.5);
    glow.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    glow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pilot body
    const pilotGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
    pilotGrad.addColorStop(0, '#86efac');
    pilotGrad.addColorStop(1, '#16a34a');
    ctx.fillStyle = pilotGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Hint
    ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Up: hold or "${this.slotKey}"`, 8, 8);
  }

  private renderCollisionFlash(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // Render last frame
    this.render(0);

    // Red overlay
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(0, 0, w, h);
  }

  // ── Reset (task 4.6) ──
  private resetState(): void {
    this.stopLoop();
    if (this.flashTimeout !== null) {
      clearTimeout(this.flashTimeout);
      this.flashTimeout = null;
    }
    this.finished = false;
    this.score.set(0);
    this.pilotY = (this.canvasHeight - PILOT_HEIGHT) / 2;
    this.pilotVelocity = 0;
    this.pressing = false;
    this.obstacles = [];
    this.totalObstacles = 0;
    this.spawnOffset = Math.random() * OBSTACLE_SPACING * 0.5; // random desync
    this.speedJitter = 0.90 + Math.random() * 0.20;
    this.particles = [];
    this.unbindKeyboard();
    this.bindKeyboard();
  }
}
