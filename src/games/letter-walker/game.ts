import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { isDictionaryWord } from './dictionary';
import { type CellPos, isStraightPath, wordFromGrid } from './selection';

export const GRID_SIZE = 8;

export type MoveType = { type: 'row' | 'col'; index: number };

export type LetterWalkerState = {
  grid: string[][];
  moves: number;
  score: number;
  foundWords: string[];
  puzzleNumber: number;
  dailySeed: number;
  lastMoveType: MoveType | null;
  completed: boolean;
};

export type ShiftDir = 'left' | 'right' | 'up' | 'down';

/** LCG matching Ursa Minor Letter Walker. */
export class SeededRandom {
  seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextLetter(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[this.nextInt(0, letters.length - 1)];
  }
}

export function getDailySeed(date = new Date()): number {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return Number.parseInt(`${y}${m}${d}`, 10);
}

export function buildGrid(dailySeed: number, puzzleNumber: number): string[][] {
  const rng = new SeededRandom(dailySeed + puzzleNumber);
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => rng.nextLetter()),
  );
}

export function createPuzzleState(dailySeed: number, puzzleNumber: number): LetterWalkerState {
  return {
    grid: buildGrid(dailySeed, puzzleNumber),
    moves: 0,
    score: 0,
    foundWords: [],
    puzzleNumber,
    dailySeed,
    lastMoveType: null,
    completed: false,
  };
}

function sameMoveType(a: MoveType | null, b: MoveType): boolean {
  return Boolean(a && a.type === b.type && a.index === b.index);
}

export function applyShiftRow(
  state: LetterWalkerState,
  rowIndex: number,
  direction: 'left' | 'right',
): LetterWalkerState {
  const grid = state.grid.map((row) => row.slice());
  const row = grid[rowIndex];
  if (direction === 'left') {
    const leftmost = row.shift();
    /* v8 ignore start -- row always has letters in play */
    if (leftmost !== undefined) row.push(leftmost);
    /* v8 ignore stop */
  } else {
    const rightmost = row.pop();
    /* v8 ignore start -- row always has letters in play */
    if (rightmost !== undefined) row.unshift(rightmost);
    /* v8 ignore stop */
  }
  const current: MoveType = { type: 'row', index: rowIndex };
  const moves = sameMoveType(state.lastMoveType, current) ? state.moves : state.moves + 1;
  return { ...state, grid, moves, lastMoveType: current };
}

export function applyShiftCol(
  state: LetterWalkerState,
  colIndex: number,
  direction: 'up' | 'down',
): LetterWalkerState {
  const grid = state.grid.map((row) => row.slice());
  if (direction === 'up') {
    const topmost = grid[0][colIndex];
    for (let r = 0; r < GRID_SIZE - 1; r++) grid[r][colIndex] = grid[r + 1][colIndex];
    grid[GRID_SIZE - 1][colIndex] = topmost;
  } else {
    const bottommost = grid[GRID_SIZE - 1][colIndex];
    for (let r = GRID_SIZE - 1; r > 0; r--) grid[r][colIndex] = grid[r - 1][colIndex];
    grid[0][colIndex] = bottommost;
  }
  const current: MoveType = { type: 'col', index: colIndex };
  const moves = sameMoveType(state.lastMoveType, current) ? state.moves : state.moves + 1;
  return { ...state, grid, moves, lastMoveType: current };
}

export function scoreWord(word: string, moves: number): number {
  const base = word.length * 10 - moves;
  const multiplier = word.length === 8 ? 2 : 1;
  return Math.max(0, base * multiplier);
}

function inBounds(cell: CellPos): boolean {
  return cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE;
}

export function applySubmitWord(
  state: LetterWalkerState,
  cells: CellPos[],
): LetterWalkerState | typeof INVALID_MOVE {
  if (state.completed) return INVALID_MOVE;
  if (!Array.isArray(cells) || cells.length < 3 || cells.length > 8) return INVALID_MOVE;
  if (!cells.every(inBounds) || !isStraightPath(cells)) return INVALID_MOVE;

  const word = wordFromGrid(state.grid, cells);
  if (word.length !== cells.length) return INVALID_MOVE;
  if (!isDictionaryWord(word)) return INVALID_MOVE;

  const upper = word.toUpperCase();
  return {
    ...state,
    score: scoreWord(word, state.moves),
    foundWords: [...state.foundWords, upper],
    completed: true,
  };
}

export const LetterWalker: Game<LetterWalkerState> = {
  name: 'letter-walker',
  setup: () => createPuzzleState(getDailySeed(), 1),
  turn: { minMoves: 0, maxMoves: 1 },
  moves: {
    shiftRow: ({ G }, rowIndex: number, direction: 'left' | 'right') => {
      if (G.completed) return INVALID_MOVE;
      if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= GRID_SIZE) {
        return INVALID_MOVE;
      }
      if (direction !== 'left' && direction !== 'right') return INVALID_MOVE;
      const next = applyShiftRow(G, rowIndex, direction);
      Object.assign(G, next);
    },
    shiftCol: ({ G }, colIndex: number, direction: 'up' | 'down') => {
      if (G.completed) return INVALID_MOVE;
      if (!Number.isInteger(colIndex) || colIndex < 0 || colIndex >= GRID_SIZE) {
        return INVALID_MOVE;
      }
      if (direction !== 'up' && direction !== 'down') return INVALID_MOVE;
      const next = applyShiftCol(G, colIndex, direction);
      Object.assign(G, next);
    },
    submitWord: ({ G }, cells: CellPos[]) => {
      const next = applySubmitWord(G, cells);
      if (next === INVALID_MOVE) return INVALID_MOVE;
      Object.assign(G, next);
    },
    newPuzzle: ({ G }) => {
      const next = createPuzzleState(G.dailySeed, G.puzzleNumber + 1);
      Object.assign(G, next);
    },
  },
};
