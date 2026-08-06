import { describe, expect, it } from 'vitest';
import { cardId, createStandardDeck, findCard, makeCard, parseCardId, toRuleCards } from './deck';

describe('cardId / makeCard / parseCardId', () => {
  it('builds and parses stable identities', () => {
    expect(cardId('hearts', '8')).toBe('hearts-8');
    expect(makeCard('spades', 'A')).toEqual({ id: 'spades-A', suit: 'spades', rank: 'A' });
    expect(parseCardId('diamonds-10')).toEqual({
      id: 'diamonds-10',
      suit: 'diamonds',
      rank: '10',
    });
  });

  it('rejects malformed ids', () => {
    expect(parseCardId('')).toBeNull();
    expect(parseCardId('hearts')).toBeNull();
    expect(parseCardId('foo-8')).toBeNull();
    expect(parseCardId('hearts-99')).toBeNull();
  });
});

describe('createStandardDeck', () => {
  it('builds 52 unique cards', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.filter((c) => c.suit === 'clubs')).toHaveLength(13);
  });

  it('merges asset and tag overrides by id', () => {
    const deck = createStandardDeck({
      overrides: [
        { suit: 'hearts', rank: '8', asset: '/custom/h8.svg', tags: ['wild'] },
        { id: 'hearts-8', meta: { label: 'Wild Eight' } },
        { suit: 'clubs', rank: '8', asset: '/custom/c8.svg' },
      ],
    });
    const h8 = deck.find((c) => c.id === 'hearts-8')!;
    expect(h8.asset).toBe('/custom/h8.svg');
    expect(h8.tags).toEqual(['wild']);
    expect(h8.meta).toEqual({ label: 'Wild Eight' });
    expect(deck.find((c) => c.id === 'clubs-8')?.asset).toBe('/custom/c8.svg');
  });

  it('ignores overrides without an id or suit+rank', () => {
    const deck = createStandardDeck({
      overrides: [{ asset: '/nope.svg', tags: ['x'] }],
    });
    expect(deck.every((c) => c.asset === undefined)).toBe(true);
  });
});

describe('toRuleCards / findCard', () => {
  it('strips presentation fields and finds by id', () => {
    const defs = createStandardDeck({
      overrides: [{ id: 'spades-Q', asset: '/q.svg', tags: ['face'] }],
    });
    const rules = toRuleCards(defs);
    expect(rules.find((c) => c.id === 'spades-Q')).toEqual({
      id: 'spades-Q',
      suit: 'spades',
      rank: 'Q',
    });
    expect(findCard(rules, 'spades-Q')?.rank).toBe('Q');
    expect(findCard(rules, 'missing')).toBeUndefined();
  });
});
