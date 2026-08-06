import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { nInARowWinner } from '../shared/grid';

export type TTTState = {
  cells: (string | null)[];
};

const SIZE = 3;

export const TicTacToe: Game<TTTState> = {
  name: 'tic-tac-toe',
  setup: () => ({ cells: Array(SIZE * SIZE).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    clickCell: ({ G, ctx }, id: number) => {
      if (id < 0 || id > 8 || G.cells[id] !== null) return INVALID_MOVE;
      G.cells[id] = ctx.currentPlayer;
    },
  },
  endIf: ({ G }) => {
    const winner = nInARowWinner(G.cells, { rows: SIZE, cols: SIZE, n: SIZE });
    if (winner !== null) return { winner };
    if (G.cells.every((c) => c !== null)) return { draw: true };
  },
  ai: {
    enumerate: (G) => {
      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (G.cells[i] === null) moves.push({ move: 'clickCell', args: [i] });
      }
      return moves;
    },
  },
};
