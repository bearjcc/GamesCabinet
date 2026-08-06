import { describe, expect, it } from 'vitest';
import { createStandardDeck, makeCard, toRuleCards } from './deck';
import {
  dealEvenly,
  drawOne,
  emptyZones,
  flipStarter,
  playFromHand,
  reshuffleDiscardIntoStock,
  topOf,
} from './zones';

describe('dealEvenly', () => {
  it('deals fixed hand sizes and leaves the rest as stock', () => {
    const deck = toRuleCards(createStandardDeck());
    const { hands, stock } = dealEvenly(deck, 2, 7);
    expect(hands).toHaveLength(2);
    expect(hands[0]).toHaveLength(7);
    expect(hands[1]).toHaveLength(7);
    expect(stock).toHaveLength(52 - 14);
  });

  it('throws when the deck is too small', () => {
    expect(() => dealEvenly([makeCard('hearts', 'A')], 2, 2)).toThrow(/exhausted/);
  });
});

describe('pile helpers', () => {
  it('reports the top card', () => {
    expect(topOf([])).toBeUndefined();
    expect(topOf([makeCard('clubs', '3'), makeCard('hearts', 'K')])?.id).toBe('hearts-K');
  });

  it('creates empty zones', () => {
    const z = emptyZones(3);
    expect(z.hands).toHaveLength(3);
    expect(z.stock).toEqual([]);
    expect(z.discard).toEqual([]);
  });
});

describe('flipStarter / playFromHand / drawOne / reshuffle', () => {
  it('flips a starter from stock', () => {
    const z = emptyZones(1);
    z.stock = [makeCard('spades', '2'), makeCard('hearts', '3')];
    expect(flipStarter(z)?.id).toBe('spades-2');
    expect(z.discard.map((c) => c.id)).toEqual(['spades-2']);
    expect(z.stock.map((c) => c.id)).toEqual(['hearts-3']);
  });

  it('returns null when flipping an empty stock', () => {
    expect(flipStarter(emptyZones(1))).toBeNull();
  });

  it('plays from hand onto discard', () => {
    const z = emptyZones(1);
    z.hands[0] = [makeCard('hearts', '5'), makeCard('clubs', '9')];
    expect(playFromHand(z, 0, 1)).toBe(true);
    expect(z.hands[0].map((c) => c.id)).toEqual(['hearts-5']);
    expect(topOf(z.discard)?.id).toBe('clubs-9');
    expect(playFromHand(z, 0, 9)).toBe(false);
  });

  it('draws from stock and reshuffles discard when stock is empty', () => {
    const z = emptyZones(1);
    z.discard = [makeCard('hearts', '2'), makeCard('hearts', '3'), makeCard('hearts', '4')];
    const drawn = drawOne(z, 0, (cards) => cards.slice().reverse());
    expect(drawn?.id).toBe('hearts-3');
    expect(z.discard.map((c) => c.id)).toEqual(['hearts-4']);
    expect(z.stock.map((c) => c.id)).toEqual(['hearts-2']);
    expect(z.hands[0].map((c) => c.id)).toEqual(['hearts-3']);
  });

  it('returns null when nothing can be drawn', () => {
    const z = emptyZones(1);
    z.discard = [makeCard('hearts', 'A')];
    expect(drawOne(z, 0, (c) => c)).toBeNull();
    expect(reshuffleDiscardIntoStock(z, (c) => c)).toBe(false);
  });
});
