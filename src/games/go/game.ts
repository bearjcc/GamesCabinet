/**
 * 9x9 Go - capture groups, simple ko. Scoring this slice: stones on board +
 * captured stones (majority wins). No territory counting and no komi.
 *
 * Simple ko: when a place captures exactly one stone, store that empty
 * intersection as `koPoint`. The opponent may not play there on the immediate
 * next turn (that recapture would recreate the prior board). Cleared by any
 * other place, a multi-stone capture, or a pass.
 */
import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { rowCol } from '../shared/grid';

export const SIZE = 9;

export type GoState = {
  cells: (string | null)[];
  /** Stones captured by player 0 and player 1. */
  captures: [number, number];
  /** Empty intersection forbidden for the immediate reply after a single-stone capture. */
  koPoint: number | null;
  lastPass: boolean;
  consecutivePasses: number;
};

function opponent(player: string): string {
  return player === '0' ? '1' : '0';
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function neighbors(i: number): number[] {
  const { row, col } = rowCol(i, SIZE);
  const out: number[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) out.push(r * SIZE + c);
  }
  return out;
}

/** Orthogonally connected group containing `start` (caller ensures a stone). */
function groupAt(cells: (string | null)[], start: number): number[] {
  const colour = cells[start] as string;
  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const n of neighbors(cur)) {
      if (!seen.has(n) && cells[n] === colour) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return [...seen];
}

function libertyCount(cells: (string | null)[], group: number[]): number {
  const libs = new Set<number>();
  for (const i of group) {
    for (const n of neighbors(i)) {
      if (cells[n] === null) libs.add(n);
    }
  }
  return libs.size;
}

type PlaceOutcome = {
  cells: (string | null)[];
  captured: number;
  koPoint: number | null;
};

/** Simulate placing `player` at `i`. Returns null if illegal. */
export function tryPlace(G: GoState, player: string, i: number): PlaceOutcome | null {
  if (typeof i !== 'number' || !Number.isInteger(i)) return null;
  if (i < 0 || i >= SIZE * SIZE) return null;
  if (G.cells[i] !== null) return null;
  if (G.koPoint === i) return null;

  const cells = G.cells.slice();
  cells[i] = player;
  const opp = opponent(player);

  let captured = 0;
  const removed = new Set<number>();
  for (const n of neighbors(i)) {
    if (cells[n] !== opp || removed.has(n)) continue;
    const grp = groupAt(cells, n);
    if (libertyCount(cells, grp) === 0) {
      for (const g of grp) {
        cells[g] = null;
        removed.add(g);
        captured++;
      }
    }
  }

  const own = groupAt(cells, i);
  if (libertyCount(cells, own) === 0) return null;

  const koPoint = captured === 1 ? [...removed][0]! : null;
  return { cells, captured, koPoint };
}

export function legalPlaces(G: GoState, player: string): number[] {
  const places: number[] = [];
  for (let i = 0; i < G.cells.length; i++) {
    if (tryPlace(G, player, i) !== null) places.push(i);
  }
  return places;
}

function countStones(cells: (string | null)[], player: string): number {
  let n = 0;
  for (const c of cells) if (c === player) n++;
  return n;
}

function score(G: GoState, player: '0' | '1'): number {
  const cap = player === '0' ? G.captures[0] : G.captures[1];
  return countStones(G.cells, player) + cap;
}

export const Go: Game<GoState> = {
  name: 'go',
  setup: (): GoState => ({
    cells: Array(SIZE * SIZE).fill(null) as (string | null)[],
    captures: [0, 0],
    koPoint: null,
    lastPass: false,
    consecutivePasses: 0,
  }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    place: ({ G, ctx }, i: number) => {
      const outcome = tryPlace(G, ctx.currentPlayer, i);
      if (!outcome) return INVALID_MOVE;
      G.cells = outcome.cells;
      const pid = ctx.currentPlayer === '0' ? 0 : 1;
      G.captures[pid] += outcome.captured;
      G.koPoint = outcome.koPoint;
      G.lastPass = false;
      G.consecutivePasses = 0;
    },
    pass: ({ G }) => {
      G.lastPass = true;
      G.consecutivePasses += 1;
      G.koPoint = null;
    },
  },
  endIf: ({ G }) => {
    if (G.consecutivePasses < 2) return;
    const s0 = score(G, '0');
    const s1 = score(G, '1');
    if (s0 > s1) return { winner: '0' };
    if (s1 > s0) return { winner: '1' };
    return { draw: true };
  },
  ai: {
    enumerate: (G, ctx) => {
      const places = legalPlaces(G, ctx.currentPlayer).map((i) => ({
        move: 'place' as const,
        args: [i],
      }));
      return [...places, { move: 'pass' as const }];
    },
  },
};
