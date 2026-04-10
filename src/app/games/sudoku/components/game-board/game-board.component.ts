import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  HostListener,
  OnDestroy,
  effect,
} from '@angular/core';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar -->
      <div class="top-bar">
        <span class="progress">Puzzle {{ game.currentPuzzleIndex() + 1 }} / {{ game.puzzles().length }}</span>
        <span class="timer" [class.urgent]="timerUrgent()">{{ timerDisplay() }}</span>
        <button class="abort-btn" (click)="game.abortSession()" aria-label="Abort">✕</button>
      </div>

      @if (game.isWalkthrough()) {
        <!-- Walkthrough view -->
        <div class="walkthrough">
          <div class="grid-container" [style.--grid-size]="gridSize()">
            @for (row of gridRows(); track $index) {
              @for (cell of row; track $index) {
                <div class="cell"
                  [class.box-right]="isBoxRight($index, rowIdx()[$index])"
                  [class.box-bottom]="isBoxBottom(rowIdx()[$index])"
                  [class.wt-highlight]="isWtHighlight(rowIdx()[$index], $index)"
                  [class.given]="cell.isGiven">
                  <span class="cell-value">{{ cell.value || '' }}</span>
                </div>
              }
            }
          </div>

          @if (currentWtStep(); as step) {
            <div class="wt-info">
              <span class="wt-technique">{{ formatTechnique(step.technique) }}</span>
              <span class="wt-explanation">{{ step.explanation }}</span>
            </div>
          }

          <div class="wt-actions">
            @if (game.walkthroughIndex() < game.walkthroughSteps().length) {
              <button class="action-btn primary" (click)="game.advanceWalkthrough()">Next Step</button>
            } @else {
              <button class="action-btn primary" (click)="game.finishWalkthrough()">Continue</button>
            }
          </div>
        </div>
      } @else {
        <!-- Normal play view -->
        <div class="play-area">
          <div class="grid-container" [style.--grid-size]="gridSize()">
            @for (row of gridRows(); track rIdx; let rIdx = $index) {
              @for (cell of row; track cIdx; let cIdx = $index) {
                <div class="cell"
                  [class.box-right]="isBoxRight(cIdx, rIdx)"
                  [class.box-bottom]="isBoxBottom(rIdx)"
                  [class.selected]="isSelected(rIdx, cIdx)"
                  [class.same-unit]="isSameUnit(rIdx, cIdx)"
                  [class.same-digit]="isSameDigit(rIdx, cIdx)"
                  [class.given]="cell.isGiven"
                  [class.player]="!cell.isGiven && cell.value !== 0"
                  [class.conflict]="isConflict(rIdx, cIdx)"
                  (click)="game.selectCell(rIdx, cIdx)">
                  @if (cell.value !== 0) {
                    <span class="cell-value">{{ cell.value }}</span>
                  } @else if (cell.pencilMarks.size > 0) {
                    <div class="pencil-grid" [style.--pm-cols]="pmCols()">
                      @for (d of digits(); track d) {
                        <span class="pencil-mark">{{ cell.pencilMarks.has(d) ? d : '' }}</span>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Controls -->
          <div class="controls">
            <div class="number-pad">
              @for (d of digits(); track d) {
                <button class="num-btn" (click)="onDigit(d)">{{ d }}</button>
              }
            </div>

            <div class="tool-bar">
              <button class="tool-btn" [class.active]="game.pencilMode()"
                (click)="game.togglePencilMode()" aria-label="Pencil mode">✏️ Pencil</button>
              <button class="tool-btn" [disabled]="game.undoStack().length === 0"
                (click)="game.undo()" aria-label="Undo">↩ Undo</button>
              <button class="tool-btn" [disabled]="game.redoStack().length === 0"
                (click)="game.redo()" aria-label="Redo">↪ Redo</button>
              @if (game.hintsRemaining() !== 0) {
                <button class="tool-btn hint" (click)="onHint()" aria-label="Hint"
                  [disabled]="game.hintsRemaining() !== null && game.hintsRemaining()! <= 0">
                  💡 Hint
                  @if (game.hintsRemaining() !== null) {
                    <span class="hint-count">({{ game.hintsRemaining() }})</span>
                  }
                </button>
              }
              <button class="tool-btn erase" (click)="game.clearCell()" aria-label="Erase">⌫ Erase</button>
            </div>

            <div class="bottom-actions">
              <button class="action-btn danger" (click)="onGiveUp()">Give Up</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }

    .board {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      padding: 0.5rem 0.75rem;
      max-width: 600px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
    }

    .progress {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .timer {
      color: #a5b4fc;
      font-size: 0.9rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .timer.urgent { color: #ef4444; }

    .abort-btn {
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
      transition: background 0.2s;
    }

    .abort-btn:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    /* Grid */
    .play-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.5rem;
      overflow: hidden;
    }

    .grid-container {
      display: grid;
      grid-template-columns: repeat(var(--grid-size), 1fr);
      grid-template-rows: repeat(var(--grid-size), 1fr);
      aspect-ratio: 1;
      width: 100%;
      max-height: 60vh;
      max-width: 60vh;
      margin: 0 auto;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-sizing: border-box;
    }

    .cell {
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      position: relative;
      user-select: none;
      transition: background 0.1s;
      overflow: hidden;
    }

    .cell.box-right { border-right: 2px solid rgba(255, 255, 255, 0.3); }
    .cell.box-bottom { border-bottom: 2px solid rgba(255, 255, 255, 0.3); }

    .cell.selected { background: rgba(99, 102, 241, 0.3); }
    .cell.same-unit { background: rgba(99, 102, 241, 0.1); }
    .cell.same-digit { background: rgba(99, 102, 241, 0.15); }
    .cell.selected.same-digit { background: rgba(99, 102, 241, 0.3); }

    .cell.given .cell-value { font-weight: 700; color: white; }
    .cell.player .cell-value { font-weight: 400; color: #a5b4fc; }
    .cell.conflict .cell-value { color: #ef4444 !important; }

    .cell-value {
      font-size: clamp(0.9rem, 3.5vw, 1.5rem);
      line-height: 1;
    }

    /* Pencil marks */
    .pencil-grid {
      display: grid;
      grid-template-columns: repeat(var(--pm-cols), 1fr);
      width: 100%;
      height: 100%;
      align-items: center;
      justify-items: center;
    }

    .pencil-mark {
      font-size: clamp(0.35rem, 1.2vw, 0.55rem);
      color: #94a3b8;
      line-height: 1;
    }

    /* Walkthrough highlight */
    .cell.wt-highlight {
      background: rgba(34, 197, 94, 0.25);
    }

    /* Controls */
    .controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.25rem;
    }

    .number-pad {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .num-btn {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }

    .num-btn:hover { background: rgba(99, 102, 241, 0.25); }

    .tool-bar {
      display: flex;
      gap: 0.35rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .tool-btn {
      padding: 0.35rem 0.6rem;
      border-radius: 0.4rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tool-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
    .tool-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .tool-btn.active {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      border-color: transparent;
    }

    .hint-count { font-size: 0.65rem; opacity: 0.8; }

    .bottom-actions {
      display: flex;
      justify-content: center;
      padding-bottom: 0.5rem;
    }

    .action-btn {
      padding: 0.5rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
    }

    .action-btn.danger {
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }

    .action-btn.danger:hover { background: rgba(239, 68, 68, 0.3); }

    .action-btn.primary {
      border: 1px solid rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .action-btn.primary:hover { background: rgba(99, 102, 241, 0.35); }

    /* Walkthrough */
    .walkthrough {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.75rem;
      align-items: center;
    }

    .wt-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.5rem;
      max-width: 100%;
    }

    .wt-technique {
      color: #a5b4fc;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: capitalize;
    }

    .wt-explanation {
      color: #94a3b8;
      font-size: 0.75rem;
      text-align: center;
    }

    .wt-actions {
      display: flex;
      justify-content: center;
    }

    @media (min-width: 600px) {
      .play-area {
        flex-direction: row;
        align-items: flex-start;
      }

      .grid-container {
        max-height: 70vh;
        flex: 1;
      }

      .controls {
        width: 10rem;
        padding-top: 0;
        padding-left: 0.75rem;
      }

      .number-pad {
        flex-direction: column;
      }

      .num-btn {
        width: 100%;
      }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  readonly elapsedSec = signal(0);
  private giveUpPending = false;

  readonly gridSize = this.game.gridSize;
  readonly gridRows = this.game.grid;

  readonly digits = computed(() => {
    const size = this.gridSize();
    return Array.from({ length: size }, (_, i) => i + 1);
  });

  readonly pmCols = computed(() => {
    const size = this.gridSize();
    return size <= 4 ? 2 : size <= 6 ? 3 : 3;
  });

  readonly boxRows = computed(() => this.game.config().boxDimension[0]);
  readonly boxCols = computed(() => this.game.config().boxDimension[1]);

  readonly timerDisplay = computed(() => {
    const limit = this.game.timeLimitSec();
    const elapsed = this.elapsedSec();
    if (limit !== null) {
      const remaining = Math.max(0, Math.ceil(limit - elapsed));
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      return `${String(Math.min(m, 99)).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    return `${String(Math.min(m, 99)).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  readonly timerUrgent = computed(() => {
    const limit = this.game.timeLimitSec();
    if (limit === null) return false;
    const remaining = limit - this.elapsedSec();
    return remaining < limit * 0.25;
  });

  readonly currentWtStep = computed(() => {
    const steps = this.game.walkthroughSteps();
    const idx = this.game.walkthroughIndex();
    return idx > 0 && idx <= steps.length ? steps[idx - 1] : steps[0] ?? null;
  });

  constructor() {
    effect(() => {
      const stage = this.game.stage();
      const idx = this.game.currentPuzzleIndex();
      if (stage === 'playing') {
        this.startTimer();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // ── Grid helpers ──

  rowIdx(): number[] {
    return Array.from({ length: this.gridSize() }, (_, i) => i);
  }

  isBoxRight(col: number, _row: number): boolean {
    return (col + 1) % this.boxCols() === 0 && col + 1 < this.gridSize();
  }

  isBoxBottom(row: number): boolean {
    return (row + 1) % this.boxRows() === 0 && row + 1 < this.gridSize();
  }

  isSelected(row: number, col: number): boolean {
    const sel = this.game.selection();
    return sel !== null && sel.row === row && sel.col === col;
  }

  isSameUnit(row: number, col: number): boolean {
    const sel = this.game.selection();
    if (!sel || (sel.row === row && sel.col === col)) return false;
    if (sel.row === row || sel.col === col) return true;
    const br = this.boxRows();
    const bc = this.boxCols();
    return Math.floor(sel.row / br) === Math.floor(row / br) &&
           Math.floor(sel.col / bc) === Math.floor(col / bc);
  }

  isSameDigit(row: number, col: number): boolean {
    const sel = this.game.selection();
    if (!sel) return false;
    const g = this.game.grid();
    const selVal = g[sel.row]?.[sel.col]?.value;
    if (!selVal || selVal === 0) return false;
    if (sel.row === row && sel.col === col) return false;
    return g[row]?.[col]?.value === selVal;
  }

  isConflict(row: number, col: number): boolean {
    if (!this.game.config().errorHighlighting) return false;
    return this.game.conflicts().has(`${row},${col}`);
  }

  isWtHighlight(row: number, col: number): boolean {
    const steps = this.game.walkthroughSteps();
    const idx = this.game.walkthroughIndex();
    const stepIdx = idx > 0 ? idx - 1 : 0;
    const step = steps[stepIdx];
    if (!step) return false;
    return step.cells.some(c => c.row === row && c.col === col);
  }

  formatTechnique(t: string): string {
    return t.replace(/_/g, ' ');
  }

  // ── Actions ──

  onDigit(d: number): void {
    this.game.enterDigit(d);
    this.game.checkCompletion();
  }

  onHint(): void {
    this.game.requestHint();
    this.game.checkCompletion();
  }

  onGiveUp(): void {
    if (!this.giveUpPending) {
      this.giveUpPending = true;
      return;
    }
    this.giveUpPending = false;
    this.game.giveUp();
  }

  // ── Timer ──

  private startTimer(): void {
    this.stopTimer();
    this.elapsedSec.set(0);
    this.timerInterval = setInterval(() => {
      if (this.game.isPaused()) return;
      const elapsed = (this.game.pausedElapsedMs + (Date.now() - this.game.timerStartMs)) / 1000;
      this.elapsedSec.set(elapsed);

      const limit = this.game.timeLimitSec();
      if (limit !== null && elapsed >= limit) {
        this.stopTimer();
        this.game.onTimeout();
      }
    }, 250);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ── Keyboard ──

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.game.stage() !== 'playing' || this.game.isWalkthrough()) return;

    const key = event.key;

    // Arrow keys
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const sel = this.game.selection();
      if (!sel) { this.game.selectCell(0, 0); return; }
      const size = this.gridSize();
      let { row, col } = sel;
      if (key === 'ArrowUp') row = Math.max(0, row - 1);
      if (key === 'ArrowDown') row = Math.min(size - 1, row + 1);
      if (key === 'ArrowLeft') col = Math.max(0, col - 1);
      if (key === 'ArrowRight') col = Math.min(size - 1, col + 1);
      this.game.selectCell(row, col);
      return;
    }

    // Number keys
    const digit = parseInt(key, 10);
    if (digit >= 1 && digit <= this.gridSize()) {
      this.onDigit(digit);
      return;
    }

    // Pencil toggle
    if (key.toLowerCase() === 'p') {
      this.game.togglePencilMode();
      return;
    }

    // Erase
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.game.clearCell();
      return;
    }

    // Undo
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key.toLowerCase() === 'z') {
      event.preventDefault();
      this.game.undo();
      return;
    }

    // Redo
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key.toLowerCase() === 'z') {
      event.preventDefault();
      this.game.redo();
      return;
    }

    // Hint
    if (key.toLowerCase() === 'h') {
      this.onHint();
      return;
    }
  }
}
