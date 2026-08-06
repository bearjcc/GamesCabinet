import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const GRID = 4;
export const PAIR_COUNT = 8;
export const CELL_COUNT = GRID * GRID;

export type MemoryCard = {
  pairId: number;
  faceUp: boolean;
};

export type MemoryState = {
  cards: MemoryCard[];
  scores: [number, number];
  firstFlip: number | null;
};

/** Face-up cards whose pair is not both up (active first flip or pending mismatch). */
function pendingFaceUps(G: MemoryState): number[] {
  const pending: number[] = [];
  for (let i = 0; i < G.cards.length; i++) {
    if (!G.cards[i].faceUp) continue;
    const pairId = G.cards[i].pairId;
    const bothUp = G.cards.filter((c) => c.pairId === pairId && c.faceUp).length === 2;
    if (!bothUp) pending.push(i);
  }
  return pending;
}

/** Flip down a prior mismatch before applying a new flip. Sync; no timers. */
export function resolvePending(G: MemoryState): void {
  if (G.firstFlip === null) return;
  const pending = pendingFaceUps(G);
  if (pending.length !== 2) return;
  for (const i of pending) {
    G.cards[i].faceUp = false;
  }
  G.firstFlip = null;
}

function allMatched(G: MemoryState): boolean {
  return G.cards.every((c) => c.faceUp) && G.firstFlip === null && pendingFaceUps(G).length === 0;
}

export function createMemoryDeck(shuffle: <T>(arr: T[]) => T[]): MemoryCard[] {
  const deck: MemoryCard[] = [];
  for (let pairId = 0; pairId < PAIR_COUNT; pairId++) {
    deck.push({ pairId, faceUp: false }, { pairId, faceUp: false });
  }
  return shuffle(deck);
}

export const Memory: Game<MemoryState> = {
  name: 'memory',
  setup: ({ random }) => ({
    cards: createMemoryDeck(random.Shuffle),
    scores: [0, 0],
    firstFlip: null,
  }),
  turn: { minMoves: 1, maxMoves: CELL_COUNT },
  moves: {
    flip: ({ G, ctx, events }, i: number) => {
      if (!Number.isInteger(i) || i < 0 || i >= G.cards.length) return INVALID_MOVE;

      resolvePending(G);

      const card = G.cards[i];
      if (card.faceUp) return INVALID_MOVE;

      card.faceUp = true;

      if (G.firstFlip === null) {
        G.firstFlip = i;
        return;
      }

      const a = G.firstFlip;
      const b = i;
      if (G.cards[a].pairId === G.cards[b].pairId) {
        const pid = Number(ctx.currentPlayer);
        G.scores[pid] += 1;
        G.firstFlip = null;
        return;
      }

      // Mismatch: leave both face-up; next flip runs resolvePending. End turn.
      events.endTurn();
    },
  },
  endIf: ({ G }) => {
    if (!allMatched(G)) return;
    const [s0, s1] = G.scores;
    if (s0 === s1) return { draw: true };
    return { winner: s0 > s1 ? '0' : '1' };
  },
  ai: {
    enumerate: (G) => {
      const moves: { move: string; args: number[] }[] = [];
      for (let i = 0; i < G.cards.length; i++) {
        if (!G.cards[i].faceUp) moves.push({ move: 'flip', args: [i] });
      }
      return moves;
    },
  },
};
