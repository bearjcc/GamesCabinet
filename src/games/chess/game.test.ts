import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { Chess, type ChessState, inCheck, legalMoves, type Piece, rc, sq } from './game';

function emptyBoard(): (Piece | null)[] {
  return Array(64).fill(null);
}

function castling(all = true) {
  return {
    whiteKing: all,
    whiteQueen: all,
    blackKing: all,
    blackQueen: all,
  };
}

function state(partial: Partial<ChessState> = {}): ChessState {
  return {
    board: emptyBoard(),
    castling: castling(false),
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    ...partial,
  };
}

function startClient(setup?: () => ChessState) {
  const client = Client({
    game: setup ? { ...Chess, setup } : Chess,
  });
  client.start();
  return client;
}

describe('chess helpers', () => {
  it('converts square index and row/col consistently', () => {
    expect(sq(7, 0)).toBe(56);
    expect(rc(56)).toEqual({ row: 7, col: 0 });
  });
});

describe('Chess setup', () => {
  it('places standard armies with white to move', () => {
    const client = startClient();
    const G = client.getState()?.G as ChessState;
    expect(G.board).toHaveLength(64);
    expect(G.board[sq(7, 4)]).toEqual({ type: 'K', player: '0' });
    expect(G.board[sq(0, 4)]).toEqual({ type: 'K', player: '1' });
    expect(G.board[sq(6, 0)]).toEqual({ type: 'P', player: '0' });
    expect(G.board[sq(1, 0)]).toEqual({ type: 'P', player: '1' });
    expect(G.castling).toEqual(castling(true));
    expect(G.enPassant).toBeNull();
    expect(G.halfmove).toBe(0);
    expect(G.fullmove).toBe(1);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });
});

