/**
 * Nine Men's Morris — 2-player vertical slice.
 *
 * Board: 24 points on three concentric squares; midpoints of opposite sides
 * are linked. Indexing outer (0–7) → middle (8–15) → inner (16–23), each
 * clockwise from top-left. See POINT_COORDS / ADJACENT / MILLS.
 *
 * Phases:
 * 1. Place — each player places 9 pieces on empty points.
 * 2. Move — slide along a line to an adjacent empty point.
 * 3. Fly — when a player has exactly 3 pieces on the board, they may move
 *    to any empty point.
 *
 * Mills: three own pieces on a board line → must remove one opponent piece
 * (not from a mill unless every opponent piece is in a mill). Removal is
 * required before the turn ends.
 *
 * Win: opponent has fewer than 3 pieces remaining in play (on board + still
 * to place), or opponent has no legal moves in the move/fly phase.
 */

import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const POINT_COUNT = 24;
export const PIECES_PER_PLAYER = 9;

export type Cell = null | '0' | '1';
export type NmmPhase = 'place' | 'move';

export type NmmState = {
  points: Cell[];
  piecesRemainingToPlace: [number, number];
  phase: NmmPhase;
  pendingRemoval: boolean;
  selected: number | null;
};

/** Percentage coordinates for geometric board rendering (viewBox 0–100, inset). */
export const POINT_COORDS: readonly { x: number; y: number }[] = [
  // Outer square (0–7), clockwise from top-left
  { x: 8, y: 8 },
  { x: 50, y: 8 },
  { x: 92, y: 8 },
  { x: 92, y: 50 },
  { x: 92, y: 92 },
  { x: 50, y: 92 },
  { x: 8, y: 92 },
  { x: 8, y: 50 },
  // Middle square (8–15)
  { x: 22, y: 22 },
  { x: 50, y: 22 },
  { x: 78, y: 22 },
  { x: 78, y: 50 },
  { x: 78, y: 78 },
  { x: 50, y: 78 },
  { x: 22, y: 78 },
  { x: 22, y: 50 },
  // Inner square (16–23)
  { x: 36, y: 36 },
  { x: 50, y: 36 },
  { x: 64, y: 36 },
  { x: 64, y: 50 },
  { x: 64, y: 64 },
  { x: 50, y: 64 },
  { x: 36, y: 64 },
  { x: 36, y: 50 },
];

/** All mills (three-in-a-row along a board line). */
export const MILLS: readonly (readonly [number, number, number])[] = [
  // Outer sides
  [0, 1, 2],
  [2, 3, 4],
  [4, 5, 6],
  [6, 7, 0],
  // Middle sides
  [8, 9, 10],
  [10, 11, 12],
  [12, 13, 14],
  [14, 15, 8],
  // Inner sides
  [16, 17, 18],
  [18, 19, 20],
  [20, 21, 22],
  [22, 23, 16],
  // Radial (midpoint spokes)
  [1, 9, 17],
  [3, 11, 19],
  [5, 13, 21],
  [7, 15, 23],
];

/** Undirected adjacency for sliding moves. */
export const ADJACENT: readonly (readonly number[])[] = (() => {
  const edges: [number, number][] = [
    // Outer
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 0],
    // Middle
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 14],
    [14, 15],
    [15, 8],
    // Inner
    [16, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [20, 21],
    [21, 22],
    [22, 23],
    [23, 16],
    // Spokes
    [1, 9],
    [9, 17],
    [3, 11],
    [11, 19],
    [5, 13],
    [13, 21],
    [7, 15],
    [15, 23],
  ];
  const adj: number[][] = Array.from({ length: POINT_COUNT }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  for (const list of adj) list.sort((x, y) => x - y);
  return adj;
})();

export function createInitialState(): NmmState {
  return {
    points: Array(POINT_COUNT).fill(null),
    piecesRemainingToPlace: [PIECES_PER_PLAYER, PIECES_PER_PLAYER],
    phase: 'place',
    pendingRemoval: false,
    selected: null,
  };
}

export function countOnBoard(points: Cell[], player: string): number {
  return points.filter((c) => c === player).length;
}

export function piecesInPlay(G: NmmState, player: string): number {
  const idx = player === '0' ? 0 : 1;
  return countOnBoard(G.points, player) + G.piecesRemainingToPlace[idx];
}

export function isInMill(points: Cell[], index: number, player: string): boolean {
  if (points[index] !== player) return false;
  return MILLS.some((mill) => mill.includes(index) && mill.every((i) => points[i] === player));
}

export function formsMillAt(points: Cell[], index: number, player: string): boolean {
  return MILLS.some((mill) => mill.includes(index) && mill.every((i) => points[i] === player));
}

export function legalPlaces(G: NmmState, player: string): number[] {
  if (G.pendingRemoval) return [];
  if (G.phase !== 'place') return [];
  const idx = player === '0' ? 0 : 1;
  if (G.piecesRemainingToPlace[idx] <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    if (G.points[i] === null) out.push(i);
  }
  return out;
}

export function canFly(G: NmmState, player: string): boolean {
  return G.phase === 'move' && countOnBoard(G.points, player) === 3;
}

