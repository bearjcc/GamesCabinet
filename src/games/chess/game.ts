import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { idx, rowCol } from '../shared/grid';

/**
 * Standard chess on an 8x8 board.
 *
 * - Player '0' = white (bottom ranks 1-2 from white's view); white moves first.
 * - Player '1' = black (top ranks 7-8).
 * - Pieces: KQRBNP with standard moves; capture opponent pieces.
 * - Castling: both sides, if king and rook unmoved, path clear, and king not
 *   in / through / out of check.
 * - En passant when a pawn could capture through a double-step.
 * - Promotion: always to Queen (kept simple for this slice).
 * - Illegal to leave own king in check.
 * - endIf: checkmate -> winner; stalemate -> draw.
 * - Optional draw rules (50-move, threefold) are NOT enforced.
 */

export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

export type Piece = {
  type: PieceType;
  player: '0' | '1';
};

export type CastlingRights = {
  whiteKing: boolean;
  whiteQueen: boolean;
  blackKing: boolean;
  blackQueen: boolean;
};

export type ChessState = {
  board: (Piece | null)[];
  castling: CastlingRights;
  /** Square the capturing pawn lands on, or null. */
  enPassant: number | null;
  halfmove: number;
  fullmove: number;
};

export type ChessMove = { from: number; to: number };

const SIZE = 8;

export function sq(row: number, col: number): number {
  return idx(row, col, SIZE);
}

export function rc(i: number): { row: number; col: number } {
  return rowCol(i, SIZE);
}

function opponent(player: '0' | '1'): '0' | '1' {
  return player === '0' ? '1' : '0';
}

function cloneCastling(c: CastlingRights): CastlingRights {
  return { ...c };
}

function cloneState(G: ChessState): ChessState {
  return {
    board: G.board.map((p) => (p ? { ...p } : null)),
    castling: cloneCastling(G.castling),
    enPassant: G.enPassant,
    halfmove: G.halfmove,
    fullmove: G.fullmove,
  };
}

function setupBoard(): (Piece | null)[] {
  const board: (Piece | null)[] = Array(64).fill(null);
  const back: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let col = 0; col < SIZE; col++) {
    board[sq(0, col)] = { type: back[col], player: '1' };
    board[sq(1, col)] = { type: 'P', player: '1' };
    board[sq(6, col)] = { type: 'P', player: '0' };
    board[sq(7, col)] = { type: back[col], player: '0' };
  }
  return board;
}

function defaultCastling(): CastlingRights {
  return {
    whiteKing: true,
    whiteQueen: true,
    blackKing: true,
    blackQueen: true,
  };
}

function onBoard(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function findKing(board: (Piece | null)[], player: '0' | '1'): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.player === player && p.type === 'K') return i;
  }
  /* v8 ignore start -- every legal position has a king */
  return -1;
  /* v8 ignore stop */
}

/** Squares attacked by `player` (for check / castling). */
function attackedBy(board: (Piece | null)[], player: '0' | '1'): Set<number> {
  const attacked = new Set<number>();
  const addRay = (from: number, dr: number, dc: number) => {
    let { row, col } = rc(from);
    for (;;) {
      row += dr;
      col += dc;
      if (!onBoard(row, col)) break;
      const to = sq(row, col);
      attacked.add(to);
      if (board[to]) break;
    }
  };

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || piece.player !== player) continue;
    const { row, col } = rc(from);

    if (piece.type === 'P') {
      const dir = player === '0' ? -1 : 1;
      for (const dc of [-1, 1]) {
        const tr = row + dir;
        const tc = col + dc;
        if (onBoard(tr, tc)) attacked.add(sq(tr, tc));
      }
      continue;
    }

    if (piece.type === 'N') {
      for (const [dr, dc] of [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ]) {
        const tr = row + dr;
        const tc = col + dc;
        if (onBoard(tr, tc)) attacked.add(sq(tr, tc));
      }
      continue;
    }

    if (piece.type === 'K') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const tr = row + dr;
          const tc = col + dc;
          if (onBoard(tr, tc)) attacked.add(sq(tr, tc));
        }
      }
      continue;
    }

    const rays: [number, number][] =
      piece.type === 'B'
        ? [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]
        : piece.type === 'R'
          ? [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ]
          : [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
    for (const [dr, dc] of rays) addRay(from, dr, dc);
  }
  return attacked;
}

export function inCheck(G: ChessState, player: string): boolean {
  const p = player as '0' | '1';
  const king = findKing(G.board, p);
  /* v8 ignore start -- setup always places both kings */
  if (king < 0) return false;
  /* v8 ignore stop */
  return attackedBy(G.board, opponent(p)).has(king);
}

