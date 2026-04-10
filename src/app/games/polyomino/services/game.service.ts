import { computed, Injectable, signal, WritableSignal } from '@angular/core';
import {
  BoardLayout,
  DEFAULT_CONFIG,
  DifficultyParams,
  DragState,
  GameStage,
  IDENTITY_ORIENTATION,
  OccupancyGrid,
  Orientation,
  PlacedPiece,
  Placement,
  PlacementAction,
  PolyominoConfig,
  Puzzle,
  PuzzleResult,
} from '../models/game.models';
import { StorageService } from './storage.service';
import { checkPlacement, createEmptyOccupancy, applyPlacement, removePlacement, countOccupied, countActiveCells } from '../utils/collision-detector.util';
import { generatePuzzle } from '../utils/puzzle-generator.util';
import { mapDifficultyToParams } from '../utils/difficulty.util';
import { calculatePuzzleResult } from '../utils/scoring.util';
import { rotateCW, flipH, normalize, getDistinctOrientations } from '../utils/piece-library.util';

@Injectable({ providedIn: 'root' })
export class GameService {
  private storage = new StorageService();

  // ── Writable Signals ──
  readonly stage: WritableSignal<GameStage> = signal<GameStage>('idle');
  readonly config: WritableSignal<PolyominoConfig> = signal<PolyominoConfig>(DEFAULT_CONFIG);
  readonly puzzle: WritableSignal<Puzzle | null> = signal<Puzzle | null>(null);
  readonly boardState: WritableSignal<OccupancyGrid> = signal<OccupancyGrid>({ cells: [] });
  readonly placedPieces: WritableSignal<PlacedPiece[]> = signal<PlacedPiece[]>([]);
  readonly unplacedPieceIds: WritableSignal<string[]> = signal<string[]>([]);
  readonly selectedPieceId: WritableSignal<string | null> = signal<string | null>(null);
  readonly dragState: WritableSignal<DragState | null> = signal<DragState | null>(null);
  readonly undoStack: WritableSignal<PlacementAction[]> = signal<PlacementAction[]>([]);
  readonly redoStack: WritableSignal<PlacementAction[]> = signal<PlacementAction[]>([]);
  readonly hintsUsed: WritableSignal<number> = signal<number>(0);
  readonly moveCount: WritableSignal<number> = signal<number>(0);
  readonly solved: WritableSignal<boolean> = signal<boolean>(false);
  readonly gaveUp: WritableSignal<boolean> = signal<boolean>(false);
  readonly solveTimeSec: WritableSignal<number> = signal<number>(0);
  readonly puzzleResult: WritableSignal<PuzzleResult | null> = signal<PuzzleResult | null>(null);

  private startTimeMs = 0;

  // ── Computed Signals ──
  readonly activeCellCount = computed(() => {
    const p = this.puzzle();
    return p ? countActiveCells(p.board) : 0;
  });

  readonly occupiedCellCount = computed(() => countOccupied(this.boardState()));

  readonly progress = computed(() => ({
    placed: this.placedPieces().length,
    total: this.puzzle()?.pieces.length ?? 0,
  }));

  readonly isComplete = computed(() =>
    this.occupiedCellCount() === this.activeCellCount() &&
    this.unplacedPieceIds().length === 0
  );

  // ── Methods ──

  updateConfig(partial: Partial<PolyominoConfig>): void {
    const merged = { ...this.config(), ...partial };
    this.config.set(merged);
    this.storage.saveConfig(merged);
  }

  loadConfig(): void {
    this.config.set(this.storage.loadConfig());
  }

  readonly isGenerating = signal(false);

  startSession(): void {
    const cfg = this.config();
    this.isGenerating.set(true);

    // Use setTimeout to let the UI render the "Generating" screen before blocking
    setTimeout(() => {
      const d = Math.max(1, Math.min(100, cfg.difficulty));
      const t = (d - 1) / 99;
      const maxPieceComplexity = Math.round(16 + t * 32);
      const pieceSizeRange: [number, number] = d <= 25 ? [4, 4] : d <= 50 ? [4, 5] : d <= 75 ? [5, 5] : [5, 6];
      const params: DifficultyParams = {
        pieceCount: cfg.pieceCount,
        pieceSizeRange,
        maxPieceComplexity,
        rotationAllowed: true,
        flipAllowed: true,
      };
      const seed = Date.now();
      const puzzle = generatePuzzle(cfg, params, seed);

      this.puzzle.set(puzzle);
      this.resetPlayState(puzzle);
      this.startTimeMs = Date.now();
      this.isGenerating.set(false);
      this.stage.set('playing');
    }, 50);
  }

