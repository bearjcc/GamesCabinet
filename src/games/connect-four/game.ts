import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const ROWS = 6;
export const COLS = 7;

export type C4State = {
  cells: (string | null)[];
};

function idx(row: number, col: number): number {
  return row * COLS + col;
}

function dropRow(cells: (string | null)[], col: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (cells[idx(row, col)] === null) return row;
  }
  return null;
}

function winnerOf(cells: (string | null)[]): string | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const start = cells[idx(r, c)];
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || cells[idx(rr, cc)] !== start) {
            ok = false;
            break;
          }
        }
        if (ok) return start;
      }
    }
  }
  return null;
}

export const ConnectFour: Game<C4State> = {
  name: 'connect-four',
  setup: () => ({ cells: Array(ROWS * COLS).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    drop: ({ G, ctx }, col: number) => {
      if (col < 0 || col >= COLS) return INVALID_MOVE;
      const row = dropRow(G.cells, col);
      if (row === null) return INVALID_MOVE;
      G.cells[idx(row, col)] = ctx.currentPlayer;
    },
  },
  endIf: ({ G }) => {
    const winner = winnerOf(G.cells);
    if (winner !== null) return { winner };
    if (G.cells.every((c) => c !== null)) return { draw: true };
  },
  ai: {
    enumerate: (G) => {
      const moves = [];
      for (let col = 0; col < COLS; col++) {
        if (dropRow(G.cells, col) !== null) moves.push({ move: 'drop', args: [col] });
      }
      return moves;
    },
  },
};
