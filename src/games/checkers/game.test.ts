import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { Checkers, type CheckersState, legalMoves, type Piece, rc, sq } from './game';

function emptyBoard(): (Piece | null)[] {
  return Array(64).fill(null);
}

describe('checkers helpers', () => {
  it('converts square index and row/col consistently', () => {
    expect(sq(2, 3)).toBe(19);
    expect(rc(19)).toEqual({ row: 2, col: 3 });
  });

  it('skips other pieces during a capture chain', () => {
    const board = emptyBoard();
    board[sq(4, 3)] = { player: '0', king: false };
    board[sq(2, 5)] = { player: '0', king: false };
    board[sq(5, 4)] = { player: '1', king: false };
    board[sq(7, 6)] = { player: '1', king: false };
    const G: CheckersState = {
      board,
      mustContinueFrom: sq(4, 3),
      pliesWithoutCaptureOrPromotion: 0,
    };
    const moves = legalMoves(G, '0');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.from === sq(4, 3))).toBe(true);
  });

  it('requires captures when any capture is available', () => {
    const board = emptyBoard();
    // Player 0 piece at (2,1); player 1 victim at (3,2); land (4,3)
    board[sq(2, 1)] = { player: '0', king: false };
    board[sq(3, 2)] = { player: '1', king: false };
    // Quiet alternative also open from another piece
    board[sq(2, 5)] = { player: '0', king: false };

    const G: CheckersState = {
      board,
      mustContinueFrom: null,
      pliesWithoutCaptureOrPromotion: 0,
    };
    const moves = legalMoves(G, '0');
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.capture !== null)).toBe(true);
    expect(moves).toContainEqual({
      from: sq(2, 1),
      to: sq(4, 3),
      capture: sq(3, 2),
    });
  });

  it('requires the longest available capture sequence', () => {
    const board = emptyBoard();
    // Short capture: (2,1) takes (3,2) lands (4,3) - chain length 1
    board[sq(2, 1)] = { player: '0', king: false };
    board[sq(3, 2)] = { player: '1', king: false };
    // Long capture: (1,0) takes (2,1) is wrong - use separate pieces
    // (0,1) takes (1,2)->(2,3), then (3,4)->(4,5) - need clear path
    board[sq(0, 1)] = { player: '0', king: false };
    board[sq(1, 2)] = { player: '1', king: false };
    board[sq(3, 4)] = { player: '1', king: false };

    const G: CheckersState = {
      board,
      mustContinueFrom: null,
      pliesWithoutCaptureOrPromotion: 0,
    };
    const moves = legalMoves(G, '0');
    expect(moves.every((m) => m.capture !== null)).toBe(true);
    // Only the first jump of the length-2 chain is legal; the length-1 capture is not.
    expect(moves).toEqual([{ from: sq(0, 1), to: sq(2, 3), capture: sq(1, 2) }]);
  });
});

