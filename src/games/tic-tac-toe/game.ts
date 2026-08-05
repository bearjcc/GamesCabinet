import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export type TTTState = {
  cells: (string | null)[];
};

function lineWinner(cells: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

export const TicTacToe: Game<TTTState> = {
  name: 'tic-tac-toe',
  setup: () => ({ cells: Array(9).fill(null) }),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    clickCell: ({ G, ctx }, id: number) => {
      if (id < 0 || id > 8 || G.cells[id] !== null) return INVALID_MOVE;
      G.cells[id] = ctx.currentPlayer;
    },
  },
  endIf: ({ G }) => {
    const winner = lineWinner(G.cells);
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
