import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import {
  GameStage,
  SudokuConfig,
  DEFAULT_CONFIG,
  Puzzle,
  CellState,
  CellPosition,
  ActionRecord,
  SolveStep,
  ScoringState,
  RoundResult,
  PuzzleResult,
} from '../models/game.models';
import { generateRound } from '../utils/puzzle-generator.util';
import { mapDifficultyToParams, getTimeLimitSec, getHintLimit } from '../utils/difficulty.util';
import { initialScoringState, processPuzzleResult, calculateRoundResult } from '../utils/scoring.util';
import { explain } from '../utils/explainer.util';
import { StorageService, SavedGameState } from './storage.service';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly storage = inject(StorageService);

  // ── Writable Signals ──

  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<SudokuConfig> = signal<SudokuConfig>(DEFAULT_CONFIG);
  readonly puzzles: WritableSignal<Puzzle[]> = signal<Puzzle[]>([]);
  readonly currentPuzzleIndex: WritableSignal<number> = signal(0);
  readonly grid: WritableSignal<CellState[][]> = signal<CellState[][]>([]);
  readonly selection: WritableSignal<CellPosition | null> = signal<CellPosition | null>(null);
  readonly pencilMode: WritableSignal<boolean> = signal(false);
  readonly undoStack: WritableSignal<ActionRecord[]> = signal<ActionRecord[]>([]);
  readonly redoStack: WritableSignal<ActionRecord[]> = signal<ActionRecord[]>([]);
  readonly isWalkthrough: WritableSignal<boolean> = signal(false);
  readonly walkthroughSteps: WritableSignal<SolveStep[]> = signal<SolveStep[]>([]);
  readonly walkthroughIndex: WritableSignal<number> = signal(0);
  readonly hintsUsed: WritableSignal<number> = signal(0);
  readonly errorCount: WritableSignal<number> = signal(0);
  readonly isPaused: WritableSignal<boolean> = signal(false);
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);
  readonly solved: WritableSignal<boolean> = signal(false);
  readonly solveTimeSec: WritableSignal<number> = signal(0);

  timerStartMs = 0;
  pausedElapsedMs = 0;

  // ── Computed Signals ──

  readonly currentPuzzle = computed(() => {
    const p = this.puzzles();
    const idx = this.currentPuzzleIndex();
    return p.length > 0 ? p[idx] : null;
  });

  readonly difficultyParams = computed(() =>
    mapDifficultyToParams(this.config().difficulty, this.config().boxDimension),
  );

  readonly gridSize = computed(() => {
    const [br, bc] = this.config().boxDimension;
    return br * bc;
  });

  readonly conflicts = computed(() => {
    const g = this.grid();
    if (g.length === 0) return new Set<string>();
    const [br, bc] = this.config().boxDimension;
    return findConflicts(g, br, bc);
  });

  readonly hintsRemaining = computed(() => {
    const limit = getHintLimit(this.config().speedMode);
    if (limit === null) return null; // unlimited
    return Math.max(0, limit - this.hintsUsed());
  });

  readonly isComplete = computed(() => {
    const g = this.grid();
    if (g.length === 0) return false;
    return g.every(row => row.every(cell => cell.value !== 0));
  });

  readonly timeLimitSec = computed(() =>
    getTimeLimitSec(this.config().difficulty, this.gridSize(), this.config().speedMode),
  );

  constructor() {
    this.config.set(this.storage.loadConfig());
  }

  // ── Public Methods ──

  updateConfig(partial: Partial<SudokuConfig>): void {
    this.config.update(c => ({ ...c, ...partial }));
    this.storage.saveConfig(this.config());
  }

  startSession(): void {
    const cfg = this.config();
    const params = this.difficultyParams();
    const [br, bc] = cfg.boxDimension;
    const seed = Date.now();
    const generated = generateRound(cfg.puzzleCount, br, bc, params, seed);
    this.puzzles.set(generated);
    this.currentPuzzleIndex.set(0);
    this.roundResult.set(null);
    this.scoringState.set(initialScoringState());
    this.initCurrentPuzzle();
    this.stage.set('playing');
    this.startTimer();
    this.persistState();
  }

  onCountdownDone(): void {
    // No-op — countdown removed, kept for interface compatibility
  }

  selectCell(row: number, col: number): void {
    this.selection.set({ row, col });
  }

  enterDigit(digit: number): void {
    const sel = this.selection();
    if (!sel) return;
    const g = this.grid();
    const cell = g[sel.row][sel.col];
    if (cell.isGiven) return;

    const prevValue = cell.value;
    const prevMarks = [...cell.pencilMarks];

    // Toggle digit in the cell's marks
    const newMarks = new Set(cell.pencilMarks);
    if (newMarks.has(digit)) {
      newMarks.delete(digit);
    } else {
      newMarks.add(digit);
    }

    // If exactly 1 mark remains, commit it as the value
    const newValue = newMarks.size === 1 ? [...newMarks][0] : 0;

    const record: ActionRecord = {
      cell: { row: sel.row, col: sel.col },
      previousValue: prevValue,
      previousPencilMarks: prevMarks,
      newValue,
      newPencilMarks: [...newMarks],
    };
    this.pushAction(record);
    this.updateCell(sel.row, sel.col, newValue, newMarks);

    if (newValue !== 0) {
      const [br, bc] = this.config().boxDimension;
      this.autoCleanPencilMarks(sel.row, sel.col, newValue, br, bc);

      // Check if placement is wrong
      const puzzle = this.currentPuzzle();
      if (puzzle && puzzle.solution[sel.row][sel.col] !== newValue) {
        this.errorCount.update(c => c + 1);
      }
    }
    this.persistState();
  }

  clearCell(): void {
    const sel = this.selection();
    if (!sel) return;
    const g = this.grid();
    const cell = g[sel.row][sel.col];
    if (cell.isGiven) return;

    const record: ActionRecord = {
      cell: { row: sel.row, col: sel.col },
      previousValue: cell.value,
      previousPencilMarks: [...cell.pencilMarks],
      newValue: 0,
      newPencilMarks: [],
    };
    this.pushAction(record);
    this.updateCell(sel.row, sel.col, 0, new Set());
    this.persistState();
  }

  togglePencilMode(): void {
    this.pencilMode.update(v => !v);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;
    const action = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update(s => [...s, action]);
    this.updateCell(
      action.cell.row,
      action.cell.col,
      action.previousValue,
      new Set(action.previousPencilMarks),
    );
    this.persistState();
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const action = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update(s => [...s, action]);
    this.updateCell(
      action.cell.row,
      action.cell.col,
      action.newValue,
      new Set(action.newPencilMarks),
    );
    this.persistState();
  }

  requestHint(): void {
    const remaining = this.hintsRemaining();
    if (remaining !== null && remaining <= 0) return;

    const gridValues = this.getGridValues();
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    const steps = explain(gridValues, puzzle.boxRows, puzzle.boxCols);
    if (steps.length === 0) return;

    const step = steps[0];
    if (step.digit !== undefined && step.cells.length > 0) {
      const { row, col } = step.cells[0];
      const g = this.grid();
      const cell = g[row][col];
      if (!cell.isGiven && cell.value === 0) {
        const record: ActionRecord = {
          cell: { row, col },
          previousValue: cell.value,
          previousPencilMarks: [...cell.pencilMarks],
          newValue: step.digit,
          newPencilMarks: [],
        };
        this.pushAction(record);
        this.updateCell(row, col, step.digit, new Set());
        this.autoCleanPencilMarks(row, col, step.digit, puzzle.boxRows, puzzle.boxCols);
      }
    }
    this.hintsUsed.update(c => c + 1);
    this.persistState();
  }

  giveUp(): void {
    this.storage.clearGameState();
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;
    const steps = explain(puzzle.grid, puzzle.boxRows, puzzle.boxCols);
    this.walkthroughSteps.set(steps);
    this.walkthroughIndex.set(0);
    this.isWalkthrough.set(true);

    // Reset grid to original puzzle state for walkthrough
    this.grid.set(initPuzzleGrid(puzzle));
  }

  advanceWalkthrough(): void {
    const steps = this.walkthroughSteps();
    const idx = this.walkthroughIndex();
    if (idx >= steps.length) return;

    const step = steps[idx];
    // Apply step to grid
    if (step.digit !== undefined && step.cells.length > 0) {
      const technique = step.technique;
      if (technique === 'naked_single' || technique === 'hidden_single' || technique === 'backtrack_guess') {
        const { row, col } = step.cells[0];
        this.updateCell(row, col, step.digit, new Set());
      }
    }
    this.walkthroughIndex.update(i => i + 1);
  }

  finishWalkthrough(): void {
    this.isWalkthrough.set(false);
    this.walkthroughSteps.set([]);
    this.walkthroughIndex.set(0);

    const elapsed = this.getElapsedSec();
    const result: PuzzleResult = {
      status: 'gave_up',
      solveTimeSec: elapsed,
      hintsUsed: this.hintsUsed(),
      errorCount: this.errorCount(),
    };
    this.scoringState.update(s => processPuzzleResult(s, result));
    this.advancePuzzleOrEnd();
  }

  checkCompletion(): void {
    if (!this.isComplete()) return;
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    const g = this.grid();
    const gridSize = puzzle.boxRows * puzzle.boxCols;

    // Validate against solution
    let correct = true;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (g[r][c].value !== puzzle.solution[r][c]) {
          correct = false;
          break;
        }
      }
      if (!correct) break;
    }

    if (!correct) return; // errors shown via conflict detection

    const elapsed = this.getElapsedSec();
    this.solveTimeSec.set(Math.round(elapsed * 10) / 10);
    this.solved.set(true);
    this.storage.clearGameState();
  }

  onTimeout(): void {
    const elapsed = this.getElapsedSec();
    const result: PuzzleResult = {
      status: 'timed_out',
      solveTimeSec: elapsed,
      hintsUsed: this.hintsUsed(),
      errorCount: this.errorCount(),
    };
    this.scoringState.update(s => processPuzzleResult(s, result));
    this.advancePuzzleOrEnd();
  }

  abortSession(): void {
    this.stage.set('idle');
    this.resetPlayState();
    this.storage.clearGameState();
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  pauseTimer(): void {
    if (this.isPaused()) return;
    this.pausedElapsedMs += Date.now() - this.timerStartMs;
    this.isPaused.set(true);
  }

  resumeTimer(): void {
    if (!this.isPaused()) return;
    this.timerStartMs = Date.now();
    this.isPaused.set(false);
  }

  // ── Private Helpers ──

  private initCurrentPuzzle(): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;
    this.grid.set(initPuzzleGrid(puzzle));
    this.selection.set(null);
    this.pencilMode.set(false);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.isWalkthrough.set(false);
    this.walkthroughSteps.set([]);
    this.walkthroughIndex.set(0);
    this.hintsUsed.set(0);
    this.errorCount.set(0);
    this.solved.set(false);
    this.solveTimeSec.set(0);
  }

  private startTimer(): void {
    this.timerStartMs = Date.now();
    this.pausedElapsedMs = 0;
    this.isPaused.set(false);
  }

  private getElapsedSec(): number {
    if (this.isPaused()) {
      return this.pausedElapsedMs / 1000;
    }
    return (this.pausedElapsedMs + (Date.now() - this.timerStartMs)) / 1000;
  }

  private pushAction(record: ActionRecord): void {
    this.undoStack.update(s => [...s, record]);
    this.redoStack.set([]); // new action clears redo
  }

  private updateCell(row: number, col: number, value: number, pencilMarks: Set<number>): void {
    this.grid.update(g => {
      const newGrid = g.map(r => [...r]);
      newGrid[row][col] = { ...newGrid[row][col], value, pencilMarks };
      return newGrid;
    });
  }

  getGridValues(): number[][] {
    const g = this.grid();
    return g.map(row => row.map(cell => cell.value));
  }

  private autoCleanPencilMarks(row: number, col: number, digit: number, boxRows: number, boxCols: number): void {
    const gridSize = boxRows * boxCols;
    this.grid.update(g => {
      const newGrid = g.map(r => r.map(c => ({ ...c, pencilMarks: new Set(c.pencilMarks) })));
      // Clean row
      for (let c = 0; c < gridSize; c++) {
        if (c !== col) newGrid[row][c].pencilMarks.delete(digit);
      }
      // Clean column
      for (let r = 0; r < gridSize; r++) {
        if (r !== row) newGrid[r][col].pencilMarks.delete(digit);
      }
      // Clean box
      const br = Math.floor(row / boxRows) * boxRows;
      const bc = Math.floor(col / boxCols) * boxCols;
      for (let r = br; r < br + boxRows; r++) {
        for (let c = bc; c < bc + boxCols; c++) {
          if (r !== row || c !== col) newGrid[r][c].pencilMarks.delete(digit);
        }
      }
      return newGrid;
    });
  }

  private advancePuzzleOrEnd(): void {
    const idx = this.currentPuzzleIndex();
    if (idx + 1 < this.puzzles().length) {
      this.currentPuzzleIndex.set(idx + 1);
      this.initCurrentPuzzle();
      this.startTimer();
    } else {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
      this.storage.clearGameState();
    }
  }

  private resetPlayState(): void {
    this.puzzles.set([]);
    this.currentPuzzleIndex.set(0);
    this.grid.set([]);
    this.selection.set(null);
    this.pencilMode.set(false);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.isWalkthrough.set(false);
    this.walkthroughSteps.set([]);
    this.walkthroughIndex.set(0);
    this.hintsUsed.set(0);
    this.errorCount.set(0);
    this.isPaused.set(false);
    this.scoringState.set(initialScoringState());
    this.roundResult.set(null);
  }

  /** Persist current game state to localStorage. */
  persistState(): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle || this.solved()) return;
    const g = this.grid();
    const state: SavedGameState = {
      puzzle: { grid: puzzle.grid, solution: puzzle.solution, boxRows: puzzle.boxRows, boxCols: puzzle.boxCols },
      playerGrid: g.map(row => row.map(c => ({ value: c.value, pencilMarks: [...c.pencilMarks], isGiven: c.isGiven }))),
      hintsUsed: this.hintsUsed(),
      errorCount: this.errorCount(),
      elapsedMs: this.pausedElapsedMs + (this.isPaused() ? 0 : Date.now() - this.timerStartMs),
      config: this.config(),
    };
    this.storage.saveGameState(state);
  }

  /** Try to restore a saved game session. Returns true if restored. */
  restoreSession(): boolean {
    const saved = this.storage.loadGameState();
    if (!saved) return false;

    const puzzle: Puzzle = saved.puzzle;
    this.config.set(saved.config);
    this.puzzles.set([puzzle]);
    this.currentPuzzleIndex.set(0);
    this.grid.set(saved.playerGrid.map(row =>
      row.map(c => ({ value: c.value, pencilMarks: new Set(c.pencilMarks), isGiven: c.isGiven })),
    ));
    this.selection.set(null);
    this.pencilMode.set(false);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.isWalkthrough.set(false);
    this.walkthroughSteps.set([]);
    this.walkthroughIndex.set(0);
    this.hintsUsed.set(saved.hintsUsed);
    this.errorCount.set(saved.errorCount);
    this.solved.set(false);
    this.solveTimeSec.set(0);
    this.scoringState.set(initialScoringState());
    this.roundResult.set(null);

    // Restore timer from elapsed
    this.pausedElapsedMs = saved.elapsedMs;
    this.timerStartMs = Date.now();
    this.isPaused.set(false);

    this.stage.set('playing');
    return true;
  }
}

