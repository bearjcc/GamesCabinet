import {
  type Card,
  type CardDef,
  type CardOverride,
  RANKS,
  type Rank,
  SUITS,
  type Suit,
} from './types';

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}

export function makeCard(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

export function parseCardId(id: string): Card | null {
  const dash = id.lastIndexOf('-');
  if (dash <= 0) return null;
  const suit = id.slice(0, dash) as Suit;
  const rank = id.slice(dash + 1) as Rank;
  if (!SUITS.includes(suit) || !RANKS.includes(rank)) return null;
  return makeCard(suit, rank);
}

/** Build a standard 52-card deck. Overrides merge by card id (composition). */
export function createStandardDeck(options?: { overrides?: CardOverride[] }): CardDef[] {
  const byId = new Map<string, CardOverride>();
  for (const o of options?.overrides ?? []) {
    const id = o.id ?? (o.suit && o.rank ? cardId(o.suit, o.rank) : null);
    if (!id) continue;
    const prev = byId.get(id) ?? {};
    byId.set(id, {
      ...prev,
      ...o,
      id,
      tags: o.tags ?? prev.tags,
      meta: o.meta ? { ...prev.meta, ...o.meta } : prev.meta,
    });
  }

  const deck: CardDef[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = cardId(suit, rank);
      const o = byId.get(id);
      deck.push({
        id,
        suit,
        rank,
        ...(o?.asset !== undefined ? { asset: o.asset } : {}),
        ...(o?.tags !== undefined ? { tags: o.tags } : {}),
        ...(o?.meta !== undefined ? { meta: o.meta } : {}),
      });
    }
  }
  return deck;
}

/** Strip presentation fields for rules state (assets live in the UI resolver). */
export function toRuleCards(defs: CardDef[]): Card[] {
  return defs.map(({ id, suit, rank }) => ({ id, suit, rank }));
}

export function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((c) => c.id === id);
}