  placePiece(pieceId: string, anchorRow: number, anchorCol: number, orientation: Orientation): boolean {
    const p = this.puzzle();
    if (!p) return false;

    const piece = p.pieces.find(pp => pp.id === pieceId);
    if (!piece) return false;

    // Compute oriented cells
    const orientedCells = applyOrientation(piece.cells, orientation);

    // Validate placement
    const result = checkPlacement(p.board, this.boardState(), orientedCells, anchorRow, anchorCol);
    if (!result.valid) return false;

    // Compute absolute cells
    const absoluteCells = orientedCells.map(([r, c]) => [anchorRow + r, anchorCol + c] as [number, number]);

    // Apply placement
    const placement: Placement = { pieceId, anchorRow, anchorCol, orientation, cells: absoluteCells };
    this.boardState.set(applyPlacement(this.boardState(), pieceId, absoluteCells));
    this.placedPieces.update(pp => [...pp, {
      pieceId, definitionId: piece.definitionId,
      anchorRow, anchorCol, orientation, cells: absoluteCells,
      color: piece.color, isHint: false,
    }]);
    this.unplacedPieceIds.update(ids => ids.filter(id => id !== pieceId));
    this.undoStack.update(stack => [...stack, { type: 'place', placement }]);
    this.redoStack.set([]);
    this.moveCount.update(n => n + 1);
    this.selectedPieceId.set(null);

    this.checkCompletion();
    this.persistState();
    return true;
  }

