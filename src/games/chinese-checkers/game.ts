import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

/**
 * Chinese Checkers — 2-player vertical slice.
 *
 * Board: classic 121-hole star on a hex grid (axial q,r with s = -q-r).
 * A hole is on the board when at most one of |q|,|r|,|s| exceeds the central
 * hexagon radius 4, and none exceeds 8 (hexagon + six size-4 tips = 121).
 *
 * Setup: each player has 10 pegs in opposite tips (player 0 south r>=5,
 * player 1 north r<=-5). Goal is the opposite tip.
 *
 * Moves (honest classic hop rules on this graph):
 * - Step: move one peg into an adjacent empty hole (ends the turn).
 * - Hop: jump over one adjacent peg (any colour) into the empty hole
 *   immediately beyond along the same hex direction. After a hop, the same
 *   peg may continue hopping (chain hops in one turn). Because a reverse hop
 *   onto the vacated hole is usually still legal, the turn does not auto-end
 *   after a hop — the player must call `endHop` (or keep hopping). Steps
 *   cannot be mixed into a hop chain.
 *
 * Win: occupy all 10 holes of the destination tip with your own pegs.
 *
 * Engine note: player count is fixed at 2 for this slice; the star graph and
 * tip homes are ready to extend to 3–6 players later (additional tip pairs).
 */

export type Peg = '0' | '1';

export type ChineseCheckersState = {
  /** Occupant per hole index, or null if empty. Length HOLE_COUNT (121). */
  board: (Peg | null)[];
  /** When set, the current player must hop again from this hole or call endHop. */
  mustContinueFrom: number | null;
};

export type Axial = { q: number; r: number };

export type CCMove = { kind: 'step' | 'hop'; from: number; to: number } | { kind: 'endHop' };

const HEX_RADIUS = 4;
const TIP_EXTENT = 4;
const MAX_COORD = HEX_RADIUS + TIP_EXTENT;

/** Six axial neighbour directions (pointy-top hex). */
export const HEX_DIRS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function s(q: number, r: number): number {
  return -q - r;
}

/** Classic Chinese Checkers star membership. */
export function inStar(q: number, r: number): boolean {
  const aq = Math.abs(q);
  const ar = Math.abs(r);
  const as_ = Math.abs(s(q, r));
  if (aq > MAX_COORD || ar > MAX_COORD || as_ > MAX_COORD) return false;
  let over = 0;
  if (aq > HEX_RADIUS) over++;
  if (ar > HEX_RADIUS) over++;
  if (as_ > HEX_RADIUS) over++;
  return over <= 1;
}

function buildNodes(): Axial[] {
  const nodes: Axial[] = [];
  for (let q = -MAX_COORD; q <= MAX_COORD; q++) {
    for (let r = -MAX_COORD; r <= MAX_COORD; r++) {
      if (inStar(q, r)) nodes.push({ q, r });
    }
  }
  // Stable order: north-to-south (r), then west-to-east (q).
  nodes.sort((a, b) => a.r - b.r || a.q - b.q);
  return nodes;
}

/** All 121 star holes in stable index order. */
export const NODES: readonly Axial[] = buildNodes();
export const HOLE_COUNT = NODES.length;

const coordKey = (q: number, r: number) => `${q},${r}`;
const indexByCoord = new Map<string, number>();
for (let i = 0; i < NODES.length; i++) {
  indexByCoord.set(coordKey(NODES[i].q, NODES[i].r), i);
}

export function holeIndex(q: number, r: number): number | undefined {
  return indexByCoord.get(coordKey(q, r));
}

export function holeAt(i: number): Axial {
  return NODES[i];
}

/** Adjacency list: each hole -> up to 6 neighbour indices. */
export const ADJACENT: readonly (readonly number[])[] = NODES.map(({ q, r }) => {
  const nbs: number[] = [];
  for (const d of HEX_DIRS) {
    const j = holeIndex(q + d.q, r + d.r);
    if (j !== undefined) nbs.push(j);
  }
  return nbs;
});

function tipCells(pred: (a: Axial) => boolean): number[] {
  const cells: number[] = [];
  for (let i = 0; i < NODES.length; i++) {
    if (pred(NODES[i])) cells.push(i);
  }
  return cells;
}

