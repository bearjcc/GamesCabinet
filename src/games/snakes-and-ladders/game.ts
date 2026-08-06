/**
 * Snakes and Ladders (Chutes and Ladders style)
 *
 * Board: classic 10x10 = 100 squares. Pawns start at 0 (off the board) and
 * race to square 100.
 *
 * Turn: roll 1d6 (`roll` move via boardgame.io Random.D6), advance the pawn,
 * then apply the fixed snakes/ladders table if the landing square is mapped.
 * No optional / random slides -- destinations are deterministic.
 *
 * Exact landing: must reach 100 exactly to win. Overshoot bounces back by the
 * excess (e.g. on 98, roll 5 -> 103 -> bounce to 97), then snakes/ladders apply
 * to the bounced square.
 *
 * Display coords (ASCII-friendly, bottom row L->R = 1..10, then boustrophedon
 * upward). Teleporter table uses square numbers 1..100.
 */

import type { Game } from 'boardgame.io';

export const BOARD_SIZE = 10;
export const FINAL_SQUARE = BOARD_SIZE * BOARD_SIZE;

/**
 * Fixed snakes (down) and ladders (up). Key = landing square, value = destination.
 * Classic Milton Bradley-inspired set (ASCII square numbers).
 */
export const SNAKES_AND_LADDERS: Readonly<Record<number, number>> = {
  // Ladders
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
  // Snakes
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

export type SnakesAndLaddersState = {
  /** Pawn square per seat; 0 = not yet on the board. */
  positions: [number, number];
  /** Most recent die face (1-6), or null before the first roll. */
  lastRoll: number | null;
};

export function createInitialState(): SnakesAndLaddersState {
  return {
    positions: [0, 0],
    lastRoll: null,
  };
}

/** Advance with bounce-back when overshooting FINAL_SQUARE. */
export function advancePosition(from: number, roll: number): number {
  const tentative = from + roll;
  if (tentative <= FINAL_SQUARE) return tentative;
  return FINAL_SQUARE - (tentative - FINAL_SQUARE);
}

/** Apply fixed snake/ladder if present; otherwise stay. */
export function resolveSquare(square: number): number {
  return SNAKES_AND_LADDERS[square] ?? square;
}

/** Full post-roll square: bounce, then teleporter. */
export function applyDie(from: number, die: number): number {
  return resolveSquare(advancePosition(from, die));
}

/**
 * Visual square number for a grid cell. `row` 0 is the top of the screen;
 * bottom row is 1..10 left-to-right; rows alternate direction (boustrophedon).
 */
export function squareAt(row: number, col: number): number {
  const fromBottom = BOARD_SIZE - 1 - row;
  if (fromBottom % 2 === 0) {
    return fromBottom * BOARD_SIZE + col + 1;
  }
  return fromBottom * BOARD_SIZE + (BOARD_SIZE - 1 - col) + 1;
}

export const SnakesAndLadders: Game<SnakesAndLaddersState> = {
  name: 'snakes-and-ladders',
  setup: () => createInitialState(),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    roll: ({ G, ctx, random }) => {
      const die = random.D6();
      const seat = ctx.currentPlayer === '0' ? 0 : 1;
      G.lastRoll = die;
      G.positions[seat] = applyDie(G.positions[seat], die);
    },
  },
  endIf: ({ G }) => {
    if (G.positions[0] >= FINAL_SQUARE) return { winner: '0' };
    if (G.positions[1] >= FINAL_SQUARE) return { winner: '1' };
  },
  ai: {
    enumerate: () => [{ move: 'roll' }],
  },
};
