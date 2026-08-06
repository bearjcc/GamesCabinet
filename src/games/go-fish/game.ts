import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { type Card, createStandardDeck, type Rank, toRuleCards } from '../shared/cards';

export const HAND_SIZE = 7;

export type GoFishState = {
  hands: Card[][];
  stock: Card[];
  /** Books (sets of four) completed by each player. */
  books: [number, number];
  /**
   * Rank just asked when the opponent had none.
   * Player must draw (`draw`) before asking again.
   */
  pendingFishRank: Rank | null;
};

export function opponentOf(player: number): number {
  return player === 0 ? 1 : 0;
}

/** Unique ranks in hand, first-appearance order. */
export function askableRanks(hand: readonly Card[]): Rank[] {
  const seen = new Set<Rank>();
  const ranks: Rank[] = [];
  for (const card of hand) {
    if (seen.has(card.rank)) continue;
    seen.add(card.rank);
    ranks.push(card.rank);
  }
  return ranks;
}

export function canAsk(G: GoFishState, player: number, rank: Rank): boolean {
  if (G.pendingFishRank != null) return false;
  const hand = G.hands[player];
  if (!hand || hand.length === 0) return false;
  return hand.some((c) => c.rank === rank);
}

/**
 * Draw when resolving a failed ask (go fish), or when the hand is empty
 * and stock remains so the player can keep playing.
 */
export function canDraw(G: GoFishState, player: number): boolean {
  if (G.stock.length === 0) return false;
  const hand = G.hands[player];
  if (!hand) return false;
  if (G.pendingFishRank != null) return true;
  return hand.length === 0;
}

/** Remove any four-of-a-kind books from a hand; return books scored. */
export function collectBooks(hand: Card[]): { hand: Card[]; books: number } {
  const byRank = new Map<Rank, Card[]>();
  for (const card of hand) {
    const list = byRank.get(card.rank) ?? [];
    list.push(card);
    byRank.set(card.rank, list);
  }
  let books = 0;
  const kept: Card[] = [];
  for (const [, cards] of byRank) {
    if (cards.length >= 4) {
      books += 1;
    } else {
      kept.push(...cards);
    }
  }
  return { hand: kept, books };
}

function applyBooks(G: GoFishState, player: number): void {
  const result = collectBooks(G.hands[player]);
  G.hands[player] = result.hand;
  G.books[player] += result.books;
}

function isTerminal(G: GoFishState): boolean {
  return G.stock.length === 0 && G.hands.every((h) => h.length === 0);
}

function endResult(G: GoFishState): { winner: string } | { draw: true } {
  if (G.books[0] === G.books[1]) return { draw: true };
  return { winner: G.books[0] > G.books[1] ? '0' : '1' };
}

export const GoFish: Game<GoFishState> = {
  name: 'go-fish',
  setup: ({ random }) => {
    const deck = random.Shuffle(toRuleCards(createStandardDeck()));
    const hands: Card[][] = [[], []];
    for (let i = 0; i < HAND_SIZE; i++) {
      hands[0].push(deck.pop() as Card);
      hands[1].push(deck.pop() as Card);
    }
    const G: GoFishState = {
      hands,
      stock: deck,
      books: [0, 0],
      pendingFishRank: null,
    };
    applyBooks(G, 0);
    applyBooks(G, 1);
    return G;
  },
  turn: {
    onBegin: ({ G, ctx, events }) => {
      const pid = Number(ctx.currentPlayer);
      // Empty hand + empty stock: nothing to do - pass the turn (endIf covers mutual empty).
      if (G.hands[pid].length === 0 && G.stock.length === 0 && G.pendingFishRank == null) {
        events.endTurn();
      }
    },
  },
  moves: {
    ask: ({ G, ctx, events }, rank: Rank) => {
      const pid = Number(ctx.currentPlayer);
      if (!canAsk(G, pid, rank)) return INVALID_MOVE;

      const opp = opponentOf(pid);
      const taken = G.hands[opp].filter((c) => c.rank === rank);
      if (taken.length > 0) {
        G.hands[opp] = G.hands[opp].filter((c) => c.rank !== rank);
        G.hands[pid] = [...G.hands[pid], ...taken];
        applyBooks(G, pid);
        // Successful ask: turn continues (may ask again).
        return;
      }

      // Go fish - draw required when stock remains; else turn ends.
      if (G.stock.length === 0) {
        G.pendingFishRank = null;
        events.endTurn();
        return;
      }
      G.pendingFishRank = rank;
    },

    draw: ({ G, ctx, events }) => {
      const pid = Number(ctx.currentPlayer);
      if (!canDraw(G, pid)) return INVALID_MOVE;

      const asked = G.pendingFishRank;
      const card = G.stock.pop() as Card;
      G.hands[pid] = [...G.hands[pid], card];
      applyBooks(G, pid);
      G.pendingFishRank = null;

      // Empty-hand refill: keep the turn so the player can ask.
      if (asked == null) return;

      // Classic preference: fish ends the turn unless the drawn card matches the ask.
      if (card.rank === asked) return;
      events.endTurn();
    },
  },
  endIf: ({ G }) => {
    if (!isTerminal(G)) return;
    return endResult(G);
  },
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args?: unknown[] }[] = [];
      const pid = Number(ctx.currentPlayer);
      // Fishing or empty-hand refill: draw is the only legal action.
      if (canDraw(G, pid)) {
        return [{ move: 'draw' }];
      }
      for (const rank of askableRanks(G.hands[pid] ?? [])) {
        if (canAsk(G, pid, rank)) {
          moves.push({ move: 'ask', args: [rank] });
        }
      }
      return moves;
    },
  },
};
