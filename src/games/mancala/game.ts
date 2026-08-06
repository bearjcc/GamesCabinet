/**
 * Mancala (Kalaha)
 *
 * Board indexing (14 pits, counter-clockwise):
 *   0-5   Player 0 pits
 *   6     Player 0 store (P0_STORE)
 *   7-12  Player 1 pits
 *   13    Player 1 store (P1_STORE)
 *
 * Setup: 4 stones in each pit; both stores start at 0.
 *
 * Move `sow(pit)`: take all stones from an own non-empty pit and drop one
 * stone in each following pit counter-clockwise, including own store and
 * skipping the opponent store.
 *
 * Extra turn: if the last stone lands in own store, do not end the turn.
 * Capture: if the last stone lands in an empty own pit and the opposite pit
 * has stones, move that stone plus the opposite stones into own store.
 * End: when one side's pits are all empty, the opponent sweeps remaining
 * stones from their pits into their store; higher store wins (draw if equal).
 */

import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const PIT_COUNT = 14;
export const P0_STORE = 6;
export const P1_STORE = 13;
const START_STONES = 4;

export type MancalaState = {
  pits: number[];
};

export function ownStore(player: string): number {
  return player === '0' ? P0_STORE : P1_STORE;
}

export function opponentStore(player: string): number {
  return player === '0' ? P1_STORE : P0_STORE;
}

export function ownPits(player: string): number[] {
  return player === '0' ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}

/** Opposite pit across the board (pits only; not stores). */
export function oppositePit(pit: number): number {
  return 12 - pit;
}

function isOwnPit(player: string, pit: number): boolean {
  return ownPits(player).includes(pit);
}

function sideEmpty(pits: number[], player: string): boolean {
  return ownPits(player).every((i) => pits[i] === 0);
}

function sweepRemaining(pits: number[]): void {
  for (const player of ['0', '1'] as const) {
    const store = ownStore(player);
    for (const pit of ownPits(player)) {
      pits[store] += pits[pit];
      pits[pit] = 0;
    }
  }
}

function nextPit(from: number, skipStore: number): number {
  let i = from;
  do {
    i = (i + 1) % PIT_COUNT;
  } while (i === skipStore);
  return i;
}

export function createInitialPits(): number[] {
  const pits = Array(PIT_COUNT).fill(START_STONES);
  pits[P0_STORE] = 0;
  pits[P1_STORE] = 0;
  return pits;
}

export const Mancala: Game<MancalaState> = {
  name: 'mancala',
  setup: () => ({ pits: createInitialPits() }),
  turn: {
    minMoves: 1,
    maxMoves: 64,
  },
  moves: {
    sow: ({ G, ctx, events }, pit: number) => {
      const player = ctx.currentPlayer;
      if (!Number.isInteger(pit) || !isOwnPit(player, pit)) return INVALID_MOVE;
      if (G.pits[pit] <= 0) return INVALID_MOVE;

      let stones = G.pits[pit];
      G.pits[pit] = 0;
      const skip = opponentStore(player);
      let last = pit;
      while (stones > 0) {
        last = nextPit(last, skip);
        G.pits[last] += 1;
        stones -= 1;
      }

      const store = ownStore(player);
      const landedInStore = last === store;

      if (!landedInStore && isOwnPit(player, last) && G.pits[last] === 1) {
        const opp = oppositePit(last);
        if (G.pits[opp] > 0) {
          G.pits[store] += G.pits[last] + G.pits[opp];
          G.pits[last] = 0;
          G.pits[opp] = 0;
        }
      }

      if (sideEmpty(G.pits, '0') || sideEmpty(G.pits, '1')) {
        sweepRemaining(G.pits);
        return;
      }

      if (!landedInStore) {
        events.endTurn();
      }
    },
  },
  endIf: ({ G }) => {
    if (!sideEmpty(G.pits, '0') || !sideEmpty(G.pits, '1')) return;
    const s0 = G.pits[P0_STORE];
    const s1 = G.pits[P1_STORE];
    if (s0 > s1) return { winner: '0' };
    if (s1 > s0) return { winner: '1' };
    return { draw: true };
  },
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args: number[] }[] = [];
      for (const pit of ownPits(ctx.currentPlayer)) {
        if (G.pits[pit] > 0) moves.push({ move: 'sow', args: [pit] });
      }
      return moves;
    },
  },
};