describe('Chess moves', () => {
  it('moves a pawn and rejects illegal destinations', () => {
    const client = startClient();
    const from = sq(6, 4);
    const to = sq(4, 4);
    client.moves.move(from, to);
    const G = client.getState()?.G as ChessState;
    expect(G.board[to]).toEqual({ type: 'P', player: '0' });
    expect(G.board[from]).toBeNull();
    expect(G.enPassant).toBe(sq(5, 4));
    expect(client.getState()?.ctx.currentPlayer).toBe('1');

    client.moves.move(sq(1, 0), sq(3, 0));
    expect((client.getState()!.G as ChessState).enPassant).toBe(sq(2, 0));
    expect((client.getState()!.G as ChessState).fullmove).toBe(2);

    const before = client.getState()?.G;
    client.moves.move(sq(7, 1), sq(5, 2)); // knight ok
    expect(client.getState()?.G).not.toBe(before);
  });

  it('rejects illegal destinations without changing state', () => {
    const client = startClient();
    const prev = structuredClone(client.getState()?.G);
    client.moves.move(sq(6, 4), sq(3, 4));
    expect(client.getState()?.G).toEqual(prev);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('captures an opponent piece and resets halfmove', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(4, 4)] = { type: 'R', player: '0' };
    board[sq(4, 0)] = { type: 'N', player: '1' };
    const client = startClient(() => state({ board, castling: castling(false), halfmove: 5 }));
    client.moves.move(sq(4, 4), sq(4, 0));
    const G = client.getState()?.G as ChessState;
    expect(G.board[sq(4, 0)]).toEqual({ type: 'R', player: '0' });
    expect(G.halfmove).toBe(0);
  });

  it('increments halfmove on quiet non-pawn moves', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(7, 0)] = { type: 'R', player: '0' };
    const client = startClient(() => state({ board, halfmove: 2 }));
    client.moves.move(sq(7, 0), sq(5, 0));
    expect((client.getState()!.G as ChessState).halfmove).toBe(3);
  });

  it('promotes a pawn to a queen', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(1, 0)] = { type: 'P', player: '0' };
    const client = startClient(() => state({ board }));
    client.moves.move(sq(1, 0), sq(0, 0));
    expect((client.getState()!.G as ChessState).board[sq(0, 0)]).toEqual({
      type: 'Q',
      player: '0',
    });
  });

  it('allows en passant capture', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(3, 4)] = { type: 'P', player: '0' };
    board[sq(3, 5)] = { type: 'P', player: '1' };
    const epClient = startClient(() => state({ board, enPassant: sq(2, 5) }));
    epClient.moves.move(sq(3, 4), sq(2, 5));
    const G = epClient.getState()?.G as ChessState;
    expect(G.board[sq(2, 5)]).toEqual({ type: 'P', player: '0' });
    expect(G.board[sq(3, 5)]).toBeNull();
    expect(G.enPassant).toBeNull();
  });

  it('black can capture en passant as well', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 3)] = { type: 'P', player: '0' };
    board[sq(4, 4)] = { type: 'P', player: '1' };
    const client = startClient(() => state({ board }));
    client.moves.move(sq(6, 3), sq(4, 3));
    expect((client.getState()!.G as ChessState).enPassant).toBe(sq(5, 3));
    client.moves.move(sq(4, 4), sq(5, 3));
    const G = client.getState()?.G as ChessState;
    expect(G.board[sq(5, 3)]).toEqual({ type: 'P', player: '1' });
    expect(G.board[sq(4, 3)]).toBeNull();
  });

  it('castles kingside and queenside for white', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(7, 7)] = { type: 'R', player: '0' };
    board[sq(7, 0)] = { type: 'R', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    const client = startClient(() =>
      state({
        board,
        castling: { ...castling(false), whiteKing: true, whiteQueen: true },
      }),
    );
    expect(legalMoves(client.getState()?.G as ChessState, '0')).toContainEqual({
      from: sq(7, 4),
      to: sq(7, 6),
    });
    client.moves.move(sq(7, 4), sq(7, 6));
    const G = client.getState()?.G as ChessState;
    expect(G.board[sq(7, 6)]).toEqual({ type: 'K', player: '0' });
    expect(G.board[sq(7, 5)]).toEqual({ type: 'R', player: '0' });
    expect(G.castling.whiteKing).toBe(false);
    expect(G.castling.whiteQueen).toBe(false);
  });

  it('castles queenside for white', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(7, 0)] = { type: 'R', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    const client = startClient(() =>
      state({
        board,
        castling: { ...castling(false), whiteQueen: true },
      }),
    );
    client.moves.move(sq(7, 4), sq(7, 2));
    const G = client.getState()?.G as ChessState;
    expect(G.board[sq(7, 2)]?.type).toBe('K');
    expect(G.board[sq(7, 3)]?.type).toBe('R');
  });

  it('castles both sides for black', () => {
    const boardK = emptyBoard();
    boardK[sq(7, 4)] = { type: 'K', player: '0' };
    boardK[sq(0, 4)] = { type: 'K', player: '1' };
    boardK[sq(0, 7)] = { type: 'R', player: '1' };
    boardK[sq(6, 0)] = { type: 'P', player: '0' };
    const client = startClient(() =>
      state({
        board: boardK,
        castling: { ...castling(false), blackKing: true },
      }),
    );
    client.moves.move(sq(6, 0), sq(5, 0));
    client.moves.move(sq(0, 4), sq(0, 6));
    const G = client.getState()?.G as ChessState;
    expect(G.board[sq(0, 6)]?.type).toBe('K');
    expect(G.board[sq(0, 5)]?.type).toBe('R');

    const boardQ = emptyBoard();
    boardQ[sq(7, 4)] = { type: 'K', player: '0' };
    boardQ[sq(0, 4)] = { type: 'K', player: '1' };
    boardQ[sq(0, 0)] = { type: 'R', player: '1' };
    boardQ[sq(6, 1)] = { type: 'P', player: '0' };
    const clientQ = startClient(() =>
      state({
        board: boardQ,
        castling: { ...castling(false), blackQueen: true },
      }),
    );
    clientQ.moves.move(sq(6, 1), sq(5, 1));
    clientQ.moves.move(sq(0, 4), sq(0, 2));
    expect((clientQ.getState()!.G as ChessState).board[sq(0, 2)]?.type).toBe('K');
    expect((clientQ.getState()!.G as ChessState).board[sq(0, 3)]?.type).toBe('R');
  });

  it('forbids castling through check', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(7, 7)] = { type: 'R', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(5, 5)] = { type: 'R', player: '1' }; // attacks f1
    const G = state({
      board,
      castling: { ...castling(false), whiteKing: true },
    });
    const moves = legalMoves(G, '0');
    expect(moves.some((m) => m.from === sq(7, 4) && m.to === sq(7, 6))).toBe(false);
  });

  it('forbids castling while in check', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(7, 7)] = { type: 'R', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(4, 4)] = { type: 'R', player: '1' };
    const G = state({
      board,
      castling: { ...castling(false), whiteKing: true },
    });
    expect(inCheck(G, '0')).toBe(true);
    expect(legalMoves(G, '0').some((m) => m.to === sq(7, 6))).toBe(false);
  });

  it('clears castling rights when a rook moves or is captured', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(7, 7)] = { type: 'R', player: '0' };
    board[sq(7, 0)] = { type: 'R', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(0, 7)] = { type: 'R', player: '1' };
    board[sq(0, 0)] = { type: 'R', player: '1' };
    const client = startClient(() => state({ board, castling: castling(true) }));
    client.moves.move(sq(7, 7), sq(5, 7));
    expect((client.getState()!.G as ChessState).castling.whiteKing).toBe(false);

    const board2 = emptyBoard();
    board2[sq(7, 4)] = { type: 'K', player: '0' };
    board2[sq(7, 0)] = { type: 'R', player: '0' };
    board2[sq(0, 4)] = { type: 'K', player: '1' };
    board2[sq(1, 0)] = { type: 'Q', player: '1' };
    const client2 = startClient(() =>
      state({
        board: board2,
        castling: { ...castling(false), whiteQueen: true },
      }),
    );
    // Capture would be black's - white moves rook a-file
    client2.moves.move(sq(7, 0), sq(6, 0));
    expect((client2.getState()!.G as ChessState).castling.whiteQueen).toBe(false);

    // Capture black rook on a8 with white queen
    const board3 = emptyBoard();
    board3[sq(7, 4)] = { type: 'K', player: '0' };
    board3[sq(0, 4)] = { type: 'K', player: '1' };
    board3[sq(0, 0)] = { type: 'R', player: '1' };
    board3[sq(7, 0)] = { type: 'R', player: '0' };
    const client3 = startClient(() => state({ board: board3, castling: castling(true) }));
    client3.moves.move(sq(7, 0), sq(0, 0));
    expect((client3.getState()!.G as ChessState).castling.blackQueen).toBe(false);
  });

  it('clears black castling rights when black king or rook moves', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(0, 7)] = { type: 'R', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '0' };
    const client = startClient(() => state({ board, castling: castling(true) }));
    client.moves.move(sq(6, 0), sq(5, 0));
    client.moves.move(sq(0, 7), sq(0, 6));
    const G = client.getState()?.G as ChessState;
    expect(G.castling.blackKing).toBe(false);

    const board2 = emptyBoard();
    board2[sq(7, 4)] = { type: 'K', player: '0' };
    board2[sq(0, 4)] = { type: 'K', player: '1' };
    board2[sq(6, 1)] = { type: 'P', player: '0' };
    const client2 = startClient(() => state({ board: board2, castling: castling(true) }));
    client2.moves.move(sq(6, 1), sq(5, 1));
    client2.moves.move(sq(0, 4), sq(0, 3));
    expect((client2.getState()!.G as ChessState).castling.blackKing).toBe(false);
    expect((client2.getState()!.G as ChessState).castling.blackQueen).toBe(false);
  });

  it('clears black kingside rights when h8 rook is captured', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(0, 7)] = { type: 'R', player: '1' };
    board[sq(7, 7)] = { type: 'R', player: '0' };
    const client = startClient(() => state({ board, castling: castling(true) }));
    client.moves.move(sq(7, 7), sq(0, 7));
    expect((client.getState()!.G as ChessState).castling.blackKing).toBe(false);
  });

  it('blocks sliding pieces and allows knight leaps', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(7, 0)] = { type: 'R', player: '0' };
    board[sq(5, 0)] = { type: 'P', player: '0' };
    board[sq(7, 1)] = { type: 'N', player: '0' };
    board[sq(4, 4)] = { type: 'B', player: '0' };
    board[sq(5, 5)] = { type: 'P', player: '1' };
    board[sq(3, 3)] = { type: 'Q', player: '0' };
    const G = state({ board });
    const rookMoves = legalMoves(G, '0').filter((m) => m.from === sq(7, 0));
    expect(rookMoves.some((m) => m.to === sq(4, 0))).toBe(false);
    const knightMoves = legalMoves(G, '0').filter((m) => m.from === sq(7, 1));
    expect(knightMoves.some((m) => m.to === sq(5, 2))).toBe(true);
    const bishopMoves = legalMoves(G, '0').filter((m) => m.from === sq(4, 4));
    expect(bishopMoves).toContainEqual({ from: sq(4, 4), to: sq(5, 5) });
    const queenMoves = legalMoves(G, '0').filter((m) => m.from === sq(3, 3));
    expect(queenMoves.length).toBeGreaterThan(0);
  });

  it('does not allow moves that leave the king in check', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 4)] = { type: 'R', player: '0' };
    board[sq(5, 4)] = { type: 'R', player: '1' };
    const G = state({ board });
    const moves = legalMoves(G, '0').filter((m) => m.from === sq(6, 4));
    expect(moves.every((m) => m.to === sq(5, 4) || rc(m.to).col === 4)).toBe(true);
    expect(moves.some((m) => m.to === sq(6, 0))).toBe(false);
  });

  it('detects checkmate as a win for the opponent', () => {
    // Back-rank mate: white to move is mated.
    const mate = emptyBoard();
    mate[sq(7, 6)] = { type: 'K', player: '0' }; // g1
    mate[sq(6, 5)] = { type: 'P', player: '0' };
    mate[sq(6, 6)] = { type: 'P', player: '0' };
    mate[sq(6, 7)] = { type: 'P', player: '0' };
    mate[sq(0, 4)] = { type: 'K', player: '1' };
    mate[sq(7, 0)] = { type: 'R', player: '1' }; // a1 rook mates
    const client = startClient(() => state({ board: mate }));
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });

    // Black to move is mated after white delivers.
    const before = emptyBoard();
    before[sq(0, 6)] = { type: 'K', player: '1' }; // g8
    before[sq(1, 5)] = { type: 'P', player: '1' };
    before[sq(1, 6)] = { type: 'P', player: '1' };
    before[sq(1, 7)] = { type: 'P', player: '1' };
    before[sq(7, 4)] = { type: 'K', player: '0' };
    before[sq(0, 1)] = { type: 'R', player: '0' }; // b8 - will move to a8
    const mateBlack = startClient(() => state({ board: before }));
    mateBlack.moves.move(sq(0, 1), sq(0, 0));
    expect(mateBlack.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('detects stalemate as a draw', () => {
    // Ka8, Kc6, Qd6; white plays Qc7 - black has no legal move and is not in check.
    const start = emptyBoard();
    start[sq(0, 0)] = { type: 'K', player: '1' };
    start[sq(2, 2)] = { type: 'K', player: '0' };
    start[sq(2, 3)] = { type: 'Q', player: '0' };
    const stClient = startClient(() => state({ board: start }));
    stClient.moves.move(sq(2, 3), sq(1, 2));
    expect(stClient.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('enumerates AI moves from legalMoves', () => {
    const client = startClient();
    const G = client.getState()?.G as ChessState;
    const ctx = client.getState()?.ctx;
    const enumerated = Chess.ai?.enumerate?.(G, ctx!, undefined!);
    expect(enumerated?.length).toBe(legalMoves(G, '0').length);
    expect(enumerated?.[0]).toMatchObject({ move: 'move' });
  });

  it('generates pawn captures and black pawn advances', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(4, 4)] = { type: 'P', player: '0' };
    board[sq(3, 3)] = { type: 'P', player: '1' };
    board[sq(3, 5)] = { type: 'P', player: '1' };
    board[sq(1, 1)] = { type: 'P', player: '1' };
    const G = state({ board });
    const whitePawn = legalMoves(G, '0').filter((m) => m.from === sq(4, 4));
    expect(whitePawn).toContainEqual({ from: sq(4, 4), to: sq(3, 3) });
    expect(whitePawn).toContainEqual({ from: sq(4, 4), to: sq(3, 5) });

    const client = startClient(() => state({ board }));
    client.moves.move(sq(4, 4), sq(3, 3));
    // black double step
    client.moves.move(sq(1, 1), sq(3, 1));
    expect((client.getState()!.G as ChessState).enPassant).toBe(sq(2, 1));
  });

  it('black pawn promotes on rank 1', () => {
    const board = emptyBoard();
    board[sq(7, 4)] = { type: 'K', player: '0' };
    board[sq(0, 4)] = { type: 'K', player: '1' };
    board[sq(6, 0)] = { type: 'P', player: '1' };
    board[sq(5, 1)] = { type: 'P', player: '0' };
    const client = startClient(() => state({ board }));
    client.moves.move(sq(5, 1), sq(4, 1));
    client.moves.move(sq(6, 0), sq(7, 0));
    expect((client.getState()!.G as ChessState).board[sq(7, 0)]).toEqual({
      type: 'Q',
      player: '1',
    });
  });

  it('covers edge knight and king attacks without wrapping', () => {
    const board = emptyBoard();
    board[sq(0, 0)] = { type: 'K', player: '0' };
    board[sq(7, 7)] = { type: 'K', player: '1' };
    board[sq(2, 1)] = { type: 'N', player: '1' };
    expect(inCheck(state({ board }), '0')).toBe(true);
    const moves = legalMoves(state({ board }), '0');
    expect(moves.every((m) => m.from === sq(0, 0))).toBe(true);
  });
});