describe('Checkers game', () => {
  it('kings a man that reaches the far row', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          // Player 0 at row 6 dark square; move forward to row 7
          board[sq(6, 1)] = { player: '0', king: false };
          // Keep an opposing piece so endIf does not fire on empty side
          board[sq(0, 1)] = { player: '1', king: false };
          return { board, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 };
        },
      },
    });
    client.start();
    client.moves.movePiece(sq(6, 1), sq(7, 0));
    const G = client.getState()?.G as CheckersState;
    expect(G.board[sq(7, 0)]).toEqual({ player: '0', king: true });
  });

  it('ends when one side has no pieces', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          board[sq(2, 1)] = { player: '0', king: false };
          return { board, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 };
        },
      },
    });
    client.start();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends when the current player has no legal moves', () => {
    const board = emptyBoard();
    board[sq(0, 1)] = { player: '0', king: false };
    board[sq(1, 0)] = { player: '1', king: false };
    board[sq(1, 2)] = { player: '1', king: false };
    board[sq(2, 3)] = { player: '1', king: false };
    board[sq(7, 6)] = { player: '1', king: false };
    const client = Client({
      game: {
        ...Checkers,
        setup: () => ({
          board,
          mustContinueFrom: null,
          pliesWithoutCaptureOrPromotion: 0,
        }),
      },
    });
    client.start();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('continues a capture chain before ending the turn', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          board[sq(2, 1)] = { player: '0', king: false };
          board[sq(3, 2)] = { player: '1', king: false };
          board[sq(5, 4)] = { player: '1', king: false };
          board[sq(7, 6)] = { player: '1', king: false };
          return { board, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 };
        },
      },
    });
    client.start();
    client.moves.movePiece(sq(2, 1), sq(4, 3));
    expect(stateOf(client).mustContinueFrom).toBe(sq(4, 3));
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
    client.moves.movePiece(sq(4, 3), sq(6, 5));
    expect(stateOf(client).mustContinueFrom).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('kings player 1 on the near row', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          board[sq(2, 1)] = { player: '0', king: false };
          board[sq(1, 2)] = { player: '1', king: false };
          board[sq(6, 5)] = { player: '0', king: false };
          return { board, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 };
        },
      },
    });
    client.start();
    client.moves.movePiece(sq(2, 1), sq(3, 0));
    client.moves.movePiece(sq(1, 2), sq(0, 3));
    expect(stateOf(client).board[sq(0, 3)]).toEqual({ player: '1', king: true });
  });

  it('rejects illegal moves and ends when player 0 is eliminated', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '1', king: false };
    expect(
      (Checkers.endIf as (ctx: any) => any)({
        G: { board, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 },
        ctx: { currentPlayer: '0' } as never,
      }),
    ).toEqual({ winner: '1' });

    const blocked = emptyBoard();
    blocked[sq(0, 1)] = { player: '1', king: false };
    blocked[sq(7, 6)] = { player: '0', king: false };
    expect(
      (Checkers.endIf as (ctx: any) => any)({
        G: { board: blocked, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 },
        ctx: { currentPlayer: '1' } as never,
      }),
    ).toEqual({ winner: '0' });

    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const b = emptyBoard();
          b[sq(2, 1)] = { player: '0', king: false };
          b[sq(5, 4)] = { player: '1', king: false };
          return { board: b, mustContinueFrom: null, pliesWithoutCaptureOrPromotion: 0 };
        },
      },
    });
    client.start();
    const before = structuredClone(stateOf(client));
    client.moves.movePiece(sq(5, 4), sq(4, 3));
    expect(stateOf(client)).toEqual(before);
  });

  it('starts from the standard setup', () => {
    const client = Client({ game: Checkers });
    client.start();
    const g = client.getState()?.G as CheckersState;
    expect(g.board.filter(Boolean)).toHaveLength(24);
    expect(g.pliesWithoutCaptureOrPromotion).toBe(0);
  });

  it('draws after 40 consecutive plies with no capture or promotion', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          // Kings far apart: only quiet moves, no captures available.
          board[sq(0, 1)] = { player: '0', king: true };
          board[sq(7, 6)] = { player: '1', king: true };
          return {
            board,
            mustContinueFrom: null,
            pliesWithoutCaptureOrPromotion: 39,
          };
        },
      },
    });
    client.start();
    expect(client.getState()?.ctx.gameover).toBeUndefined();
    client.moves.movePiece(sq(0, 1), sq(1, 2));
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('resets the 40-ply counter on capture', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          board[sq(2, 1)] = { player: '0', king: false };
          board[sq(3, 2)] = { player: '1', king: false };
          board[sq(7, 6)] = { player: '1', king: false };
          return {
            board,
            mustContinueFrom: null,
            pliesWithoutCaptureOrPromotion: 12,
          };
        },
      },
    });
    client.start();
    client.moves.movePiece(sq(2, 1), sq(4, 3));
    expect(stateOf(client).pliesWithoutCaptureOrPromotion).toBe(0);
    expect(client.getState()?.ctx.gameover).toBeUndefined();
  });

  it('resets the 40-ply counter on promotion', () => {
    const client = Client({
      game: {
        ...Checkers,
        setup: () => {
          const board = emptyBoard();
          board[sq(6, 1)] = { player: '0', king: false };
          // Opponent mid-board so the game does not end by immobilisation after the ply.
          board[sq(2, 1)] = { player: '1', king: false };
          return {
            board,
            mustContinueFrom: null,
            pliesWithoutCaptureOrPromotion: 12,
          };
        },
      },
    });
    client.start();
    client.moves.movePiece(sq(6, 1), sq(7, 0));
    expect(stateOf(client).board[sq(7, 0)]).toEqual({ player: '0', king: true });
    expect(stateOf(client).pliesWithoutCaptureOrPromotion).toBe(0);
    expect(client.getState()?.ctx.gameover).toBeUndefined();
  });

  it('still wins by immobilising the opponent before a draw', () => {
    const board = emptyBoard();
    board[sq(0, 1)] = { player: '0', king: false };
    board[sq(1, 0)] = { player: '1', king: false };
    board[sq(1, 2)] = { player: '1', king: false };
    board[sq(2, 3)] = { player: '1', king: false };
    board[sq(7, 6)] = { player: '1', king: false };
    const client = Client({
      game: {
        ...Checkers,
        setup: () => ({
          board,
          mustContinueFrom: null,
          pliesWithoutCaptureOrPromotion: 39,
        }),
      },
    });
    client.start();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});

function stateOf(client: ReturnType<typeof Client>): CheckersState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as CheckersState;
}

describe('Checkers ai', () => {
  it('enumerates legal moves for the current player', () => {
    const board = emptyBoard();
    board[sq(2, 1)] = { player: '0', king: false };
    const G: CheckersState = {
      board,
      mustContinueFrom: null,
      pliesWithoutCaptureOrPromotion: 0,
    };
    const moves = (Checkers.ai!.enumerate as (G: any, ctx: any) => any[])(G, {
      currentPlayer: '0',
    } as never);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0]).toEqual({ move: 'movePiece', args: expect.any(Array) });
  });
});
