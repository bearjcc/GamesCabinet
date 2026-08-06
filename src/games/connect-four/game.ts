import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { idx, nInARowWinner } from '../shared/grid';

export const ROWS = 6;
export const COLS = 7;
const WIN_LENGTH = 4;

export type C4State = {
  cells: (string | null)[];
};

function dropRow(cells: (string | null)[], col: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (cells[idx(row, col, COLS)] === null) return row;
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
      G.cells[idx(row, col, COLS)] = ctx.currentPlayer;
    },
  },
  endIf: ({ G }) => {
    const winner = nInARowWinner(G.cells, { rows: ROWS, cols: COLS, n: WIN_LENGTH });
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
