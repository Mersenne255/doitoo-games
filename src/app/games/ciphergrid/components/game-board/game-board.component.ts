import {
  Component,
  ChangeDetectionStrategy,
  OnDestroy,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core';
import { GameService } from '../../services/game.service';
import { Puzzle, PuzzleResult } from '../../models/game.models';

type BoardPhase = 'input' | 'success' | 'show-solution' | 'timeout';

@Component({
  selector: 'app-game-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="board">
      <!-- Top bar -->
      <div class="top-bar">
        <span class="progress">Puzzle {{ currentIndex() + 1 }} / {{ totalPuzzles() }}</span>
        <button class="abort-btn" (click)="onAbort()" aria-label="Abort">✕</button>
      </div>

      <!-- Timer bar -->
      @if (hasTimer()) {
        <div class="timer-bar-track">
          <div class="timer-bar-fill"
               [style.width.%]="timerPercent()"
               [class.urgent]="timerPercent() < 25"></div>
        </div>
      }

      <!-- Evaluation mode label -->
      @if (puzzle(); as p) {
        <div class="eval-mode">{{ p.chainingMode === 'chained' ? 'left-to-right' : 'standard math' }}</div>
      }

      <!-- Grid area -->
      @if (puzzle(); as p) {
        <div class="grid-wrapper">
          <table class="grid-table" role="grid">
            @for (row of gridRows(); track row; let ri = $index) {
              <!-- Vertical operator row (between cell rows) -->
              @if (ri > 0) {
                <tr class="op-row">
                  @for (col of gridCols(); track col; let ci = $index) {
                    @if (ci > 0) {
                      <td class="op-spacer"></td>
                    }
                    <td class="col-op-cell">{{ getColOp(p, ci, ri - 1) }}</td>
                  }
                  <td class="op-spacer"></td>
                  <td class="op-spacer"></td>
                </tr>
              }
              <!-- Cell row -->
              <tr>
                @for (col of gridCols(); track col; let ci = $index) {
                  @if (ci > 0) {
                    <td class="op-cell">{{ getRowOp(p, ri, ci - 1) }}</td>
                  }
                  <td class="cell"
                       [class.number-cell]="p.grid[ri][ci].kind === 'number'"
                       [class.hidden-cell]="p.grid[ri][ci].kind === 'hidden'"
                       [class.feedback-correct]="getCellFeedback(ri, ci) === 'correct'"
                       [class.feedback-incorrect]="getCellFeedback(ri, ci) === 'incorrect'"
                       [class.revealed]="isRevealed(ri, ci)"
                       (click)="onCellTap(ri, ci)">
                    {{ getCellDisplay(p, ri, ci) }}
                  </td>
                }
                <td class="eq-symbol">=</td>
                <td class="result-cell">{{ p.rowEquations[ri].result }}</td>
              </tr>
            }
            <!-- Column "=" row -->
            <tr class="op-row">
              @for (col of gridCols(); track col; let ci = $index) {
                @if (ci > 0) {
                  <td class="op-spacer"></td>
                }
                <td class="eq-symbol col-eq">=</td>
              }
              <td class="op-spacer"></td>
              <td class="op-spacer"></td>
            </tr>
            <!-- Column results row -->
            <tr>
              @for (col of gridCols(); track col; let ci = $index) {
                @if (ci > 0) {
                  <td class="op-spacer"></td>
                }
                <td class="result-cell col-result">{{ p.colEquations[ci].result }}</td>
              }
              <td class="op-spacer"></td>
              <td class="op-spacer"></td>
            </tr>
          </table>
        </div>
      }

      <!-- Show Solution button -->
      @if (boardPhase() === 'show-solution' && !solutionRevealed()) {
        <button class="show-solution-btn" (click)="onShowSolution()">Show Solution</button>
      }

      <!-- Number Pad overlay -->
      @if (padOpen()) {
        <div class="pad-backdrop" (click)="dismissPad()"></div>
        <div class="number-pad">
          <div class="pad-display">{{ padValue() === '' ? '?' : padValue() }}</div>
          <div class="pad-grid">
            @for (d of digits; track d) {
              <button class="pad-btn" (click)="onPadDigit(d)">{{ d }}</button>
            }
            <button class="pad-btn pad-backspace" (click)="onPadBackspace()">⌫</button>
            <button class="pad-btn pad-confirm" (click)="onPadConfirm()">✓</button>
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
      padding: 0.75rem 1rem;
      max-width: 600px;
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress { color: #94a3b8; font-size: 0.85rem; font-weight: 600; }

    .abort-btn {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(15, 15, 26, 0.85);
      color: #fca5a5; font-size: 0.875rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
      &:hover { background: rgba(239, 68, 68, 0.25); }
    }

    .timer-bar-track {
      height: 4px; background: rgba(255,255,255,0.1);
      border-radius: 2px; margin-top: 0.5rem; overflow: hidden;
    }
    .timer-bar-fill {
      height: 100%; background: #6366f1; border-radius: 2px;
      transition: width 50ms linear;
    }
    .timer-bar-fill.urgent { background: #ef4444; }

    .eval-mode {
      text-align: center; color: #64748b; font-size: 0.7rem;
      font-weight: 500; margin: 0.5rem 0 0.25rem; text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .grid-wrapper {
      flex: 1; display: flex; align-items: center; justify-content: center;
      overflow: hidden; padding: 0.5rem 0;
    }

    .grid-table {
      border-collapse: separate;
      border-spacing: 2px;
    }

    .op-row td { padding: 0; }

    .col-op-cell {
      color: #64748b; font-size: 0.85rem; font-weight: 600;
      text-align: center; padding: 0.1rem 0;
    }

    .op-spacer { width: 0; }

    .cell {
      min-width: 44px; min-height: 44px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.1rem; color: #e2e8f0;
      border-radius: 0.5rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(6px);
      padding: 0.25rem 0.5rem;
      transition: box-shadow 0.2s, border-color 0.2s;
    }

    .number-cell { color: #cbd5e1; }

    .hidden-cell {
      color: #a5b4fc; cursor: pointer;
      border: 1.5px solid rgba(99, 102, 241, 0.5);
      animation: pulse-border 2s ease-in-out infinite;
    }
    .hidden-cell:hover { border-color: rgba(99, 102, 241, 0.8); }

    @keyframes pulse-border {
      0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
      50% { border-color: rgba(99, 102, 241, 0.7); }
    }

    .feedback-correct {
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6), 0 0 24px rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.6) !important;
      animation: none;
    }
    .feedback-incorrect {
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6), 0 0 24px rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.6) !important;
      animation: none;
    }
    .revealed {
      color: #86efac !important;
      border-color: rgba(34, 197, 94, 0.5) !important;
      animation: none;
    }

    .op-cell {
      color: #64748b; font-size: 0.85rem; font-weight: 600;
      min-width: 20px; text-align: center;
    }

    .eq-symbol {
      color: #64748b; font-size: 0.9rem; font-weight: 600;
      min-width: 16px; text-align: center;
    }
    .col-eq { padding-top: 0.25rem; }

    .result-cell {
      color: #fbbf24; font-weight: 700; font-size: 1rem;
      min-width: 32px; text-align: center;
    }
    .result-cell.empty { visibility: hidden; }
    .result-cell.col-result { padding-top: 0; }

    .show-solution-btn {
      align-self: center; margin: 0.75rem 0;
      padding: 0.5rem 1.5rem; border-radius: 0.5rem;
      border: 1px solid rgba(99, 102, 241, 0.5);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc; font-weight: 600; font-size: 0.9rem;
      cursor: pointer; transition: background 0.2s;
      &:hover { background: rgba(99, 102, 241, 0.35); }
    }

    .pad-backdrop {
      position: fixed; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.3);
    }

    .number-pad {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      z-index: 60; background: rgba(15, 15, 26, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 1rem; padding: 1rem;
      backdrop-filter: blur(12px);
      min-width: 240px;
    }

    .pad-display {
      text-align: center; font-size: 1.5rem; font-weight: 800;
      color: #e2e8f0; margin-bottom: 0.75rem;
      min-height: 2rem;
    }

    .pad-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0.4rem;
    }

    .pad-btn {
      min-width: 44px; min-height: 44px;
      border-radius: 0.5rem;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06);
      color: #e2e8f0; font-size: 1.1rem; font-weight: 700;
      cursor: pointer; transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.12); }
    }
    .pad-backspace { color: #fca5a5; }
    .pad-confirm {
      background: rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.4);
      color: #86efac;
      &:hover { background: rgba(34, 197, 94, 0.35); }
    }
  `],
})
export class GameBoardComponent implements OnDestroy {
  readonly game = inject(GameService);

  readonly puzzle = this.game.currentPuzzle;
  readonly currentIndex = this.game.currentPuzzleIndex;
  readonly totalPuzzles = computed(() => this.game.puzzles().length);
  readonly hasTimer = computed(() => this.game.difficultyParams().responseWindowMs !== null);

  readonly boardPhase = signal<BoardPhase>('input');
  readonly timerPercent = signal<number>(100);
  readonly padOpen = signal(false);
  readonly padValue = signal('');
  readonly solutionRevealed = signal(false);

  private padRow = 0;
  private padCol = 0;
  private puzzleStartTime = 0;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  readonly gridRows = computed(() => {
    const p = this.puzzle();
    return p ? Array.from({ length: p.gridSize }, (_, i) => i) : [];
  });

  readonly gridCols = computed(() => {
    const p = this.puzzle();
    return p ? Array.from({ length: p.gridSize }, (_, i) => i) : [];
  });

  constructor() {
    effect(() => {
      this.game.currentPuzzleIndex(); // track changes
      const stage = this.game.stage();
      if (stage === 'playing') {
        this.resetForNewPuzzle();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  getRowOp(p: Puzzle, row: number, opIdx: number): string {
    const op = p.rowEquations[row].operators[opIdx];
    return opSymbol(op);
  }

  getColOp(p: Puzzle, col: number, opIdx: number): string {
    const op = p.colEquations[col].operators[opIdx];
    return opSymbol(op);
  }

  getCellDisplay(p: Puzzle, row: number, col: number): string {
    const cell = p.grid[row][col];
    if (cell.kind === 'number') return String(cell.value);

    // If solution revealed, show solution value
    if (this.solutionRevealed()) return String(cell.solutionValue);

    const gs = this.game.gridState();
    const val = gs.entries.get(`${row},${col}`);
    if (val != null) return String(val);
    return '?';
  }

  getCellFeedback(row: number, col: number): string | null {
    const p = this.puzzle();
    if (!p) return null;
    const cell = p.grid[row][col];
    if (cell.kind === 'number') return null;
    if (this.solutionRevealed()) return null;
    const gs = this.game.gridState();
    return gs.feedback.get(`${row},${col}`) ?? null;
  }

  isRevealed(row: number, col: number): boolean {
    if (!this.solutionRevealed()) return false;
    const p = this.puzzle();
    if (!p) return false;
    return p.grid[row][col].kind === 'hidden';
  }

  onCellTap(row: number, col: number): void {
    if (this.boardPhase() !== 'input') return;
    const p = this.puzzle();
    if (!p) return;
    const cell = p.grid[row][col];
    if (cell.kind !== 'hidden') return;

    this.padRow = row;
    this.padCol = col;
    const gs = this.game.gridState();
    const existing = gs.entries.get(`${row},${col}`);
    this.padValue.set(existing != null ? String(existing) : '');
    this.padOpen.set(true);
  }

  onPadDigit(d: number): void {
    const p = this.puzzle();
    if (!p) return;
    const max = p.numberRange.max;
    const current = this.padValue();
    const next = current + String(d);
    const num = parseInt(next, 10);
    if (num > max) return; // constrain to valid range
    this.padValue.set(next);
  }

  onPadBackspace(): void {
    const current = this.padValue();
    this.padValue.set(current.slice(0, -1));
  }

  onPadConfirm(): void {
    const val = parseInt(this.padValue(), 10);
    const p = this.puzzle();
    if (!p || isNaN(val) || val < p.numberRange.min) {
      this.dismissPad();
      return;
    }
    this.game.commitCellValue(this.padRow, this.padCol, val);
    this.padOpen.set(false);
    this.padValue.set('');
    this.checkCompletion();
  }

  dismissPad(): void {
    this.padOpen.set(false);
    this.padValue.set('');
  }

  onAbort(): void {
    this.clearAllTimers();
    this.game.abortSession();
  }

  onShowSolution(): void {
    this.solutionRevealed.set(true);
    this.scheduleComplete(false, 2000);
  }

  private resetForNewPuzzle(): void {
    this.clearAllTimers();
    this.boardPhase.set('input');
    this.timerPercent.set(100);
    this.padOpen.set(false);
    this.padValue.set('');
    this.solutionRevealed.set(false);
    this.puzzleStartTime = Date.now();
    if (this.hasTimer()) {
      this.startTimer();
    }
  }

  private startTimer(): void {
    const windowMs = this.game.difficultyParams().responseWindowMs;
    if (!windowMs) return;
    const startTime = Date.now();

    this.timerIntervalId = setInterval(() => {
      if (this.game.stage() !== 'playing') { this.clearTimer(); return; }
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / windowMs) * 100);
      this.timerPercent.set(remaining);
      if (remaining <= 0) this.onTimeout();
    }, 50);
  }

  private onTimeout(): void {
    if (this.boardPhase() !== 'input') return;
    this.clearTimer();
    this.boardPhase.set('timeout');
    this.solutionRevealed.set(true);
    this.scheduleComplete(true, 2000);
  }

  private checkCompletion(): void {
    const p = this.puzzle();
    if (!p) return;
    const gs = this.game.gridState();

    // Check if all hidden cells are filled
    for (const [r, c] of p.hiddenCells) {
      if (gs.entries.get(`${r},${c}`) == null) return;
    }

    // All filled — check if all correct
    let allCorrect = true;
    for (const [r, c] of p.hiddenCells) {
      const fb = gs.feedback.get(`${r},${c}`);
      if (fb !== 'correct') { allCorrect = false; break; }
    }

    if (allCorrect) {
      this.boardPhase.set('success');
      this.scheduleComplete(false, 1000);
    } else {
      this.boardPhase.set('show-solution');
    }
  }

  private buildPuzzleResult(timedOut: boolean): PuzzleResult | null {
    const p = this.puzzle();
    if (!p) return null;
    const gs = this.game.gridState();
    const solveTimeMs = timedOut ? null : Date.now() - this.puzzleStartTime;

    let correctCount = 0;
    for (const [r, c] of p.hiddenCells) {
      const val = gs.entries.get(`${r},${c}`);
      if (val === p.solution[r][c]) correctCount++;
    }

    const perfect = correctCount === p.hiddenCells.length && !timedOut;

    return {
      puzzle: p,
      playerValues: new Map(gs.entries),
      perfect,
      correctCellCount: correctCount,
      totalHiddenCells: p.hiddenCells.length,
      solveTimeMs,
      timedOut,
    };
  }

  private scheduleComplete(timedOut: boolean, delayMs: number): void {
    const result = this.buildPuzzleResult(timedOut);
    this.advanceTimeoutId = setTimeout(() => {
      if (result && this.game.stage() === 'playing') {
        this.game.completePuzzle(result);
      }
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private clearAllTimers(): void {
    this.clearTimer();
    if (this.advanceTimeoutId !== null) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
  }
}

function opSymbol(op: string): string {
  switch (op) {
    case '+': return '+';
    case '-': return '−';
    case '*': return '×';
    case '/': return '÷';
    default: return op;
  }
}