function pushQuietOrCapture(
  board: (Piece | null)[],
  player: '0' | '1',
  from: number,
  to: number,
  out: ChessMove[],
): boolean {
  const target = board[to];
  if (target && target.player === player) return false;
  out.push({ from, to });
  return target === null;
}

function pseudoLegalFrom(G: ChessState, from: number, player: '0' | '1'): ChessMove[] {
  const piece = G.board[from];
  if (!piece || piece.player !== player) return [];
  const out: ChessMove[] = [];
  const { row, col } = rc(from);
  const board = G.board;

  if (piece.type === 'P') {
    const dir = player === '0' ? -1 : 1;
    const startRow = player === '0' ? 6 : 1;
    const one = row + dir;
    if (onBoard(one, col) && board[sq(one, col)] === null) {
      out.push({ from, to: sq(one, col) });
      const two = row + dir * 2;
      if (row === startRow && onBoard(two, col) && board[sq(two, col)] === null) {
        out.push({ from, to: sq(two, col) });
      }
    }
    for (const dc of [-1, 1]) {
      const tr = row + dir;
      const tc = col + dc;
      if (!onBoard(tr, tc)) continue;
      const to = sq(tr, tc);
      const target = board[to];
      if (target && target.player !== player) out.push({ from, to });
      else if (G.enPassant === to) out.push({ from, to });
    }
    return out;
  }

  if (piece.type === 'N') {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      const tr = row + dr;
      const tc = col + dc;
      if (!onBoard(tr, tc)) continue;
      pushQuietOrCapture(board, player, from, sq(tr, tc), out);
    }
    return out;
  }

  if (piece.type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const tr = row + dr;
        const tc = col + dc;
        if (!onBoard(tr, tc)) continue;
        pushQuietOrCapture(board, player, from, sq(tr, tc), out);
      }
    }
    // Castling (pseudo; check filtering applied later, including through-check).
    if (player === '0' && from === sq(7, 4)) {
      if (
        G.castling.whiteKing &&
        board[sq(7, 5)] === null &&
        board[sq(7, 6)] === null &&
        board[sq(7, 7)]?.type === 'R' &&
        board[sq(7, 7)]?.player === '0'
      ) {
        out.push({ from, to: sq(7, 6) });
      }
      if (
        G.castling.whiteQueen &&
        board[sq(7, 1)] === null &&
        board[sq(7, 2)] === null &&
        board[sq(7, 3)] === null &&
        board[sq(7, 0)]?.type === 'R' &&
        board[sq(7, 0)]?.player === '0'
      ) {
        out.push({ from, to: sq(7, 2) });
      }
    }
    if (player === '1' && from === sq(0, 4)) {
      if (
        G.castling.blackKing &&
        board[sq(0, 5)] === null &&
        board[sq(0, 6)] === null &&
        board[sq(0, 7)]?.type === 'R' &&
        board[sq(0, 7)]?.player === '1'
      ) {
        out.push({ from, to: sq(0, 6) });
      }
      if (
        G.castling.blackQueen &&
        board[sq(0, 1)] === null &&
        board[sq(0, 2)] === null &&
        board[sq(0, 3)] === null &&
        board[sq(0, 0)]?.type === 'R' &&
        board[sq(0, 0)]?.player === '1'
      ) {
        out.push({ from, to: sq(0, 2) });
      }
    }
    return out;
  }

  const rays: [number, number][] =
    piece.type === 'B'
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : piece.type === 'R'
        ? [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]
        : [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];

  for (const [dr, dc] of rays) {
    let r = row;
    let c = col;
    for (;;) {
      r += dr;
      c += dc;
      if (!onBoard(r, c)) break;
      const to = sq(r, c);
      if (!pushQuietOrCapture(board, player, from, to, out)) break;
    }
  }
  return out;
}

function isCastlingMove(from: number, to: number, piece: Piece): boolean {
  return piece.type === 'K' && Math.abs(rc(from).col - rc(to).col) === 2;
}

function castlingPathClearOfCheck(G: ChessState, player: '0' | '1', to: number): boolean {
  const opp = opponent(player);
  const attacks = attackedBy(G.board, opp);
  const from = player === '0' ? sq(7, 4) : sq(0, 4);
  if (attacks.has(from)) return false;
  const midCol = (rc(from).col + rc(to).col) / 2;
  const mid = sq(rc(from).row, midCol);
  if (attacks.has(mid) || attacks.has(to)) return false;
  return true;
}