/** Player 0 starts here (south tip, r >= 5). */
export const HOME_0: readonly number[] = tipCells((a) => a.r >= HEX_RADIUS + 1);
/** Player 1 starts here (north tip, r <= -5). */
export const HOME_1: readonly number[] = tipCells((a) => a.r <= -(HEX_RADIUS + 1));
/** Player 0 destination = player 1 home. */
export const GOAL_0: readonly number[] = HOME_1;
/** Player 1 destination = player 0 home. */
export const GOAL_1: readonly number[] = HOME_0;

const HOME: Record<Peg, readonly number[]> = { '0': HOME_0, '1': HOME_1 };
const GOAL: Record<Peg, readonly number[]> = { '0': GOAL_0, '1': GOAL_1 };

function setupBoard(): (Peg | null)[] {
  const board: (Peg | null)[] = Array(HOLE_COUNT).fill(null);
  for (const i of HOME_0) board[i] = '0';
  for (const i of HOME_1) board[i] = '1';
  return board;
}

function occupiedGoal(board: (Peg | null)[], player: Peg): boolean {
  return GOAL[player].every((i) => board[i] === player);
}

/** Landing index two steps from `from` through neighbour `over`, or undefined. */
function hopLanding(from: number, over: number): number | undefined {
  const a = NODES[from];
  const b = NODES[over];
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  return holeIndex(b.q + dq, b.r + dr);
}

function hopsFrom(board: (Peg | null)[], from: number): CCMove[] {
  const hops: CCMove[] = [];
  for (const over of ADJACENT[from]) {
    if (board[over] === null) continue;
    const to = hopLanding(from, over);
    if (to === undefined || board[to] !== null) continue;
    hops.push({ kind: 'hop', from, to });
  }
  return hops;
}

function stepsFrom(board: (Peg | null)[], from: number): CCMove[] {
  const steps: CCMove[] = [];
  for (const to of ADJACENT[from]) {
    if (board[to] === null) steps.push({ kind: 'step', from, to });
  }
  return steps;
}

/** Legal moves for the current player (steps, hops, and optional endHop). */
export function legalMoves(G: ChineseCheckersState, player: string): CCMove[] {
  const p = player as Peg;
  if (G.mustContinueFrom !== null) {
    const hops = hopsFrom(G.board, G.mustContinueFrom);
    // May stop after any hop even when further hops exist.
    return [...hops, { kind: 'endHop' }];
  }

  const moves: CCMove[] = [];
  for (let i = 0; i < HOLE_COUNT; i++) {
    if (G.board[i] !== p) continue;
    moves.push(...stepsFrom(G.board, i));
    moves.push(...hopsFrom(G.board, i));
  }
  return moves;
}

function applyRelocate(G: ChineseCheckersState, from: number, to: number): void {
  G.board[to] = G.board[from];
  G.board[from] = null;
}

export const ChineseCheckers: Game<ChineseCheckersState> = {
  name: 'chinese-checkers',
  setup: () => ({
    board: setupBoard(),
    mustContinueFrom: null,
  }),
  moves: {
    movePeg: ({ G, ctx, events }, from: number, to: number) => {
      const legal = legalMoves(G, ctx.currentPlayer);
      const match = legal.find(
        (m) => (m.kind === 'step' || m.kind === 'hop') && m.from === from && m.to === to,
      );
      if (!match) return INVALID_MOVE;
      /* v8 ignore start -- matched legal relocate always belongs to current player */
      if (G.board[from] !== ctx.currentPlayer) return INVALID_MOVE;
      /* v8 ignore stop */
      applyRelocate(G, from, to);
      if (match.kind === 'hop') {
        // Reverse hop onto the vacated hole is typically still legal, so hops
        // always open a chain; the player ends via endHop.
        G.mustContinueFrom = to;
        return;
      }
      G.mustContinueFrom = null;
      events.endTurn();
    },
    endHop: ({ G, events }) => {
      if (G.mustContinueFrom === null) return INVALID_MOVE;
      G.mustContinueFrom = null;
      events.endTurn();
    },
  },
  turn: { minMoves: 1, maxMoves: 32 },
  endIf: ({ G }) => {
    if (occupiedGoal(G.board, '0')) return { winner: '0' };
    if (occupiedGoal(G.board, '1')) return { winner: '1' };
  },
  ai: {
    enumerate: (G, ctx) => {
      const out: { move: string; args?: unknown[] }[] = [];
      for (const m of legalMoves(G, ctx.currentPlayer)) {
        if (m.kind === 'endHop') {
          out.push({ move: 'endHop' });
        } else {
          out.push({ move: 'movePeg', args: [m.from, m.to] });
        }
      }
      return out;
    },
  },
};

export { GOAL, HOME };
