import { describe, expect, it } from 'vitest';
import { makeCard } from './deck';
import { setupMatchingTable } from './setup';

describe('setupMatchingTable', () => {
  it('deals, flips a starter, and sets currentSuit', () => {
    const deck = [
      makeCard('hearts', '2'),
      makeCard('clubs', '3'),
      makeCard('spades', '4'),
      makeCard('diamonds', '5'),
      makeCard('hearts', '6'),
      makeCard('clubs', '7'),
    ];
    const table = setupMatchingTable({
      deck,
      numPlayers: 2,
      handSize: 2,
      shuffle: (cards) => cards.slice(),
    });
    expect(table.hands[0]).toHaveLength(2);
    expect(table.hands[1]).toHaveLength(2);
    expect(table.discard).toHaveLength(1);
    expect(table.currentSuit).toBe(table.discard[0].suit);
    expect(table.drewThisTurn).toBe(false);
  });

  it('skips avoided starter ranks', () => {
    const deck = [makeCard('hearts', '8'), makeCard('clubs', '3'), makeCard('spades', '4')];
    const table = setupMatchingTable({
      deck,
      numPlayers: 1,
      handSize: 0,
      shuffle: (cards) => cards.slice(),
      avoidStarterRanks: ['8'],
    });
    expect(table.discard.map((c) => c.id)).toEqual(['hearts-8', 'clubs-3']);
    expect(table.currentSuit).toBe('clubs');
    expect(table.stock.map((c) => c.id)).toEqual(['spades-4']);
  });

  it('falls back when every flipped card is avoided', () => {
    const deck = [makeCard('hearts', '8'), makeCard('clubs', '8')];
    const table = setupMatchingTable({
      deck,
      numPlayers: 1,
      handSize: 0,
      shuffle: (cards) => cards.slice(),
      avoidStarterRanks: ['8'],
    });
    expect(table.discard).toHaveLength(2);
    expect(table.currentSuit).toBe('clubs');
  });

  it('defaults suit when the deck cannot supply a starter', () => {
    const table = setupMatchingTable({
      deck: [],
      numPlayers: 1,
      handSize: 0,
      shuffle: (cards) => cards,
    });
    expect(table.discard).toEqual([]);
    expect(table.currentSuit).toBe('clubs');
  });
});
