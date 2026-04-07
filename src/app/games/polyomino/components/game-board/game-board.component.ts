import {
  Component, ChangeDetectionStrategy, inject, computed, signal,
  HostListener, OnDestroy, ElementRef, ViewChild, AfterViewInit, effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { PuzzlePiece } from '../../models/game.models';
import { normalize, rotateCW, flipH } from '../../utils/piece-library.util';
import { checkPlacement } from '../../utils/collision-detector.util';
import { ConfirmService } from '../../../../shared/services/confirm.service';

import { GameEndBarComponent } from '../../../../shared/components/game-end-bar/game-end-bar.component';
import { SolvedToastComponent } from '../../../../shared/components/solved-toast/solved-toast.component';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [GameEndBarComponent, SolvedToastComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board-root">
      <div class="play-area">
        <div class="board" #boardEl
          [class.has-selection]="selectedBoardPieceId()"
          [style.width.px]="boardSizePx().w"
          [style.height.px]="boardSizePx().h"
          [style.--sel-border.px]="Math.max(2, Math.round(cellSizePx() / 10))"
          [style.grid-template-columns]="'repeat(' + boardWidth() + ', 1fr)'"
          [style.grid-template-rows]="'repeat(' + boardHeight() + ', 1fr)'">
          @for (row of boardRows(); track $index) {
            @for (cell of row; track $index) {
              <div class="cell"
                [class.active]="cell.active"
                [class.inactive]="!cell.active"
                [class.ghost-valid]="cell.ghostValid"
                [class.ghost-invalid]="cell.ghostInvalid"
                [class.sel-top]="cell.selTop"
                [class.sel-right]="cell.selRight"
                [class.sel-bottom]="cell.selBottom"
                [class.sel-left]="cell.selLeft"
                [class.selected]="cell.selected"
                [class.dimmed]="cell.dimmed"
                [style.background-color]="cell.color || ''"
                (click)="onCellClick(cell.row, cell.col)"
                (dblclick)="onCellDblClick(cell.row, cell.col)">
              </div>
            }
          }
        </div>
        @if (!game.solved() && !game.gaveUp()) {
        <div class="tool-bar">
          <div class="tool-left">
            <button class="tool-btn give-up" (click)="onGiveUp()">←</button>
          </div>
          <div class="tool-center">
            <button class="tool-btn remove-btn" [disabled]="!selectedBoardPieceId()" (click)="removeSelected()">✕</button>
            <button class="tool-btn rotate-btn" [class.flash-error]="rotateFlashError()" [disabled]="!hasAnySelection()" (click)="rotateSelectedCCW()">↺</button>
            <button class="tool-btn rotate-btn" [class.flash-error]="rotateFlashError()" [disabled]="!hasAnySelection()" (click)="rotateSelected()">↻</button>
            <button class="tool-btn rotate-btn" [class.flash-error]="rotateFlashError()" [disabled]="!hasAnySelection()" (click)="flipSelected()">⇔</button>
          </div>
          <div class="tool-right">
            <button class="tool-btn hint" (click)="onHint()">💡</button>
          </div>
        </div>
        }
        <div class="tray-section">
          @if (totalPages() > 1) {
            <button class="tray-page-btn" [class.hidden]="trayPage() === 0" (click)="trayPage.set(trayPage() - 1)">‹</button>
          }
          <div class="tray">
            @for (piece of visibleTrayPieces(); track piece.id) {
              <div class="tray-piece"
                [class.selected]="game.selectedPieceId() === piece.id"
                [style.--piece-color]="piece.color"
                [attr.data-piece-id]="piece.id"
                tabindex="0" role="button">
                <div class="mini-grid"
                  [style.grid-template-columns]="'repeat(' + pieceBounds(piece).width + ', 1fr)'"
                  [style.grid-template-rows]="'repeat(' + pieceBounds(piece).height + ', 1fr)'">
                  @for (cell of pieceGridCells(piece); track $index) {
                    <div class="mini-cell" [class.filled]="cell"></div>
                  }
                </div>
              </div>
            }
          </div>
          @if (totalPages() > 1) {
            <button class="tray-page-btn" [class.hidden]="trayPage() >= totalPages() - 1" (click)="trayPage.set(trayPage() + 1)">›</button>
          }
        </div>
      </div>
      @if (showSolvedToast) {
        <app-solved-toast />
      }
      @if (game.solved() || game.gaveUp()) {
        <app-game-end-bar (back)="game.abortSession()" (again)="game.startSession()">
          @if (game.gaveUp()) {
            <span style="color:#fbbf24;font-weight:700;font-size:1.1rem">Gave up</span>
          } @else if (game.puzzleResult(); as r) {
            <div class="end-stats">
              <div class="end-stat">
                <span class="end-stat-value">{{ r.combinedScore | number:'1.0-0' }}</span>
                <span class="end-stat-label">Score</span>
              </div>
              <div class="end-stat">
                <span class="end-stat-value">{{ formatTime(r.solveTimeSec) }}</span>
                <span class="end-stat-label">Time</span>
              </div>
              <div class="end-stat">
                <span class="end-stat-value">{{ r.moveCount }}</span>
                <span class="end-stat-label">Moves</span>
              </div>
              <div class="end-stat">
                <span class="end-stat-value">{{ r.hintsUsed }}</span>
                <span class="end-stat-label">Hints</span>
              </div>
            </div>
          }
        </app-game-end-bar>
      }
      <div class="drag-ghost" #ghostEl></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; touch-action: none; }
    .board-root {
      display: flex; flex-direction: column;
      height: 100vh; height: 100dvh;
      max-width: 600px; margin: 0 auto;
      padding: 0.5rem; padding-bottom: 0.75rem; box-sizing: border-box;
      touch-action: none; user-select: none;
    }
    .play-area { display: flex; flex-direction: column; flex: 1; gap: 0.5rem; align-items: center; min-height: 0; }
    .board { display: grid; gap: 0; flex-shrink: 0; }
    .cell { aspect-ratio: 1; transition: background-color 0.1s; }
    .cell.active { background: rgba(255,255,255,0.09); cursor: pointer; border: 1px solid rgba(255,255,255,0.14); }
    .cell.inactive { background: transparent; border: 1px solid transparent; pointer-events: none; }
    .cell.ghost-valid { background: rgba(99,102,241,0.35) !important; }
    .cell.ghost-invalid { background: rgba(239,68,68,0.3) !important; }
    .cell.selected { box-shadow: inset 0 0 0 var(--sel-border) rgba(255,255,255,0.9); }
    .cell.dimmed { }
    .tray-section { display: flex; align-items: center; width: 100%; gap: 0.15rem; flex-shrink: 0; }
    .tray {
      display: flex; gap: 0.3rem; padding: 0.3rem; flex: 1; justify-content: center;
    }
    .tray-page-btn {
      flex-shrink: 0; width: 1.5rem; min-height: 52px; display: flex; align-items: center; justify-content: center;
      border: none; background: rgba(255,255,255,0.04); color: #64748b; font-size: 1.2rem; cursor: pointer;
      border-radius: 0.25rem;
      &:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }
      &.hidden { visibility: hidden; }
    }
    .tray-piece {
      padding: 0.15rem; border: 2px solid rgba(255,255,255,0.1); border-radius: 0.35rem; cursor: grab;
      width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;
      transition: border-color 0.15s, background 0.15s; flex-shrink: 0;
      &:hover { border-color: rgba(255,255,255,0.25); }
      &.selected { border-color: #6366f1; background: rgba(99,102,241,0.1); }
      &:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
    }
    .mini-grid { display: grid; gap: 1px; pointer-events: none; }
    .mini-cell { width: 8px; height: 8px; border-radius: 1px; }
    .mini-cell.filled { background: var(--piece-color, #6366f1); }
    .tool-bar { display: flex; align-items: center; width: 100%; padding: 0.25rem 0; gap: 0.4rem; }
    .tool-left, .tool-right { display: flex; gap: 0.4rem; flex: 1; }
    .tool-right { justify-content: flex-end; }
    .tool-center { display: flex; gap: 0.4rem; justify-content: center; flex-shrink: 0; }
    .tool-btn {
      padding: 0.3rem 0.6rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 0.35rem;
      background: rgba(255,255,255,0.04); color: #94a3b8; font-size: 0.85rem; cursor: pointer;
      height: 2.2rem; display: flex; align-items: center; justify-content: center; box-sizing: border-box;
      &:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
      &:disabled { opacity: 0.25; cursor: default; pointer-events: none; }
    }
    .rotate-btn { font-size: 1.4rem !important; }
    .rotate-btn.flash-error { animation: flashRed 0.4s ease; }
    @keyframes flashRed { 0%, 100% { background: rgba(255,255,255,0.04); } 50% { background: rgba(239,68,68,0.4); border-color: rgba(239,68,68,0.6); } }
    .tool-btn.give-up { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.15); color: #fca5a5; }
    .tool-btn.give-up:hover { background: rgba(239,68,68,0.25); }
    .drag-ghost { position: fixed; pointer-events: none; z-index: 100; opacity: 0; transform: translate(-50%, -50%); display: none; }
    .drag-ghost.visible { display: block; opacity: 0.8; }
    .drag-ghost.invalid::after {
      content: ''; position: absolute; inset: 0;
      background: repeating-linear-gradient(
        -45deg,
        rgba(0,0,0,0.12),
        rgba(0,0,0,0.12) 3px,
        rgba(0,0,0,0.35) 3px,
        rgba(0,0,0,0.35) 6px
      );
      border-radius: 2px;
    }
    .end-stats { display: flex; gap: 1rem; justify-content: center; }
    .end-stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
    .end-stat-value { font-weight: 800; font-size: 1rem; color: #e2e8f0; }
    .end-stat-label { font-size: 0.55rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  `],
})
export class GameBoardComponent implements OnDestroy, AfterViewInit {
  readonly game = inject(GameService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly router = inject(Router);
  @ViewChild('boardEl') boardElRef!: ElementRef<HTMLElement>;
  @ViewChild('ghostEl') ghostElRef!: ElementRef<HTMLElement>;

  private viewportTick = signal(0);
  private vpListener = () => this.viewportTick.update(n => n + 1);
  private activeDragPieceId = signal<string | null>(null);
  private isDragging = false;
  private readonly DRAG_THRESHOLD = 5;
  private snapRow = signal(-1);
  private snapCol = signal(-1);
  private cleanupFns: Array<() => void> = [];
  readonly selectedBoardPieceId = signal<string | null>(null);
  readonly rotateFlashError = signal(false);
  readonly hasAnySelection = computed(() => !!this.selectedBoardPieceId() || !!this.game.selectedPieceId());
  readonly trayPage = signal(0);

  /** How many pieces fit per row (based on available width, ~56px per piece including gap) */
  readonly piecesPerRow = computed(() => {
    this.viewportTick();
    const availW = Math.min(window.innerWidth - 16, 576) - 40; // minus page buttons
    return Math.max(3, Math.floor(availW / 56));
  });

  readonly trayRows = computed(() => 1);

  readonly piecesPerPage = computed(() => this.piecesPerRow());

  readonly totalPages = computed(() => {
    const total = this.trayPieces().length;
    const perPage = this.piecesPerPage();
    return perPage > 0 ? Math.ceil(total / perPage) : 1;
  });

  readonly visibleTrayPieces = computed(() => {
    const all = this.trayPieces();
    const perPage = this.piecesPerPage();
    const page = Math.min(this.trayPage(), this.totalPages() - 1);
    return all.slice(page * perPage, (page + 1) * perPage);
  });
  private lastBoardClickTime = 0;
  private lastBoardClickPieceId: string | null = null;
  showSolvedToast = false;

  constructor() {
    window.visualViewport?.addEventListener('resize', this.vpListener);
    effect(() => {
      if (this.game.solved() && !this.game.gaveUp()) {
        this.showSolvedToast = true;
        setTimeout(() => { this.showSolvedToast = false; }, 1800);
      }
    });
  }

  readonly Math = Math;

  readonly boardWidth = computed(() => { this.viewportTick(); return this.game.puzzle()?.board.width ?? 0; });
  readonly boardHeight = computed(() => { this.viewportTick(); return this.game.puzzle()?.board.height ?? 0; });
  readonly cellSizePx = computed(() => { const s = this.boardSizePx(), bw = this.boardWidth(); return bw > 0 ? s.w / bw : 0; });
  readonly boardSizePx = computed(() => {
    this.viewportTick();
    const bw = this.boardWidth(), bh = this.boardHeight();
    if (!bw || !bh) return { w: 0, h: 0 };
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const reservedHeight = 135; // toolbar + 1 row of pieces + gaps + padding
    const cell = Math.max(12, Math.min((Math.min(vw - 16, 576)) / bw, (vh - reservedHeight) / bh));
    return { w: Math.floor(cell * bw), h: Math.floor(cell * bh) };
  });
  readonly selectedPiece = computed(() => {
    const id = this.game.selectedPieceId(); return id ? this.game.puzzle()?.pieces.find(p => p.id === id) ?? null : null;
  });
  readonly trayPieces = computed(() => {
    const p = this.game.puzzle(); if (!p) return [];
    const u = new Set(this.game.unplacedPieceIds()); return p.pieces.filter(pp => u.has(pp.id));
  });

  readonly boardRows = computed(() => {
    const puzzle = this.game.puzzle(); if (!puzzle) return [];
    const board = puzzle.board, occ = this.game.boardState(), placed = this.game.placedPieces();
    const ghost = this.getGhostCells();
    const valid = ghost.length > 0 && this.isGhostValid(ghost);
    const selId = this.selectedBoardPieceId() ?? this.activeDragPieceId();
    const rows: Array<Array<{ row: number; col: number; active: boolean; color: string | null; ghostValid: boolean; ghostInvalid: boolean; selTop: boolean; selRight: boolean; selBottom: boolean; selLeft: boolean; dimmed: boolean; selected: boolean }>> = [];
    for (let r = 0; r < board.height; r++) {
      const row: typeof rows[0] = [];
      for (let c = 0; c < board.width; c++) {
        const active = board.activeCells[r][c];
        const oid = occ.cells[r]?.[c] ?? null;
        const pp = oid ? placed.find(p => p.pieceId === oid) : null;
        const ig = ghost.some(([gr, gc]) => gr === r && gc === c);
        // Compute outer border edges for selected piece
        const isSel = !!oid && oid === selId;
        let selTop = false, selRight = false, selBottom = false, selLeft = false;
        if (isSel) {
          selTop = (occ.cells[r - 1]?.[c] ?? null) !== selId;
          selBottom = (occ.cells[r + 1]?.[c] ?? null) !== selId;
          selLeft = (occ.cells[r]?.[c - 1] ?? null) !== selId;
          selRight = (occ.cells[r]?.[c + 1] ?? null) !== selId;
        }
        row.push({ row: r, col: c, active, color: pp ? pp.color : null, ghostValid: ig && valid, ghostInvalid: ig && !valid, selTop, selRight, selBottom, selLeft, dimmed: !!selId && !!oid && oid !== selId, selected: isSel });
      }
      rows.push(row);
    }
    return rows;
  });

  ngAfterViewInit(): void {
    const getTrayPieceId = (el: HTMLElement): string | null =>
      (el.closest('.tray-piece') as HTMLElement | null)?.getAttribute('data-piece-id') ?? null;

    const getBoardCell = (el: HTMLElement): { row: number; col: number } | null => {
      const cellEl = el.closest('.cell.active') as HTMLElement | null;
      if (!cellEl) return null;
      // Find cell index from its position in the grid
      const board = this.boardElRef?.nativeElement;
      if (!board) return null;
      const cells = Array.from(board.querySelectorAll('.cell'));
      const idx = cells.indexOf(cellEl);
      if (idx < 0) return null;
      const w = this.boardWidth();
      return { row: Math.floor(idx / w), col: idx % w };
    };

    const mouseHandler = (e: MouseEvent) => {
      if (this.game.solved()) return;
      // Check tray piece first
      const trayId = getTrayPieceId(e.target as HTMLElement);
      if (trayId) { e.preventDefault(); this.initDrag(trayId, e.clientX, e.clientY, e.target as HTMLElement, false); return; }
      // Check board cell for placed piece drag
      const cell = getBoardCell(e.target as HTMLElement);
      if (cell) {
        const oid = this.game.boardState().cells[cell.row]?.[cell.col];
        if (oid) { e.preventDefault(); this.initBoardDrag(oid, e.clientX, e.clientY, e.target as HTMLElement); return; }
      }
    };
    const touchHandler = (e: TouchEvent) => {
      if (this.game.solved() || e.touches.length !== 1) return;
      const trayId = getTrayPieceId(e.target as HTMLElement);
      if (trayId) { e.preventDefault(); this.initDrag(trayId, e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement, false); return; }
      const cell = getBoardCell(e.target as HTMLElement);
      if (cell) {
        const oid = this.game.boardState().cells[cell.row]?.[cell.col];
        if (oid) { e.preventDefault(); this.initBoardDrag(oid, e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement); return; }
      }
    };
    document.addEventListener('mousedown', mouseHandler, true);
    document.addEventListener('touchstart', touchHandler, { capture: true, passive: false } as any);
    this.cleanupFns.push(
      () => document.removeEventListener('mousedown', mouseHandler, true),
      () => document.removeEventListener('touchstart', touchHandler, true),
    );
  }

  private initDrag(pieceId: string, startX: number, startY: number, targetEl: HTMLElement, fromBoard: boolean): void {
    const piece = this.game.puzzle()?.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    const ghostEl = this.ghostElRef?.nativeElement;
    const trayEl = fromBoard ? null : targetEl.closest('.tray-piece') as HTMLElement | null;
    let dragging = false;
    let clickOk = true;

    const xy = (e: MouseEvent | Touch): [number, number] => [e.clientX, e.clientY];
    const xyFromEvent = (e: Event): [number, number] => {
      if (e instanceof MouseEvent) return xy(e);
      const te = e as TouchEvent;
      return te.touches.length > 0 ? xy(te.touches[0]) : te.changedTouches.length > 0 ? xy(te.changedTouches[0]) : [startX, startY];
    };

    const move = (e: Event) => {
      e.preventDefault();
      const [x, y] = xyFromEvent(e);
      if (!dragging && (Math.abs(x - startX) > this.DRAG_THRESHOLD || Math.abs(y - startY) > this.DRAG_THRESHOLD)) {
        dragging = true; clickOk = false; this.isDragging = true; this.activeDragPieceId.set(pieceId);
        this.selectedBoardPieceId.set(null);
        this.game.selectedPieceId.set(null);
        if (fromBoard) {
          // Remove piece from board when drag starts
          this.game.removePiece(pieceId);
        }
        if (ghostEl) { this.buildGhostDOM(ghostEl, piece); ghostEl.classList.add('visible'); }
        if (trayEl) trayEl.style.opacity = '0.3';
      }
      if (dragging && ghostEl) {
        ghostEl.style.left = x + 'px'; ghostEl.style.top = y + 'px';
        this.updateSnap(x, y, piece);
        // Update ghost validity overlay
        const ghost = this.getGhostCells();
        const valid = ghost.length > 0 && this.isGhostValid(ghost);
        ghostEl.classList.toggle('invalid', !valid && ghost.length > 0);
      }
    };

    const up = () => {
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', up, true);
      document.removeEventListener('touchmove', move, true);
      document.removeEventListener('touchend', up, true);
      document.removeEventListener('touchcancel', up, true);
      if (trayEl) trayEl.style.opacity = '';
      if (ghostEl) { ghostEl.classList.remove('visible'); ghostEl.classList.remove('invalid'); ghostEl.innerHTML = ''; }
      if (dragging) { this.finishDrag(pieceId); }
      else if (clickOk && !fromBoard) {
        this.selectedBoardPieceId.set(null);
        this.game.selectedPieceId.set(this.game.selectedPieceId() === pieceId ? null : pieceId);
      } else if (clickOk && fromBoard) {
        // Detect double-click (two clicks within 400ms on same piece)
        const now = Date.now();
        if (this.lastBoardClickPieceId === pieceId && now - this.lastBoardClickTime < 400) {
          // Double click — remove piece
          this.selectedBoardPieceId.set(null);
          this.game.removePiece(pieceId);
          this.game.selectedPieceId.set(pieceId);
          this.lastBoardClickPieceId = null;
        } else {
          // Single click — select/deselect
          if (this.selectedBoardPieceId() === pieceId) {
            this.selectedBoardPieceId.set(null);
          } else {
            this.selectedBoardPieceId.set(pieceId);
            this.game.selectedPieceId.set(null);
          }
          this.lastBoardClickTime = now;
          this.lastBoardClickPieceId = pieceId;
        }
      }
      this.isDragging = false; this.activeDragPieceId.set(null);
    };

    document.addEventListener('mousemove', move, true);
    document.addEventListener('mouseup', up, true);
    document.addEventListener('touchmove', move, { capture: true, passive: false } as any);
    document.addEventListener('touchend', up, true);
    document.addEventListener('touchcancel', up, true);
  }

  private initBoardDrag(pieceId: string, startX: number, startY: number, targetEl: HTMLElement): void {
    this.initDrag(pieceId, startX, startY, targetEl, true);
  }

  private buildGhostDOM(el: HTMLElement, piece: PuzzlePiece): void {
    el.innerHTML = '';
    const cells = this.getOrientedCells(piece), bounds = this.pieceBounds(piece), cs = this.cellSizePx();
    const set = new Set(cells.map(([r, c]) => `${r},${c}`));
    const g = document.createElement('div');
    g.style.cssText = `display:grid;grid-template-columns:repeat(${bounds.width},${cs}px);grid-template-rows:repeat(${bounds.height},${cs}px);gap:0`;
    for (let r = 0; r < bounds.height; r++)
      for (let c = 0; c < bounds.width; c++) {
        const d = document.createElement('div');
        d.style.borderRadius = '2px';
        if (set.has(`${r},${c}`)) { d.style.backgroundColor = piece.color; d.style.border = '1px solid rgba(255,255,255,0.2)'; }
        g.appendChild(d);
      }
    el.appendChild(g);
  }

  private updateSnap(x: number, y: number, piece: PuzzlePiece): void {
    const bEl = this.boardElRef?.nativeElement; if (!bEl) return;
    const rect = bEl.getBoundingClientRect(), cs = this.cellSizePx(); if (cs <= 0) return;
    const col = Math.floor((x - rect.left) / cs), row = Math.floor((y - rect.top) / cs);
    const oriented = this.getOrientedCells(piece); if (!oriented.length) return;
    const puzzle = this.game.puzzle(); if (!puzzle) return;
    const occ = this.game.boardState();

    // Compute piece center for distance sorting
    const midR = (Math.min(...oriented.map(([r]) => r)) + Math.max(...oriented.map(([r]) => r))) / 2;
    const midC = (Math.min(...oriented.map(([, c]) => c)) + Math.max(...oriented.map(([, c]) => c))) / 2;

    // Try center-based anchor first (most intuitive)
    const centerAnchorR = Math.round(row - midR);
    const centerAnchorC = Math.round(col - midC);
    if (checkPlacement(puzzle.board, occ, oriented, centerAnchorR, centerAnchorC).valid) {
      this.snapRow.set(centerAnchorR); this.snapCol.set(centerAnchorC);
      return;
    }

    // Try each cell of the piece as the anchor over the hovered grid cell
    // Sort by distance from piece center for most natural placement
    const candidates = oriented.map(([pr, pc]) => ({
      anchorR: row - pr, anchorC: col - pc,
      dist: Math.abs(pr - midR) + Math.abs(pc - midC),
    })).sort((a, b) => a.dist - b.dist);

    for (const { anchorR, anchorC } of candidates) {
      if (checkPlacement(puzzle.board, occ, oriented, anchorR, anchorC).valid) {
        this.snapRow.set(anchorR); this.snapCol.set(anchorC);
        return;
      }
    }

    // No valid placement found — show as invalid at center position
    this.snapRow.set(centerAnchorR); this.snapCol.set(centerAnchorC);
  }

  private finishDrag(pieceId: string): void {
    const sr = this.snapRow(), sc = this.snapCol();
    const piece = this.game.puzzle()?.pieces.find(p => p.id === pieceId);
    if (piece && sr >= -5 && sc >= -5) {
      if (this.game.placePiece(pieceId, sr, sc, piece.currentOrientation)) {
        this.selectedBoardPieceId.set(pieceId);
      }
    }
    this.snapRow.set(-1); this.snapCol.set(-1);
  }

  private getGhostCells(): [number, number][] {
    // Only show ghost during active drag (activeDragPieceId is set)
    const id = this.activeDragPieceId();
    if (!id) return [];
    const sr = this.snapRow(), sc = this.snapCol(); if (sr < -5 || sc < -5) return [];
    const piece = this.game.puzzle()?.pieces.find(p => p.id === id);
    if (!piece) return [];
    return this.getOrientedCells(piece).map(([r, c]) => [sr + r, sc + c] as [number, number]);
  }

  private isGhostValid(ghost: [number, number][]): boolean {
    const id = this.activeDragPieceId();
    if (!id) return false;
    const puzzle = this.game.puzzle(); if (!puzzle || !ghost.length) return false;
    const piece = puzzle.pieces.find(p => p.id === id);
    if (!piece) return false;
    const oriented = this.getOrientedCells(piece); if (!oriented.length) return false;
    return checkPlacement(puzzle.board, this.game.boardState(), oriented, ghost[0][0] - oriented[0][0], ghost[0][1] - oriented[0][1]).valid;
  }

  onCellClick(row: number, col: number): void {
    if (!this.game.puzzle() || this.game.solved() || this.isDragging) return;
    const oid = this.game.boardState().cells[row]?.[col];
    if (oid) return; // Placed piece clicks handled by drag handler

    // Click on empty cell: deselect board piece, or place selected tray piece
    if (this.selectedBoardPieceId()) {
      this.selectedBoardPieceId.set(null);
      return;
    }
    const piece = this.selectedPiece();
    if (piece) {
      const oriented = this.getOrientedCells(piece);
      if (!oriented.length) return;
      const puzzle = this.game.puzzle()!;
      const occ = this.game.boardState();

      // Try center-based anchor first
      const midR = (Math.min(...oriented.map(([r]) => r)) + Math.max(...oriented.map(([r]) => r))) / 2;
      const midC = (Math.min(...oriented.map(([, c]) => c)) + Math.max(...oriented.map(([, c]) => c))) / 2;
      const centerR = Math.round(row - midR), centerC = Math.round(col - midC);
      if (this.game.placePiece(piece.id, centerR, centerC, piece.currentOrientation)) {
        this.game.selectedPieceId.set(null); return;
      }

      // Try each cell of the piece over the clicked cell, closest to center first
      const candidates = oriented.map(([pr, pc]) => ({
        anchorR: row - pr, anchorC: col - pc,
        dist: Math.abs(pr - midR) + Math.abs(pc - midC),
      })).sort((a, b) => a.dist - b.dist);

      for (const { anchorR, anchorC } of candidates) {
        if (this.game.placePiece(piece.id, anchorR, anchorC, piece.currentOrientation)) {
          this.game.selectedPieceId.set(null); return;
        }
      }
    }
  }

  onCellDblClick(_row: number, _col: number): void {
    // Double-click removal is handled by the drag handler
  }

  rotateSelected(): void {
    const boardId = this.selectedBoardPieceId();
    if (boardId) {
      if (!this.game.rotatePlacedPiece(boardId, false)) this.flashError();
      return;
    }
    const id = this.game.selectedPieceId() ?? this.activeDragPieceId();
    if (id) this.game.rotatePiece(id);
  }
  rotateSelectedCCW(): void {
    const boardId = this.selectedBoardPieceId();
    if (boardId) {
      if (!this.game.rotatePlacedPiece(boardId, true)) this.flashError();
      return;
    }
    const id = this.game.selectedPieceId() ?? this.activeDragPieceId();
    if (id) { this.game.rotatePiece(id); this.game.rotatePiece(id); this.game.rotatePiece(id); }
  }
  flipSelected(): void {
    const boardId = this.selectedBoardPieceId();
    if (boardId) {
      if (!this.game.flipPlacedPiece(boardId)) this.flashError();
      return;
    }
    const id = this.game.selectedPieceId() ?? this.activeDragPieceId();
    if (id) this.game.flipPiece(id);
  }

  removeSelected(): void {
    const boardId = this.selectedBoardPieceId();
    if (boardId) {
      this.selectedBoardPieceId.set(null);
      this.game.removePiece(boardId);
      this.game.selectedPieceId.set(boardId);
    }
  }

  private flashError(): void {
    this.rotateFlashError.set(true);
    setTimeout(() => this.rotateFlashError.set(false), 400);
  }

  onHint(): void {
    this.confirmSvc.confirm({ message: 'Use a hint? One piece will be placed for you.', confirmLabel: 'Show Hint', cancelLabel: 'Cancel', confirmColor: 'primary' })
      .then(r => { if (r === 'confirm') this.game.requestHint(); });
  }
  onGiveUp(): void {
    this.confirmSvc.confirm({
      message: 'Give up on this puzzle?',
      confirmLabel: 'Show Solution',
      confirmColor: 'danger',
      secondaryLabel: 'Go home',
      secondarySubLabel: 'Progress saved',
      secondaryColor: 'primary',
      tertiaryLabel: 'Leave',
      tertiaryColor: 'danger',
    }).then(r => {
      if (r === 'confirm') this.game.giveUp();
      else if (r === 'secondary') {
        this.game.persistState();
        this.game.stage.set('idle');
        try { localStorage.removeItem('doitoo:last-route'); } catch {}
        this.router.navigateByUrl('/');
      } else if (r === 'tertiary') {
        this.game.abortSession();
      }
    });
  }

  @HostListener('window:resize') onResize(): void { this.viewportTick.update(n => n + 1); }
  @HostListener('window:keydown', ['$event']) onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.onGiveUp();
    else if (e.key === 'r' || e.key === 'R') this.rotateSelected();
    else if (e.key === 'f' || e.key === 'F') this.flipSelected();
    else if (e.key === 'h' || e.key === 'H') this.onHint();
  }

  ngOnDestroy(): void {
    if (!this.game.solved() && !this.game.gaveUp()) {
      this.game.persistState();
    }
    window.visualViewport?.removeEventListener('resize', this.vpListener);
    this.cleanupFns.forEach(fn => fn());
  }

  getOrientedCells(piece: PuzzlePiece): [number, number][] {
    let c = normalize(piece.cells);
    if (piece.currentOrientation.flipped) c = flipH(c);
    for (let i = 0; i < piece.currentOrientation.rotation; i++) c = rotateCW(c);
    return c;
  }
  pieceBounds(piece: PuzzlePiece): { width: number; height: number } {
    const c = this.getOrientedCells(piece);
    return c.length ? { width: Math.max(...c.map(([, x]) => x)) + 1, height: Math.max(...c.map(([r]) => r)) + 1 } : { width: 1, height: 1 };
  }
  formatTime(sec: number): string {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  pieceGridCells(piece: PuzzlePiece): boolean[] {
    const c = this.getOrientedCells(piece), b = this.pieceBounds(piece), s = new Set(c.map(([r, x]) => `${r},${x}`));
    const g: boolean[] = [];
    for (let r = 0; r < b.height; r++) for (let x = 0; x < b.width; x++) g.push(s.has(`${r},${x}`));
    return g;
  }
}
