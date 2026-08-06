import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export type SwipeDir = 'up' | 'down' | 'left' | 'right';

/** Snapshot restored by undo (board + score + win flag). */
export type Game2048Snapshot = {
  cells: (number | null)[];
  score: number;
  won: boolean;
};

export type Game2048State = {
  cells: (number | null)[];
  score: number;
  won: boolean;
  /** Previous successful swipe states; oldest first. */
  history: Game2048Snapshot[];
};

export const HISTORY_LIMIT = 10;

const SIZE = 4;
const LEN = SIZE * SIZE;

function idx(r: number, c: number): number {
  return r * SIZE + c;
}

function lineIndices(dir: SwipeDir, lane: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    if (dir === 'left') out.push(idx(lane, i));
    else if (dir === 'right') out.push(idx(lane, SIZE - 1 - i));
    else if (dir === 'up') out.push(idx(i, lane));
    else out.push(idx(SIZE - 1 - i, lane));
  }
  return out;
}

/** Slide + merge one lane toward index 0 of `line`. Returns score gained. */
function collapse(line: (number | null)[]): { line: (number | null)[]; gained: number } {
  const vals = line.filter((v): v is number => v !== null);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const v = vals[i] * 2;
      merged.push(v);
      gained += v;
      i++;
    } else {
      merged.push(vals[i]);
    }
  }
  const next: (number | null)[] = [...merged];
  while (next.length < SIZE) next.push(null);
  return { line: next, gained };
}

export function applySwipe(
  cells: (number | null)[],
  dir: SwipeDir,
): { cells: (number | null)[]; gained: number; changed: boolean } {
  const next = cells.slice();
  let gained = 0;
  let changed = false;
  for (let lane = 0; lane < SIZE; lane++) {
    const indices = lineIndices(dir, lane);
    const before = indices.map((i) => next[i]);
    const { line, gained: g } = collapse(before);
    gained += g;
    for (let i = 0; i < SIZE; i++) {
      if (next[indices[i]] !== line[i]) changed = true;
      next[indices[i]] = line[i];
    }
  }
  return { cells: next, gained, changed };
}

export function canMove(cells: (number | null)[], dir: SwipeDir): boolean {
  return applySwipe(cells, dir).changed;
}

export function anyMove(cells: (number | null)[]): boolean {
  return (
    canMove(cells, 'up') ||
    canMove(cells, 'down') ||
    canMove(cells, 'left') ||
    canMove(cells, 'right')
  );
}

function emptyIndexes(cells: (number | null)[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < LEN; i++) {
    if (cells[i] === null) out.push(i);
  }
  return out;
}

export function spawn(
  cells: (number | null)[],
  random: { Shuffle: <T>(arr: T[]) => T[]; Number: () => number },
): void {
  const empties = random.Shuffle(emptyIndexes(cells));
  if (empties.length === 0) return;
  cells[empties[0]] = random.Number() < 0.9 ? 2 : 4;
}

export function pushUndoSnapshot(G: Game2048State): void {
  G.history.push({
    cells: G.cells.slice(),
    score: G.score,
    won: G.won,
  });
  while (G.history.length > HISTORY_LIMIT) {
    G.history.shift();
  }
}

export function canUndo(G: Game2048State, gameover: unknown): boolean {
  return !gameover && G.history.length > 0;
}

export const Game2048: Game<Game2048State> = {
  name: '2048',
  setup: ({ random }) => {
    const cells: (number | null)[] = Array(LEN).fill(null);
    spawn(cells, random);
    spawn(cells, random);
    return { cells, score: 0, won: false, history: [] };
  },
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    swipe: ({ G, random }, dir: SwipeDir) => {
      if (dir !== 'up' && dir !== 'down' && dir !== 'left' && dir !== 'right') {
        return INVALID_MOVE;
      }
      const { cells, gained, changed } = applySwipe(G.cells, dir);
      if (!changed) return INVALID_MOVE;
      pushUndoSnapshot(G);
      G.cells = cells;
      G.score += gained;
      if (cells.some((c) => c === 2048)) G.won = true;
      spawn(G.cells, random);
    },
    undo: ({ G, ctx }) => {
      if (ctx.gameover || G.history.length === 0) return INVALID_MOVE;
      const prev = G.history.pop()!;
      G.cells = prev.cells;
      G.score = prev.score;
      G.won = prev.won;
    },
  },
  endIf: ({ G }) => {
    if (!anyMove(G.cells)) return { score: G.score, won: G.won };
  },
};