// ── Standalone Helper Functions ──

export function initPuzzleGrid(puzzle: Puzzle): CellState[][] {
  const gridSize = puzzle.boxRows * puzzle.boxCols;
  return Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({
      value: puzzle.grid[r][c],
      pencilMarks: new Set<number>(),
      isGiven: puzzle.grid[r][c] !== 0,
    })),
  );
}

export function findConflicts(grid: CellState[][], boxRows: number, boxCols: number): Set<string> {
  const gridSize = boxRows * boxCols;
  const conflicts = new Set<string>();

  // Check rows
  for (let r = 0; r < gridSize; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < gridSize; c++) {
      const v = grid[r][c].value;
      if (v === 0) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push(c);
    }
    for (const [, cols] of seen) {
      if (cols.length > 1) {
        for (const c of cols) conflicts.add(`${r},${c}`);
      }
    }
  }

  // Check columns
  for (let c = 0; c < gridSize; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < gridSize; r++) {
      const v = grid[r][c].value;
      if (v === 0) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push(r);
    }
    for (const [, rows] of seen) {
      if (rows.length > 1) {
        for (const r of rows) conflicts.add(`${r},${c}`);
      }
    }
  }

  // Check boxes
  for (let br = 0; br < gridSize; br += boxRows) {
    for (let bc = 0; bc < gridSize; bc += boxCols) {
      const seen = new Map<number, CellPosition[]>();
      for (let r = br; r < br + boxRows; r++) {
        for (let c = bc; c < bc + boxCols; c++) {
          const v = grid[r][c].value;
          if (v === 0) continue;
          if (!seen.has(v)) seen.set(v, []);
          seen.get(v)!.push({ row: r, col: c });
        }
      }
      for (const [, cells] of seen) {
        if (cells.length > 1) {
          for (const cell of cells) conflicts.add(`${cell.row},${cell.col}`);
        }
      }
    }
  }

  return conflicts;
}
