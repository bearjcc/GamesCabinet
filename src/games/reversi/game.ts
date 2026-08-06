import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { idx, rowCol } from '../shared/grid';

export const SIZE = 8;

export type ReversiState = {
  cells: (string | null)[];
};

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function opponent(player: string): string {
  return player === '0' ? '1' : '0';
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

/** Indices flipped if `player` places at `at` (empty cell assumed). Empty if illegal. */
export function flipsAt(cells: (string | null)[], at: number, player: string): number[] {
  if (at < 0 || at >= SIZE * SIZE || cells[at] !== null) return [];
  const { row: r0, col: c0 } = rowCol(at, SIZE);
  const opp = opponent(player);
  const flipped: number[] = [];

  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (inBounds(r, c)) {
      const i = idx(r, c, SIZE);
      const cell = cells[i];
      if (cell === opp) {
        line.push(i);
        r += dr;
        c += dc;
        continue;
      }
      if (cell === player && line.length > 0) {
        flipped.push(...line);
      }
      break;
    }
  }

  return flipped;
}

export function legalPlaces(G: ReversiState, player: string): number[] {
  const places: number[] = [];
  for (let i = 0; i < G.cells.length; i++) {
    if (G.cells[i] === null && flipsAt(G.cells, i, player).length > 0) {
      places.push(i);
    }
  }
  return places;
}

function countDiscs(cells: (string | null)[], player: string): number {
  let n = 0;
  for (const c of cells) if (c === player) n++;
  return n;
}

function initialCells(): (string | null)[] {
  const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
  // a1 bottom-left: d4/e5 light ('1'), e4/d5 dark ('0')
  cells[idx(3, 3, SIZE)] = '0'; // d5
  cells[idx(3, 4, SIZE)] = '1'; // e5
  cells[idx(4, 3, SIZE)] = '1'; // d4
  cells[idx(4, 4, SIZE)] = '0'; // e4
  return cells;
}

export const Reversi: Game<ReversiState> = {
  name: 'reversi',
  setup: () => ({ cells: initialCells() }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    place: ({ G, ctx }, i: number) => {
      if (typeof i !== 'number' || !Number.isInteger(i)) return INVALID_MOVE;
      const flips = flipsAt(G.cells, i, ctx.currentPlayer);
      if (flips.length === 0) return INVALID_MOVE;
      G.cells[i] = ctx.currentPlayer;
      for (const f of flips) G.cells[f] = ctx.currentPlayer;
    },
    pass: ({ G, ctx }) => {
      if (legalPlaces(G, ctx.currentPlayer).length > 0) return INVALID_MOVE;
    },
  },
  endIf: ({ G }) => {
    const darkMoves = legalPlaces(G, '0');
    const lightMoves = legalPlaces(G, '1');
    if (darkMoves.length > 0 || lightMoves.length > 0) return;
    const dark = countDiscs(G.cells, '0');
    const light = countDiscs(G.cells, '1');
    if (dark > light) return { winner: '0' };
    if (light > dark) return { winner: '1' };
    return { draw: true };
  },
  ai: {
    enumerate: (G, ctx) => {
      const places = legalPlaces(G, ctx.currentPlayer);
      if (places.length === 0) return [{ move: 'pass' }];
      return places.map((i) => ({ move: 'place', args: [i] }));
    },
  },
};
