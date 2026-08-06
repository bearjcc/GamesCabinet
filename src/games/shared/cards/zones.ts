import type { Card, CardZones } from './types';

export type ShuffleFn<T> = (items: T[]) => T[];

/** Deal `handSize` cards to each player from the front of `deck`. Remainder is stock. */
export function dealEvenly(
  deck: Card[],
  numPlayers: number,
  handSize: number,
): { hands: Card[][]; stock: Card[] } {
  const cards = deck.slice();
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < handSize; i++) {
    for (let p = 0; p < numPlayers; p++) {
      const card = cards.shift();
      if (!card) throw new Error('dealEvenly: deck exhausted');
      hands[p].push(card);
    }
  }
  return { hands, stock: cards };
}

export function topOf(pile: Card[]): Card | undefined {
  return pile[pile.length - 1];
}

export function emptyZones(numPlayers: number): CardZones {
  return {
    stock: [],
    discard: [],
    hands: Array.from({ length: numPlayers }, () => []),
  };
}

/**
 * Move the top of discard aside, shuffle the rest into stock, then restore the top.
 * No-op (returns false) when discard has fewer than 2 cards.
 */
export function reshuffleDiscardIntoStock(zones: CardZones, shuffle: ShuffleFn<Card>): boolean {
  if (zones.discard.length < 2) return false;
  const top = zones.discard.pop()!;
  const rest = zones.discard.splice(0, zones.discard.length);
  zones.stock = shuffle(rest);
  zones.discard.push(top);
  return true;
}

/**
 * Draw one card from stock into a hand.
 * If stock is empty, reshuffles discard (keeping top) when possible.
 * Returns the drawn card, or null if nothing could be drawn.
 */
export function drawOne(
  zones: CardZones,
  playerIndex: number,
  shuffle: ShuffleFn<Card>,
): Card | null {
  if (zones.stock.length === 0) {
    reshuffleDiscardIntoStock(zones, shuffle);
  }
  const card = zones.stock.shift();
  if (!card) return null;
  zones.hands[playerIndex].push(card);
  return card;
}

/** Play a card from hand onto the discard pile. Returns false if index is invalid. */
export function playFromHand(zones: CardZones, playerIndex: number, handIndex: number): boolean {
  const hand = zones.hands[playerIndex];
  if (!hand || handIndex < 0 || handIndex >= hand.length) return false;
  const [card] = hand.splice(handIndex, 1);
  zones.discard.push(card);
  return true;
}

/** Flip the first stock card onto an empty discard (setup). */
export function flipStarter(zones: CardZones): Card | null {
  const card = zones.stock.shift();
  if (!card) return null;
  zones.discard.push(card);
  return card;
}
