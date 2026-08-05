import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

/** English draughts on dark squares. Player 0 starts at top (rows 0-2); player 1 at bottom (5-7). */
export type Piece = {
  player: '0' | '1';
  king: boolean;
};

export type CheckersState = {
  board: (Piece | null)[];
  mustContinueFrom: number | null;
};

const SIZE = 8;

export function sq(row: number, col: number): number {
  return row * SIZE + col;
}

export function rc(i: number): { row: number; col: number } {
  return { row: Math.floor(i / SIZE), col: i % SIZE };
}

function dark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function setupBoard(): (Piece | null)[] {
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!dark(row, col)) continue;
      if (row < 3) board[sq(row, col)] = { player: '0', king: false };
      if (row > 4) board[sq(row, col)] = { player: '1', king: false };
    }
  }
  return board;
}

export type CheckersMove = { from: number; to: number; capture: number | null };

function forwardDir(player: '0' | '1'): number[] {
  return player === '0' ? [1] : [-1];
}

export function legalMoves(G: CheckersState, player: string): CheckersMove[] {
  const p = player as '0' | '1';
  const captures: CheckersMove[] = [];
  const quiet: CheckersMove[] = [];
  const dirsRow = (piece: Piece) => (piece.king ? [-1, 1] : forwardDir(piece.player));

  for (let from = 0; from < 64; from++) {
    const piece = G.board[from];
    if (!piece || piece.player !== p) continue;
    if (G.mustContinueFrom !== null && from !== G.mustContinueFrom) continue;
    const { row, col } = rc(from);

    for (const dr of dirsRow(piece)) {
      for (const dc of [-1, 1]) {
        const midR = row + dr;
        const midC = col + dc;
        const landR = row + dr * 2;
        const landC = col + dc * 2;
        if (landR >= 0 && landR < SIZE && landC >= 0 && landC < SIZE && dark(landR, landC)) {
          const mid = sq(midR, midC);
          const to = sq(landR, landC);
          const victim = G.board[mid];
          if (victim && victim.player !== p && G.board[to] === null) {
            captures.push({ from, to, capture: mid });
          }
        }
        if (G.mustContinueFrom === null) {
          const toR = row + dr;
          const toC = col + dc;
          if (toR >= 0 && toR < SIZE && toC >= 0 && toC < SIZE && dark(toR, toC)) {
            const to = sq(toR, toC);
            if (G.board[to] === null) quiet.push({ from, to, capture: null });
          }
        }
      }
    }
  }
  return captures.length ? captures : quiet;
}

function applyMove(G: CheckersState, move: CheckersMove): boolean {
  const piece = G.board[move.from];
  /* v8 ignore start -- only called with a matched legal move */
  if (!piece) return false;
  /* v8 ignore stop */
  G.board[move.to] = piece;
  G.board[move.from] = null;
  if (move.capture !== null) G.board[move.capture] = null;

  const { row } = rc(move.to);
  if (!piece.king && ((piece.player === '0' && row === 7) || (piece.player === '1' && row === 0))) {
    piece.king = true;
  }

  if (move.capture !== null) {
    G.mustContinueFrom = move.to;
    const more = legalMoves(G, piece.player).filter((m) => m.capture !== null);
    if (more.length) return false;
  }
  G.mustContinueFrom = null;
  return true;
}

function countPieces(board: (Piece | null)[], player: string): number {
  return board.filter((p) => p && p.player === player).length;
}

export const Checkers: Game<CheckersState> = {
  name: 'checkers',
  setup: () => ({ board: setupBoard(), mustContinueFrom: null }),
  moves: {
    movePiece: ({ G, ctx, events }, from: number, to: number) => {
      const legal = legalMoves(G, ctx.currentPlayer);
      const match = legal.find((m) => m.from === from && m.to === to);
      if (!match) return INVALID_MOVE;
      const finished = applyMove(G, match);
      if (finished) events.endTurn();
    },
  },
  turn: { minMoves: 1, maxMoves: 12 },
  endIf: ({ G, ctx }) => {
    if (countPieces(G.board, '0') === 0) return { winner: '1' };
    if (countPieces(G.board, '1') === 0) return { winner: '0' };
    if (legalMoves(G, ctx.currentPlayer).length === 0) {
      return { winner: ctx.currentPlayer === '0' ? '1' : '0' };
    }
  },
  ai: {
    enumerate: (G, ctx) =>
      legalMoves(G, ctx.currentPlayer).map((m) => ({
        move: 'movePiece',
        args: [m.from, m.to],
      })),
  },
};
