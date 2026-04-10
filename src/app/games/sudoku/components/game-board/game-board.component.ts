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
import { explain } from '../../utils/explainer.util';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      @if (game.isWalkthrough()) {
        <div class="walkthrough">
          <div class="grid-container" [style.--grid-size]="gridSize()">
            @for (row of gridRows(); track rIdx; let rIdx = $index) {
              @for (cell of row; track cIdx; let cIdx = $index) {
                <div class="cell"
                  [class.box-right]="isBoxRight(cIdx)"
                  [class.box-bottom]="isBoxBottom(rIdx)"
                  [class.wt-highlight]="isWtHighlight(rIdx, cIdx)"
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
        <div class="play-area">
          <div class="grid-container" [style.--grid-size]="gridSize()">
            @for (row of gridRows(); track rIdx; let rIdx = $index) {
              @for (cell of row; track cIdx; let cIdx = $index) {
                <div class="cell"
                  [class.box-right]="isBoxRight(cIdx)"
                  [class.box-bottom]="isBoxBottom(rIdx)"
                  [class.selected]="isSelected(rIdx, cIdx)"
                  [class.same-unit]="isSameUnit(rIdx, cIdx)"
                  [class.same-digit]="isSameDigit(rIdx, cIdx)"
                  [class.hint-highlight]="isHintHighlight(rIdx, cIdx)"
                  [class.given]="cell.isGiven"
                  [class.player]="!cell.isGiven && cell.value !== 0"
                  [class.multi]="!cell.isGiven && cell.pencilMarks.size > 1"
                  (click)="game.selectCell(rIdx, cIdx)">
                  @if (cell.value !== 0 && cell.pencilMarks.size <= 1) {
                    <span class="cell-value">{{ cell.value }}</span>
                  } @else if (cell.pencilMarks.size > 0) {
                    <div class="multi-digits">
                      @for (d of sortedMarks(cell.pencilMarks); track d; let last = $last) {
                        <span class="multi-num">{{ d }}</span>@if (!last) {<span class="multi-sep">,</span>}
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <div class="controls" [class.hidden]="game.solved()">
            <div class="number-pad">
              @for (d of digits(); track d) {
                <button class="num-btn" [class.active]="isDigitInCell(d)" (click)="onDigit(d)">{{ d }}</button>
              }
            </div>

            <div class="tool-bar">
              <button class="tool-btn" [disabled]="game.undoStack().length === 0"
                (click)="game.undo()" aria-label="Undo">↩</button>
              <button class="tool-btn" [disabled]="game.redoStack().length === 0"
                (click)="game.redo()" aria-label="Redo">↪</button>
              <button class="tool-btn hint" (click)="onHint()" aria-label="Hint">💡</button>
              <button class="tool-btn give-up" (click)="onGiveUp()" aria-label="Give up">🏳️</button>
            </div>
          </div>

          @if (showSolvedToast) {
            <div class="solved-toast">Correct</div>
          }

          @if (game.solved()) {
            <div class="summary-bar">
              <div class="summary-content">
                <div class="stat">
                  <span class="stat-label">Time</span>
                  <span class="stat-value">{{ game.solveTimeSec() }}s</span>
                </div>
                <div class="summary-actions">
                  <button class="back-btn" (click)="game.abortSession()">Back</button>
                  <button class="again-btn" (click)="game.startSession()">Again</button>
                </div>
              </div>
            </div>
          }
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
      padding: 0;
      max-width: 600px;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .play-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 0.5rem;
      overflow: hidden;
      align-items: center;
    }

    .grid-container {
      display: grid;
      grid-template-columns: repeat(var(--grid-size), 1fr);
      grid-template-rows: repeat(var(--grid-size), 1fr);
      aspect-ratio: 1;
      width: 100%;
      max-width: 100vw;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-sizing: border-box;
      container-type: inline-size;
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
    .cell.hint-highlight { background: rgba(34, 197, 94, 0.3); }

    .cell.given .cell-value { font-weight: 500; color: white; }
    .cell.player .cell-value { font-weight: 300; color: #a5b4fc; }

    .cell-value {
      font-size: calc(50cqi / var(--grid-size));
      font-weight: 300;
      line-height: 1;
    }

    .cell.multi {
      outline: 1px solid rgba(245, 158, 11, 0.6);
      outline-offset: -1px;
    }

    .multi-digits {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 4%;
      box-sizing: border-box;
    }

    .multi-num {
      font-weight: 300;
      color: #a5b4fc;
      line-height: 1.1;
      text-align: center;
      font-size: calc(30cqi / var(--grid-size));
    }

    .multi-sep {
      font-size: calc(22cqi / var(--grid-size));
      color: #475569;
      margin-right: 1px;
    }

    .cell.wt-highlight { background: rgba(34, 197, 94, 0.25); }

    .controls.hidden { display: none; }

    .solved-toast {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 25;
      pointer-events: none;
      font-size: 2rem;
      font-weight: 800;
      color: #86efac;
      text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
      animation: toast-pop 1.8s ease forwards;
    }

    @keyframes toast-pop {
      0% { opacity: 0; transform: translateX(-50%) scale(0.8); }
      15% { opacity: 1; transform: translateX(-50%) scale(1.05); }
      30% { transform: translateX(-50%) scale(1); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }

    .summary-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 20;
      background: rgba(15, 15, 26, 0.95);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(99, 102, 241, 0.2);
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-label { font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-value { font-size: 1.25rem; font-weight: 800; color: #e2e8f0; }

    .summary-actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      max-width: 20rem;
    }

    .back-btn, .again-btn {
      flex: 1;
      padding: 0.6rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
      text-align: center;
    }

    .back-btn {
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
    }
    .back-btn:hover { background: rgba(255, 255, 255, 0.12); }

    .again-btn {
      border: 1px solid rgba(34, 197, 94, 0.5);
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }
    .again-btn:hover { background: rgba(34, 197, 94, 0.35); }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
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
    .num-btn.active {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      border-color: transparent;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
    }

    .tool-bar {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .tool-btn {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: #94a3b8;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tool-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
    .tool-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .tool-btn.active {
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      color: white;
      border-color: transparent;
    }

    .tool-btn.give-up {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }
    .tool-btn.give-up:hover { background: rgba(239, 68, 68, 0.25); }

    .action-btn {
      padding: 0.5rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
      outline: none;
    }

    .action-btn.primary {
      border: 1px solid rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .action-btn.primary:hover { background: rgba(99, 102, 241, 0.35); }

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
      margin: 0 0.75rem;
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
      .board { padding: 0.5rem; }

      .grid-container {
        max-width: 70vh;
      }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);
  private readonly confirmSvc = inject(ConfirmService);

  // Hint state: first click highlights, second click fills
  readonly hintCell = signal<{ row: number; col: number } | null>(null);
  showSolvedToast = false;
  private solvedToastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.game.solved()) {
        this.showSolvedToast = true;
        this.solvedToastTimeout = setTimeout(() => { this.showSolvedToast = false; }, 1800);
      }
    });
  }

  readonly gridSize = this.game.gridSize;
  readonly gridRows = this.game.grid;

  readonly digits = computed(() => {
    const size = this.gridSize();
    return Array.from({ length: size }, (_, i) => i + 1);
  });

  readonly boxRows = computed(() => this.game.config().boxDimension[0]);
  readonly boxCols = computed(() => this.game.config().boxDimension[1]);

  readonly currentWtStep = computed(() => {
    const steps = this.game.walkthroughSteps();
    const idx = this.game.walkthroughIndex();
    return idx > 0 && idx <= steps.length ? steps[idx - 1] : steps[0] ?? null;
  });

  ngOnDestroy(): void {
    if (this.solvedToastTimeout) { clearTimeout(this.solvedToastTimeout); }
  }

  isBoxRight(col: number): boolean {
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

  isHintHighlight(row: number, col: number): boolean {
    const h = this.hintCell();
    return h !== null && h.row === row && h.col === col;
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

  sortedMarks(marks: Set<number>): number[] {
    return [...marks].sort((a, b) => a - b);
  }

  isDigitInCell(d: number): boolean {
    const sel = this.game.selection();
    if (!sel) return false;
    const g = this.game.grid();
    const cell = g[sel.row]?.[sel.col];
    if (!cell || cell.isGiven) return false;
    return cell.pencilMarks.has(d) || cell.value === d;
  }

  onDigit(d: number): void {
    this.hintCell.set(null); // clear hint highlight on any action
    this.game.enterDigit(d);
    this.game.checkCompletion();
  }

  onHint(): void {
    const current = this.hintCell();
    if (current) {
      // Second click — fill the hint cell (already highlighted, no confirm needed)
      this.hintCell.set(null);
      this.game.requestHint();
      this.game.checkCompletion();
    } else {
      // First click — confirm, then highlight
      this.confirmSvc.confirm({
        message: 'Use a hint? The next solvable cell will be highlighted.',
        confirmLabel: 'Show Hint',
        cancelLabel: 'Cancel',
        confirmColor: 'primary',
      }).then(result => {
        if (result !== 'confirm') return;
        const gridValues = this.game.getGridValues();
        const puzzle = this.game.currentPuzzle();
        if (!puzzle) return;
        const steps = explain(gridValues, puzzle.boxRows, puzzle.boxCols);
        if (steps.length > 0 && steps[0].cells.length > 0) {
          this.hintCell.set({ row: steps[0].cells[0].row, col: steps[0].cells[0].col });
        }
      });
    }
  }

  onGiveUp(): void {
    this.confirmSvc.confirm({
      message: 'Give up on this puzzle?',
      cancelLabel: 'Keep Trying',
      confirmLabel: 'Show Solution',
      confirmColor: 'danger',
      secondaryLabel: 'Exit Game',
      secondaryColor: 'danger',
    }).then(result => {
      if (result === 'confirm') {
        this.game.giveUp();
      } else if (result === 'secondary') {
        this.game.abortSession();
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.game.stage() !== 'playing' || this.game.isWalkthrough()) return;

    const key = event.key;

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

    const digit = parseInt(key, 10);
    if (digit >= 1 && digit <= this.gridSize()) {
      this.onDigit(digit);
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      this.game.clearCell();
      return;
    }

    if (key.toLowerCase() === 'h') {
      this.onHint();
      return;
    }
  }
}
