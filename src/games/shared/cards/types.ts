/** Standard French-suited playing card identity (JSON-serialisable). */

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

/** Optional presentation / game tags layered onto a card identity. */
export type CardOverride = {
  id?: string;
  suit?: Suit;
  rank?: Rank;
  /** Asset URL or key resolved by the presentation layer. */
  asset?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type CardDef = Card & {
  asset?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type CardZones = {
  stock: Card[];
  discard: Card[];
  hands: Card[][];
};