export type NmmRelocate = { from: number; to: number };

export function legalMoves(G: NmmState, player: string): NmmRelocate[] {
  if (G.pendingRemoval) return [];
  if (G.phase !== 'move') return [];
  const fly = canFly(G, player);
  const moves: NmmRelocate[] = [];
  for (let from = 0; from < POINT_COUNT; from++) {
    if (G.points[from] !== player) continue;
    if (fly) {
      for (let to = 0; to < POINT_COUNT; to++) {
        if (G.points[to] === null) moves.push({ from, to });
      }
    } else {
      for (const to of ADJACENT[from]) {
        if (G.points[to] === null) moves.push({ from, to });
      }
    }
  }
  return moves;
}

export function legalRemovals(G: NmmState, player: string): number[] {
  if (!G.pendingRemoval) return [];
  const opponent = player === '0' ? '1' : '0';
  const candidates: number[] = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    if (G.points[i] === opponent) candidates.push(i);
  }
  const notInMill = candidates.filter((i) => !isInMill(G.points, i, opponent));
  return notInMill.length > 0 ? notInMill : candidates;
}

function maybeEnterMovePhase(G: NmmState): void {
  if (G.piecesRemainingToPlace[0] === 0 && G.piecesRemainingToPlace[1] === 0) {
    G.phase = 'move';
  }
}

function afterPlaceOrMove(
  G: NmmState,
  ctx: { currentPlayer: string },
  events: { endTurn: () => void },
  landedAt: number,
): void {
  G.selected = null;
  if (formsMillAt(G.points, landedAt, ctx.currentPlayer)) {
    G.pendingRemoval = true;
    return;
  }
  maybeEnterMovePhase(G);
  events.endTurn();
}

export const NineMensMorris: Game<NmmState> = {
  name: 'nine-mens-morris',
  setup: () => createInitialState(),
  turn: {
    minMoves: 1,
    maxMoves: 3,
  },
  moves: {
    place: ({ G, ctx, events }, i: number) => {
      if (!Number.isInteger(i) || i < 0 || i >= POINT_COUNT) return INVALID_MOVE;
      if (!legalPlaces(G, ctx.currentPlayer).includes(i)) return INVALID_MOVE;
      const idx = ctx.currentPlayer === '0' ? 0 : 1;
      G.points[i] = ctx.currentPlayer as '0' | '1';
      G.piecesRemainingToPlace[idx] -= 1;
      afterPlaceOrMove(G, ctx, events, i);
    },

    select: ({ G, ctx }, i: number) => {
      if (!Number.isInteger(i) || i < 0 || i >= POINT_COUNT) return INVALID_MOVE;
      if (G.pendingRemoval || G.phase !== 'move') return INVALID_MOVE;
      if (G.points[i] !== ctx.currentPlayer) return INVALID_MOVE;
      const can = legalMoves(G, ctx.currentPlayer).some((m) => m.from === i);
      if (!can) return INVALID_MOVE;
      G.selected = i;
    },

    move: ({ G, ctx, events }, a: number, b?: number) => {
      if (G.pendingRemoval || G.phase !== 'move') return INVALID_MOVE;
      let from: number;
      let to: number;
      if (b === undefined) {
        if (G.selected === null) return INVALID_MOVE;
        from = G.selected;
        to = a;
      } else {
        from = a;
        to = b;
      }
      if (!Number.isInteger(from) || !Number.isInteger(to)) return INVALID_MOVE;
      const match = legalMoves(G, ctx.currentPlayer).find((m) => m.from === from && m.to === to);
      if (!match) return INVALID_MOVE;
      G.points[to] = G.points[from];
      G.points[from] = null;
      afterPlaceOrMove(G, ctx, events, to);
    },

    remove: ({ G, ctx, events }, i: number) => {
      if (!Number.isInteger(i) || i < 0 || i >= POINT_COUNT) return INVALID_MOVE;
      if (!legalRemovals(G, ctx.currentPlayer).includes(i)) return INVALID_MOVE;
      G.points[i] = null;
      G.pendingRemoval = false;
      G.selected = null;
      maybeEnterMovePhase(G);
      events.endTurn();
    },
  },
  endIf: ({ G, ctx }) => {
    if (G.pendingRemoval) return;
    const current = ctx.currentPlayer;
    const opponent = current === '0' ? '1' : '0';
    if (piecesInPlay(G, opponent) < 3) return { winner: current };
    if (piecesInPlay(G, current) < 3) return { winner: opponent };
    if (G.phase === 'move') {
      if (legalMoves(G, current).length === 0) return { winner: opponent };
    }
  },
  ai: {
    enumerate: (G, ctx) => {
      if (G.pendingRemoval) {
        return legalRemovals(G, ctx.currentPlayer).map((i) => ({
          move: 'remove',
          args: [i],
        }));
      }
      if (G.phase === 'place') {
        return legalPlaces(G, ctx.currentPlayer).map((i) => ({
          move: 'place',
          args: [i],
        }));
      }
      return legalMoves(G, ctx.currentPlayer).map((m) => ({
        move: 'move',
        args: [m.from, m.to],
      }));
    },
  },
};