  removePiece(pieceId: string): void {
    const placed = this.placedPieces().find(pp => pp.pieceId === pieceId);
    if (!placed) return;

    const placement: Placement = {
      pieceId, anchorRow: placed.anchorRow, anchorCol: placed.anchorCol,
      orientation: placed.orientation, cells: placed.cells,
    };

    this.boardState.set(removePlacement(this.boardState(), pieceId));
    this.placedPieces.update(pp => pp.filter(p => p.pieceId !== pieceId));
    this.unplacedPieceIds.update(ids => [...ids, pieceId]);
    this.undoStack.update(stack => [...stack, { type: 'remove', placement }]);
    this.redoStack.set([]);
    this.moveCount.update(n => n + 1);

    this.persistState();
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;

    const action = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));

    if (action.type === 'place') {
      // Reverse a placement: remove the piece
      this.boardState.set(removePlacement(this.boardState(), action.placement.pieceId));
      this.placedPieces.update(pp => pp.filter(p => p.pieceId !== action.placement.pieceId));
      this.unplacedPieceIds.update(ids => [...ids, action.placement.pieceId]);
    } else {
      // Reverse a removal: re-place the piece
      const p = this.puzzle();
      const piece = p?.pieces.find(pp => pp.id === action.placement.pieceId);
      if (piece) {
        this.boardState.set(applyPlacement(this.boardState(), action.placement.pieceId, action.placement.cells));
        this.placedPieces.update(pp => [...pp, {
          pieceId: action.placement.pieceId, definitionId: piece.definitionId,
          anchorRow: action.placement.anchorRow, anchorCol: action.placement.anchorCol,
          orientation: action.placement.orientation, cells: action.placement.cells,
          color: piece.color, isHint: false,
        }]);
        this.unplacedPieceIds.update(ids => ids.filter(id => id !== action.placement.pieceId));
      }
    }

    this.redoStack.update(stack => [...stack, action]);
    this.persistState();
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;

    const action = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));

    if (action.type === 'place') {
      const p = this.puzzle();
      const piece = p?.pieces.find(pp => pp.id === action.placement.pieceId);
      if (piece) {
        this.boardState.set(applyPlacement(this.boardState(), action.placement.pieceId, action.placement.cells));
        this.placedPieces.update(pp => [...pp, {
          pieceId: action.placement.pieceId, definitionId: piece.definitionId,
          anchorRow: action.placement.anchorRow, anchorCol: action.placement.anchorCol,
          orientation: action.placement.orientation, cells: action.placement.cells,
          color: piece.color, isHint: false,
        }]);
        this.unplacedPieceIds.update(ids => ids.filter(id => id !== action.placement.pieceId));
      }
    } else {
      this.boardState.set(removePlacement(this.boardState(), action.placement.pieceId));
      this.placedPieces.update(pp => pp.filter(p => p.pieceId !== action.placement.pieceId));
      this.unplacedPieceIds.update(ids => [...ids, action.placement.pieceId]);
    }

    this.undoStack.update(stack => [...stack, action]);
    this.persistState();
  }

  rotatePiece(pieceId: string): void {
    const p = this.puzzle();
    if (!p) return;
    const piece = p.pieces.find(pp => pp.id === pieceId);
    if (!piece) return;
    piece.currentOrientation = {
      ...piece.currentOrientation,
      rotation: ((piece.currentOrientation.rotation + 1) % 4) as 0 | 1 | 2 | 3,
    };
    this.puzzle.set({ ...p, pieces: [...p.pieces] });
  }

  /** Rotate a placed piece in-place on the board. Returns false if rotation doesn't fit. */
  rotatePlacedPiece(pieceId: string, ccw: boolean): boolean {
    return this.transformPlacedPiece(pieceId, (orient) => ({
      ...orient,
      rotation: (ccw
        ? ((orient.rotation + 3) % 4)
        : ((orient.rotation + 1) % 4)) as 0 | 1 | 2 | 3,
    }));
  }

  /** Flip a placed piece in-place on the board. Returns false if flip doesn't fit. */
  flipPlacedPiece(pieceId: string): boolean {
    const p = this.puzzle();
    if (!p) return false;
    const piece = p.pieces.find(pp => pp.id === pieceId);
    if (!piece) return false;
    const placed = this.placedPieces().find(pp => pp.pieceId === pieceId);
    if (!placed) return false;

    // Compute current visual, flip it, find new orientation
    let currentCells = normalize(piece.cells);
    if (piece.currentOrientation.flipped) currentCells = flipH(currentCells);
    for (let i = 0; i < piece.currentOrientation.rotation; i++) currentCells = rotateCW(currentCells);
    const flippedCells = flipH(currentCells);
    const flippedKey = normalize(flippedCells).map(([r, c]) => `${r},${c}`).join('|');

    for (const fl of [false, true]) {
      for (const rot of [0, 1, 2, 3] as const) {
        let test = normalize(piece.cells);
        if (fl) test = flipH(test);
        for (let i = 0; i < rot; i++) test = rotateCW(test);
        if (normalize(test).map(([r, c]) => `${r},${c}`).join('|') === flippedKey) {
          return this.transformPlacedPiece(pieceId, () => ({ rotation: rot, flipped: fl }));
        }
      }
    }
    return false;
  }

  /** Try to transform a placed piece's orientation in-place.
   *  Tries anchoring from the center of the piece outward, so the piece stays as close
   *  to its original position as possible. Returns false only if no anchor works. */
  private transformPlacedPiece(pieceId: string, getNewOrientation: (old: Orientation) => Orientation): boolean {
    const p = this.puzzle();
    if (!p) return false;
    const piece = p.pieces.find(pp => pp.id === pieceId);
    if (!piece) return false;
    const placed = this.placedPieces().find(pp => pp.pieceId === pieceId);
    if (!placed) return false;

    const newOrientation = getNewOrientation(piece.currentOrientation);

    // Compute new oriented cells (relative to anchor)
    let newCells = normalize(piece.cells);
    if (newOrientation.flipped) newCells = flipH(newCells);
    for (let i = 0; i < newOrientation.rotation; i++) newCells = rotateCW(newCells);

    // Remove old piece from occupancy temporarily
    const tempOcc = removePlacement(this.boardState(), pieceId);

    // Compute center of the old placed piece
    const oldCells = placed.cells;
    const centerR = oldCells.reduce((s, [r]) => s + r, 0) / oldCells.length;
    const centerC = oldCells.reduce((s, [, c]) => s + c, 0) / oldCells.length;

    // Compute center of the new shape (relative coords)
    const newCenterR = newCells.reduce((s, [r]) => s + r, 0) / newCells.length;
    const newCenterC = newCells.reduce((s, [, c]) => s + c, 0) / newCells.length;

    // Ideal anchor: place new shape so its center aligns with old center
    const idealAnchorR = Math.round(centerR - newCenterR);
    const idealAnchorC = Math.round(centerC - newCenterC);

    // Generate candidate anchors: spiral outward from ideal position
    const candidates: [number, number][] = [];
    const maxOffset = Math.max(p.board.height, p.board.width);
    for (let dist = 0; dist <= maxOffset; dist++) {
      for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
          if (Math.abs(dr) !== dist && Math.abs(dc) !== dist) continue; // only perimeter of this distance
          candidates.push([idealAnchorR + dr, idealAnchorC + dc]);
        }
      }
    }

    // Try each candidate
    for (const [anchorR, anchorC] of candidates) {
      const result = checkPlacement(p.board, tempOcc, newCells, anchorR, anchorC);
      if (result.valid) {
        const newAbsCells = newCells.map(([r, c]) => [anchorR + r, anchorC + c] as [number, number]);
        const finalOcc = applyPlacement(tempOcc, pieceId, newAbsCells);
        this.boardState.set(finalOcc);
        this.placedPieces.update(pps => pps.map(pp =>
          pp.pieceId === pieceId ? { ...pp, anchorRow: anchorR, anchorCol: anchorC, orientation: newOrientation, cells: newAbsCells } : pp
        ));
        piece.currentOrientation = newOrientation;
        this.puzzle.set({ ...p, pieces: [...p.pieces] });
        this.persistState();
        return true;
      }
    }

    return false;
  }

  flipPiece(pieceId: string): void {
    const p = this.puzzle();
    if (!p) return;
    const piece = p.pieces.find(pp => pp.id === pieceId);
    if (!piece) return;

    // Get current visual cells, flip them horizontally, find matching orientation
    let currentCells = normalize(piece.cells);
    if (piece.currentOrientation.flipped) currentCells = flipH(currentCells);
    for (let i = 0; i < piece.currentOrientation.rotation; i++) currentCells = rotateCW(currentCells);

    // Flip the current visual horizontally
    const flippedCells = flipH(currentCells);
    const flippedKey = normalize(flippedCells).map(([r, c]) => `${r},${c}`).join('|');

    // Find the orientation that produces this result
    for (const fl of [false, true]) {
      for (const rot of [0, 1, 2, 3] as const) {
        let test = normalize(piece.cells);
        if (fl) test = flipH(test);
        for (let i = 0; i < rot; i++) test = rotateCW(test);
        if (normalize(test).map(([r, c]) => `${r},${c}`).join('|') === flippedKey) {
          piece.currentOrientation = { rotation: rot, flipped: fl };
          this.puzzle.set({ ...p, pieces: [...p.pieces] });
          return;
        }
      }
    }
  }

  requestHint(): void {
    const p = this.puzzle();
    if (!p) return;

    // Step 1: Check if any placed piece is in the wrong position
    // A piece is "wrong" if its current cells don't match its solution cells
    const placed = this.placedPieces();
    for (const pp of placed) {
      const solutionEntry = p.solution.find(s => s.pieceId === pp.pieceId);
      if (!solutionEntry) continue;

      // Compare placed cells with solution cells
      const placedSet = new Set(pp.cells.map(([r, c]) => `${r},${c}`));
      const solutionSet = new Set(solutionEntry.cells.map(([r, c]) => `${r},${c}`));
      const isCorrect = placedSet.size === solutionSet.size && [...placedSet].every(k => solutionSet.has(k));

      if (!isCorrect) {
        // Hint: remove this wrongly placed piece
        this.removePiece(pp.pieceId);
        this.hintsUsed.update(n => n + 1);
        this.persistState();
        return;
      }
    }

    // Step 2: All placed pieces are correct — place the next unplaced piece
    const unplaced = this.unplacedPieceIds();
    if (unplaced.length === 0) return;

    for (const pieceId of unplaced) {
      const solutionEntry = p.solution.find(s => s.pieceId === pieceId);
      if (solutionEntry) {
        const piece = p.pieces.find(pp => pp.id === pieceId);
        if (!piece) continue;

        this.boardState.set(applyPlacement(this.boardState(), pieceId, solutionEntry.cells));
        this.placedPieces.update(pp => [...pp, {
          pieceId, definitionId: solutionEntry.definitionId,
          anchorRow: solutionEntry.anchorRow, anchorCol: solutionEntry.anchorCol,
          orientation: solutionEntry.orientation, cells: solutionEntry.cells,
          color: piece.color, isHint: true,
        }]);
        this.unplacedPieceIds.update(ids => ids.filter(id => id !== pieceId));
        this.hintsUsed.update(n => n + 1);
        this.moveCount.update(n => n + 1);

        this.checkCompletion();
        this.persistState();
        return;
      }
    }
  }

  abortSession(): void {
    this.storage.clearGameState();
    this.stage.set('idle');
  }

  /** Show the full solution — clear board and place all pieces from solution */
  giveUp(): void {
    const p = this.puzzle();
    if (!p) return;

    // Clear the board completely
    this.boardState.set(createEmptyOccupancy(p.board));
    const newPlaced: PlacedPiece[] = [];

    // Place every piece from the solution
    let occ = createEmptyOccupancy(p.board);
    for (const entry of p.solution) {
      const piece = p.pieces.find(pp => pp.id === entry.pieceId);
      if (!piece) continue;
      occ = applyPlacement(occ, entry.pieceId, entry.cells);
      newPlaced.push({
        pieceId: entry.pieceId, definitionId: entry.definitionId,
        anchorRow: entry.anchorRow, anchorCol: entry.anchorCol,
        orientation: entry.orientation, cells: entry.cells,
        color: piece.color, isHint: true,
      });
    }

    this.boardState.set(occ);
    this.placedPieces.set(newPlaced);
    this.unplacedPieceIds.set([]);
    this.gaveUp.set(true);
    this.solved.set(true);
    this.solveTimeSec.set(this.getElapsedSec());
    this.computeResult('solved');
    this.storage.clearGameState();
  }

  checkCompletion(): void {
    if (this.isComplete()) {
      this.solved.set(true);
      this.solveTimeSec.set(this.getElapsedSec());
      this.computeResult('solved');
      this.storage.clearGameState();
      // Stay in 'playing' stage — end bar shows over the board
    }
  }

  persistState(): void {
    if (this.solved() || this.gaveUp()) return;
    const p = this.puzzle();
    if (!p) return;
    this.storage.saveGameState({
      puzzle: p,
      placedPieces: this.placedPieces(),
      unplacedPieceIds: this.unplacedPieceIds(),
      hintsUsed: this.hintsUsed(),
      moveCount: this.moveCount(),
      elapsedMs: this.getElapsedMs(),
      config: this.config(),
    });
  }

  restoreSession(): boolean {
    const saved = this.storage.loadGameState();
    if (!saved) return false;

    this.config.set(saved.config);
    this.puzzle.set(saved.puzzle);
    this.placedPieces.set(saved.placedPieces);
    this.unplacedPieceIds.set(saved.unplacedPieceIds);
    this.hintsUsed.set(saved.hintsUsed);
    this.moveCount.set(saved.moveCount);
    this.startTimeMs = Date.now() - saved.elapsedMs;
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.solved.set(false);

    // Rebuild occupancy grid from placed pieces
    const board = saved.puzzle.board;
    let occupancy = createEmptyOccupancy(board);
    for (const pp of saved.placedPieces) {
      occupancy = applyPlacement(occupancy, pp.pieceId, pp.cells);
    }
    this.boardState.set(occupancy);

    return true;
  }

  // ── Private helpers ──

  private resetPlayState(puzzle: Puzzle): void {
    this.boardState.set(createEmptyOccupancy(puzzle.board));
    this.placedPieces.set([]);
    this.unplacedPieceIds.set(puzzle.pieces.map(p => p.id));
    this.selectedPieceId.set(null);
    this.dragState.set(null);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.hintsUsed.set(0);
    this.moveCount.set(0);
    this.solved.set(false);
    this.gaveUp.set(false);
    this.solveTimeSec.set(0);
    this.puzzleResult.set(null);
  }

  private getElapsedMs(): number {
    return Date.now() - this.startTimeMs;
  }

  private getElapsedSec(): number {
    return this.getElapsedMs() / 1000;
  }

  private computeResult(status: 'solved' | 'timed_out' | 'aborted'): void {
    const p = this.puzzle();
    if (!p) return;
    const filledRatio = this.activeCellCount() > 0
      ? this.occupiedCellCount() / this.activeCellCount()
      : 0;

    this.puzzleResult.set(calculatePuzzleResult({
      status,
      solveTimeSec: this.solveTimeSec(),
      moveCount: this.moveCount(),
      hintsUsed: this.hintsUsed(),
      pieceCount: p.pieces.length,
      difficulty: this.config().difficulty,
      filledRatio,
      timeLimitSec: null,
    }));
  }
}

/** Apply orientation transforms to piece cells */
function applyOrientation(
  cells: [number, number][],
  orientation: Orientation,
): [number, number][] {
  let result = normalize(cells);
  if (orientation.flipped) result = flipH(result);
  for (let i = 0; i < orientation.rotation; i++) result = rotateCW(result);
  return result;
}
