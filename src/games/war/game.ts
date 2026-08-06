/**
 * War (card game) for 2 players.
 *
 * Deal: shuffled standard 52-card deck, 26 face-down each (top = decks[p][0]).
 *
 * Fight: both play their top card face-up. Higher rank wins the pot to the
 * bottom of their deck. Suits do not matter. Ace is high (A > K > ... > 2).
 *
 * War (tie): each player contributes face-down cards then one face-up.
 * - If both have at least 4 cards left: 3 face-down + 1 face-up.
 * - Else if both have at least 2: 1 face-down + 1 face-up.
 * - Else the player who cannot complete the war loses immediately.
 * Nested ties repeat the same war rule on the new face-up cards.
 *
 * Win: opponent has 0 cards after a fight resolves.
 * Cap: after MAX_ROUNDS fights with no empty deck, the match is a draw
 * (keeps bots/tests from looping forever).
 */

import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { type Card, createStandardDeck, type Rank, toRuleCards } from '../shared/cards';

/** Safety valve so bot / seeded games cannot run unbounded. */
export const MAX_ROUNDS = 2000;

const RANK_HIGH: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export type WarState = {
  /** Face-down piles; index 0 is the next card to play. */
  decks: [Card[], Card[]];
  /** Face-up cards from the latest fight (null before the first play). */
  faceUp: [Card | null, Card | null];
  /** Face-down war cards each seat contributed in the latest fight. */
  warDownCounts: [number, number];
  /** Completed fight count (each `play` increments by 1). */
  rounds: number;
  lastWinner: '0' | '1' | null;
  lastWasWar: boolean;
};

export function warRankValue(rank: Rank): number {
  return RANK_HIGH[rank];
}

export function compareWarRanks(a: Rank, b: Rank): number {
  return warRankValue(a) - warRankValue(b);
}

/** Face-down count for a war step, or null if neither preferred size fits both. */
export function warFaceDownCount(len0: number, len1: number): number | null {
  if (len0 >= 4 && len1 >= 4) return 3;
  if (len0 >= 2 && len1 >= 2) return 1;
  return null;
}

export function canPlay(G: WarState): boolean {
  return G.decks[0].length > 0 && G.decks[1].length > 0 && G.rounds < MAX_ROUNDS;
}

export function createEmptyWarState(partial: Partial<WarState> = {}): WarState {
  return {
    decks: [[], []],
    faceUp: [null, null],
    warDownCounts: [0, 0],
    rounds: 0,
    lastWinner: null,
    lastWasWar: false,
    ...partial,
  };
}

function takeTop(deck: Card[]): Card | undefined {
  return deck.shift();
}

function takeMany(deck: Card[], n: number): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    const c = takeTop(deck);
    /* v8 ignore start -- callers pass n within deck length */
    if (!c) break;
    /* v8 ignore stop */
    out.push(c);
  }
  return out;
}

function awardPot(G: WarState, winner: 0 | 1, pot: Card[]): void {
  G.decks[winner].push(...pot);
  G.lastWinner = winner === 0 ? '0' : '1';
}

/**
 * Resolve one fight into G. Returns an early gameover result when a player
 * cannot finish a war; otherwise undefined and decks / faceUp are updated.
 */
export function resolveFight(G: WarState): { winner: string } | { draw: true } | undefined {
  const pot: Card[] = [];
  let warDown0 = 0;
  let warDown1 = 0;
  let wasWar = false;

  const first0 = takeTop(G.decks[0]);
  const first1 = takeTop(G.decks[1]);
  if (!first0 || !first1) {
    // Should be gated by canPlay; treat as incomplete.
    if (!first0 && !first1) return { draw: true };
    return { winner: first0 ? '0' : '1' };
  }
  pot.push(first0, first1);
  G.faceUp = [first0, first1];

  let up0 = first0;
  let up1 = first1;

  while (compareWarRanks(up0.rank, up1.rank) === 0) {
    wasWar = true;
    const down = warFaceDownCount(G.decks[0].length, G.decks[1].length);
    if (down == null) {
      const need = 2; // 1 face-down + 1 face-up
      const ok0 = G.decks[0].length >= need;
      const ok1 = G.decks[1].length >= need;
      G.warDownCounts = [warDown0, warDown1];
      G.lastWasWar = true;
      if (!ok0 && !ok1) return { draw: true };
      if (!ok0) return { winner: '1' };
      return { winner: '0' };
    }

    const burned0 = takeMany(G.decks[0], down);
    const burned1 = takeMany(G.decks[1], down);
    warDown0 += burned0.length;
    warDown1 += burned1.length;
    pot.push(...burned0, ...burned1);

    const next0 = takeTop(G.decks[0]);
    const next1 = takeTop(G.decks[1]);
    /* v8 ignore start -- warFaceDownCount reserves a face-up card for each seat */
    if (!next0 || !next1) {
      G.warDownCounts = [warDown0, warDown1];
      G.lastWasWar = true;
      if (next0) G.faceUp = [next0, G.faceUp[1]];
      if (next1) G.faceUp = [G.faceUp[0], next1];
      if (!next0 && !next1) return { draw: true };
      return { winner: next0 ? '0' : '1' };
    }
    /* v8 ignore stop */
    pot.push(next0, next1);
    G.faceUp = [next0, next1];
    up0 = next0;
    up1 = next1;
  }

  G.warDownCounts = [warDown0, warDown1];
  G.lastWasWar = wasWar;
  const cmp = compareWarRanks(up0.rank, up1.rank);
  awardPot(G, cmp > 0 ? 0 : 1, pot);
  return undefined;
}

export const War: Game<WarState> = {
  name: 'war',
  setup: ({ random }) => {
    const deck = random.Shuffle(toRuleCards(createStandardDeck()));
    const decks: [Card[], Card[]] = [[], []];
    while (deck.length > 0) {
      decks[0].push(deck.pop() as Card);
      decks[1].push(deck.pop() as Card);
    }
    return createEmptyWarState({ decks });
  },
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    play: ({ G, events }) => {
      /* v8 ignore start -- empty decks / round cap already end the match via endIf */
      if (!canPlay(G)) return INVALID_MOVE;
      /* v8 ignore stop */
      G.rounds += 1;
      const early = resolveFight(G);
      if (early) {
        events.endGame(early);
      }
    },
  },
  endIf: ({ G }) => {
    if (G.decks[0].length === 0 && G.decks[1].length === 0) return { draw: true };
    if (G.decks[0].length === 0) return { winner: '1' };
    if (G.decks[1].length === 0) return { winner: '0' };
    if (G.rounds >= MAX_ROUNDS) return { draw: true };
  },
  ai: {
    enumerate: (G) => (canPlay(G) ? [{ move: 'play' }] : []),
  },
};
