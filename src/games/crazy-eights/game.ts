import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  type Card,
  canPlayMatching,
  createStandardDeck,
  drawOne,
  handHasPlay,
  type MatchingTable,
  playFromHand,
  SUITS,
  type Suit,
  setupMatchingTable,
  topOf,
  toRuleCards,
} from '../shared/cards';

export const WILD_RANK = '8' as const;

export type CrazyEightsState = MatchingTable;

export function handSizeFor(numPlayers: number): number {
  return numPlayers <= 2 ? 7 : 5;
}

export function matchContext(G: CrazyEightsState) {
  const top = topOf(G.discard);
  if (!top) return null;
  return { top, currentSuit: G.currentSuit };
}

export function canPlayCard(G: CrazyEightsState, card: Card, declaredSuit?: Suit): boolean {
  const ctx = matchContext(G);
  if (!ctx) return false;
  if (!canPlayMatching(card, ctx, { wildRanks: [WILD_RANK] })) return false;
  if (card.rank === WILD_RANK) {
    return declaredSuit != null && (SUITS as readonly string[]).includes(declaredSuit);
  }
  return declaredSuit === undefined;
}

/** Draw is illegal when the hand already holds a playable card (must play if able). */
export function canDraw(G: CrazyEightsState, player: number): boolean {
  const ctx = matchContext(G);
  if (!ctx) return false;
  const hand = G.hands[player];
  if (!hand) return false;
  if (handHasPlay(hand, ctx, { wildRanks: [WILD_RANK] })) return false;
  return G.stock.length > 0 || G.discard.length > 1;
}

export const CrazyEights: Game<CrazyEightsState> = {
  name: 'crazy-eights',
  setup: ({ ctx, random }) => {
    const defs = createStandardDeck();
    return setupMatchingTable({
      deck: toRuleCards(defs),
      numPlayers: ctx.numPlayers,
      handSize: handSizeFor(ctx.numPlayers),
      shuffle: (cards) => random.Shuffle(cards),
      avoidStarterRanks: [WILD_RANK],
    });
  },
  turn: {
    minMoves: 1,
    maxMoves: 3,
    onBegin: ({ G }) => {
      G.drewThisTurn = false;
    },
  },
  moves: {
    playCard: ({ G, ctx, events }, handIndex: number, declaredSuit?: Suit) => {
      const pid = Number(ctx.currentPlayer);
      const card = G.hands[pid]?.[handIndex];
      if (!card) return INVALID_MOVE;
      if (!canPlayCard(G, card, declaredSuit)) return INVALID_MOVE;
      playFromHand(G, pid, handIndex);
      G.currentSuit = card.rank === WILD_RANK ? (declaredSuit as Suit) : card.suit;
      G.drewThisTurn = false;
      events.endTurn();
    },
    drawCard: ({ G, ctx, random }) => {
      const pid = Number(ctx.currentPlayer);
      if (!canDraw(G, pid)) return INVALID_MOVE;
      drawOne(G, pid, (cards) => random.Shuffle(cards));
      G.drewThisTurn = true;
    },
    pass: ({ G, events }) => {
      if (!G.drewThisTurn) return INVALID_MOVE;
      G.drewThisTurn = false;
      events.endTurn();
    },
  },
  endIf: ({ G, ctx }) => {
    for (let i = 0; i < ctx.numPlayers; i++) {
      if (G.hands[i].length === 0) return { winner: String(i) };
    }
  },
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args?: unknown[] }[] = [];
      const pid = Number(ctx.currentPlayer);
      const hand = G.hands[pid];
      const match = matchContext(G);
      if (!match) return moves;

      hand.forEach((card, hi) => {
        if (card.rank === WILD_RANK) {
          for (const suit of SUITS) {
            moves.push({ move: 'playCard', args: [hi, suit] });
          }
        } else if (canPlayCard(G, card)) {
          moves.push({ move: 'playCard', args: [hi] });
        }
      });

      if (canDraw(G, pid)) {
        moves.push({ move: 'drawCard' });
      }
      if (G.drewThisTurn) {
        moves.push({ move: 'pass' });
      }
      return moves;
    },
  },
};
