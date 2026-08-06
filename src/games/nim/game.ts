/**
 * Nim (standard takeaway)
 *
 * One heap of stones. Each turn a player removes 1..MAX_TAKE stones.
 * The player who takes the last stone wins.
 */

import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const DEFAULT_HEAP = 13;
export const MAX_TAKE = 3;

export type NimState = {
  heap: number;
};

export function createInitialState(heap = DEFAULT_HEAP): NimState {
  return { heap };
}

export function legalTakes(heap: number): number[] {
  const takes: number[] = [];
  for (let n = 1; n <= MAX_TAKE; n++) {
    if (n <= heap) takes.push(n);
  }
  return takes;
}

export const Nim: Game<NimState> = {
  name: 'nim',
  setup: () => createInitialState(),
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    take: ({ G }, n: number) => {
      if (!Number.isInteger(n) || n < 1 || n > MAX_TAKE || n > G.heap) {
        return INVALID_MOVE;
      }
      G.heap -= n;
    },
  },
  endIf: ({ G, ctx }) => {
    if (G.heap > 0) return;
    // endIf runs before the turn advances; currentPlayer is the last taker.
    return { winner: ctx.currentPlayer };
  },
  ai: {
    enumerate: (G) => legalTakes(G.heap).map((n) => ({ move: 'take', args: [n] })),
  },
};
