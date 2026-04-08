import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  CiphergridConfig,
  DEFAULT_CONFIG,
  DifficultyParams,
  GameStage,
  GridState,
  Puzzle,
  PuzzleResult,
  RoundResult,
  ScoringState,
  SpeedMode,
} from '../models/game.models';
import { mapDifficultyToParams } from '../utils/difficulty.util';
import { generatePuzzle } from '../utils/puzzle-generator.util';
import { evaluateEquation } from '../utils/puzzle-generator.util';
import {
  calculateRoundResult,
  initialScoringState,
  processPuzzleResult,
} from '../utils/scoring.util';

const VALID_SPEED_MODES: SpeedMode[] = ['relaxed', 'standard', 'intense'];

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<CiphergridConfig> = signal<CiphergridConfig>(DEFAULT_CONFIG);
  readonly puzzles: WritableSignal<Puzzle[]> = signal<Puzzle[]>([]);
  readonly currentPuzzleIndex: WritableSignal<number> = signal<number>(0);
  readonly gridState: WritableSignal<GridState> = signal<GridState>(emptyGridState());
  readonly scoringState: WritableSignal<ScoringState> = signal<ScoringState>(initialScoringState());
  readonly roundResult: WritableSignal<RoundResult | null> = signal<RoundResult | null>(null);

  readonly currentPuzzle = computed(() => this.puzzles()[this.currentPuzzleIndex()] ?? null);
  readonly difficultyParams = computed(() =>
    mapDifficultyToParams(this.config().difficulty, this.config().speedMode),
  );

  updateConfig(partial: Partial<CiphergridConfig>): void {
    const current = this.config();
    const merged: CiphergridConfig = {
      difficulty: clamp(partial.difficulty ?? current.difficulty, 1, 20),
      puzzleCount: clamp(partial.puzzleCount ?? current.puzzleCount, 3, 15),
      speedMode: VALID_SPEED_MODES.includes(partial.speedMode as SpeedMode)
        ? (partial.speedMode as SpeedMode)
        : current.speedMode,
    };
    this.config.set(merged);
  }

  startSession(): void {
    const cfg = this.config();
    const params = mapDifficultyToParams(cfg.difficulty, cfg.speedMode);
    const baseSeed = Date.now();
    const generated: Puzzle[] = [];
    for (let i = 0; i < cfg.puzzleCount; i++) {
      generated.push(generatePuzzle(baseSeed + i * 1000, params));
    }
    this.puzzles.set(generated);
    this.currentPuzzleIndex.set(0);
    this.roundResult.set(null);
    this.stage.set('countdown');
  }

  onCountdownDone(): void {
    this.scoringState.set(initialScoringState());
    this.initGridState();
    this.stage.set('playing');
  }

  commitCellValue(row: number, col: number, value: number): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle) return;

    const gs = this.gridState();
    const key = `${row},${col}`;
    const newEntries = new Map(gs.entries);
    newEntries.set(key, value);

    const newFeedback = new Map(gs.feedback);
    // Evaluate feedback for this cell
    const fb = this.evaluateCellFeedback(puzzle, newEntries, row, col);
    if (fb !== null) {
      newFeedback.set(key, fb);
    } else {
      newFeedback.set(key, 'pending');
    }

    // Re-evaluate feedback for other cells that may now be determinable
    for (const [hr, hc] of puzzle.hiddenCells) {
      const hk = `${hr},${hc}`;
      if (hk === key) continue;
      if (newEntries.get(hk) == null) continue;
      const hfb = this.evaluateCellFeedback(puzzle, newEntries, hr, hc);
      if (hfb !== null) {
        newFeedback.set(hk, hfb);
      }
    }

    this.gridState.set({ entries: newEntries, feedback: newFeedback });
  }

  reviseCell(row: number, col: number): void {
    const gs = this.gridState();
    const key = `${row},${col}`;
    const newEntries = new Map(gs.entries);
    newEntries.set(key, null);
    const newFeedback = new Map(gs.feedback);
    newFeedback.set(key, 'pending');
    this.gridState.set({ entries: newEntries, feedback: newFeedback });
  }

  completePuzzle(result: PuzzleResult): void {
    const params = this.difficultyParams();
    this.scoringState.set(processPuzzleResult(this.scoringState(), result, params));

    const nextIndex = this.currentPuzzleIndex() + 1;
    if (nextIndex >= this.puzzles().length) {
      this.roundResult.set(calculateRoundResult(this.scoringState(), this.config()));
      this.stage.set('summary');
    } else {
      this.currentPuzzleIndex.set(nextIndex);
      this.initGridState();
    }
  }

  abortSession(): void {
    this.stage.set('idle');
  }

  goToIdle(): void {
    this.stage.set('idle');
  }

  private initGridState(): void {
    const puzzle = this.currentPuzzle();
    if (!puzzle) {
      this.gridState.set(emptyGridState());
      return;
    }
    const entries = new Map<string, number | null>();
    const feedback = new Map<string, 'correct' | 'incorrect' | 'pending'>();
    for (const [r, c] of puzzle.hiddenCells) {
      const key = `${r},${c}`;
      entries.set(key, null);
      feedback.set(key, 'pending');
    }
    this.gridState.set({ entries, feedback });
  }

  /**
   * Evaluates cell-level feedback for a hidden cell.
   * Returns 'correct' if all equations containing the cell are satisfied,
   * 'incorrect' if any equation is violated,
   * or null if feedback should be deferred (equations contain empty hidden cells).
   */
  private evaluateCellFeedback(
    puzzle: Puzzle,
    entries: Map<string, number | null>,
    row: number,
    col: number,
  ): 'correct' | 'incorrect' | null {
    const equations = [puzzle.rowEquations[row], puzzle.colEquations[col]];

    for (const eq of equations) {
      const values: (number | null)[] = eq.cellIndices.map(([r, c]) => {
        const cell = puzzle.grid[r][c];
        if (cell.kind === 'number') return cell.value;
        return entries.get(`${r},${c}`) ?? null;
      });

      // Defer if any cell in this equation is still empty
      if (values.some(v => v === null)) return null;

      const result = evaluateEquation(values as number[], eq.operators, eq.mode);
      if (result !== eq.result) return 'incorrect';
    }

    return 'correct';
  }
}

function emptyGridState(): GridState {
  return { entries: new Map(), feedback: new Map() };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