/** Apply a move onto a cloned-or-mutable G; does not end turn. */
function applyMove(G: ChessState, move: ChessMove): void {
  const piece = G.board[move.from];
  /* v8 ignore start -- callers only apply matched legal moves */
  if (!piece) return;
  /* v8 ignore stop */

  const { row: fromRow, col: fromCol } = rc(move.from);
  const { row: toRow, col: toCol } = rc(move.to);
  let captured = G.board[move.to];
  let epCapture = false;

  if (piece.type === 'P' && G.enPassant === move.to && captured === null) {
    const capRow = piece.player === '0' ? toRow + 1 : toRow - 1;
    const capSq = sq(capRow, toCol);
    captured = G.board[capSq];
    G.board[capSq] = null;
    epCapture = true;
  }

  const wasPawn = piece.type === 'P';
  const wasKing = piece.type === 'K';

  G.board[move.to] = piece;
  G.board[move.from] = null;

  if (isCastlingMove(move.from, move.to, piece)) {
    const row = fromRow;
    if (toCol === 6) {
      G.board[sq(row, 5)] = G.board[sq(row, 7)];
      G.board[sq(row, 7)] = null;
    } else {
      G.board[sq(row, 3)] = G.board[sq(row, 0)];
      G.board[sq(row, 0)] = null;
    }
  }

  // Promotion always to Queen.
  if (wasPawn && (toRow === 0 || toRow === 7)) {
    piece.type = 'Q';
  }

  // Castling rights.
  if (wasKing) {
    if (piece.player === '0') {
      G.castling.whiteKing = false;
      G.castling.whiteQueen = false;
    } else {
      G.castling.blackKing = false;
      G.castling.blackQueen = false;
    }
  }
  if (move.from === sq(7, 0) || move.to === sq(7, 0)) G.castling.whiteQueen = false;
  if (move.from === sq(7, 7) || move.to === sq(7, 7)) G.castling.whiteKing = false;
  if (move.from === sq(0, 0) || move.to === sq(0, 0)) G.castling.blackQueen = false;
  if (move.from === sq(0, 7) || move.to === sq(0, 7)) G.castling.blackKing = false;

  // En passant target for next turn.
  if (wasPawn && Math.abs(toRow - fromRow) === 2) {
    G.enPassant = sq((fromRow + toRow) / 2, fromCol);
  } else {
    G.enPassant = null;
  }

  if (wasPawn || captured !== null || epCapture) G.halfmove = 0;
  else G.halfmove += 1;

  if (piece.player === '1') G.fullmove += 1;
}

function isLegalMove(G: ChessState, move: ChessMove, player: '0' | '1'): boolean {
  const piece = G.board[move.from];
  /* v8 ignore start -- pseudo-legal moves always have a piece on from */
  if (!piece) return false;
  /* v8 ignore stop */

  if (isCastlingMove(move.from, move.to, piece) && !castlingPathClearOfCheck(G, player, move.to)) {
    return false;
  }

  const next = cloneState(G);
  applyMove(next, move);
  return !inCheck(next, player);
}

/** Legal moves for `player` (does not leave own king in check). */
export function legalMoves(G: ChessState, player: string): ChessMove[] {
  const p = player as '0' | '1';
  const moves: ChessMove[] = [];
  for (let from = 0; from < 64; from++) {
    for (const m of pseudoLegalFrom(G, from, p)) {
      if (isLegalMove(G, m, p)) moves.push(m);
    }
  }
  return moves;
}

export const Chess: Game<ChessState> = {
  name: 'chess',
  setup: () => ({
    board: setupBoard(),
    castling: defaultCastling(),
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
  }),
  moves: {
    move: ({ G, ctx, events }, from: number, to: number) => {
      const legal = legalMoves(G, ctx.currentPlayer);
      const match = legal.find((m) => m.from === from && m.to === to);
      if (!match) return INVALID_MOVE;
      applyMove(G, match);
      events.endTurn();
    },
  },
  turn: { minMoves: 1, maxMoves: 1 },
  endIf: ({ G, ctx }) => {
    const moves = legalMoves(G, ctx.currentPlayer);
    if (moves.length > 0) return;
    if (inCheck(G, ctx.currentPlayer)) {
      return { winner: ctx.currentPlayer === '0' ? '1' : '0' };
    }
    return { draw: true };
  },
  ai: {
    enumerate: (G, ctx) =>
      legalMoves(G, ctx.currentPlayer).map((m) => ({
        move: 'move',
        args: [m.from, m.to],
      })),
  },
};
