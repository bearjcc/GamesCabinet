import { describe, expect, it } from 'vitest';
import {
  discardHandAndPlayArea,
  drawOneToHand,
  gainResource,
  moveCardId,
  refillEmptySlots,
  resetResource,
  trySpendResource,
} from './index';

describe('shared deckbuilder', () => {
  it('draws reshuffling discard when deck is empty', () => {
    const deck: string[] = [];
    const hand: string[] = [];
    const discard = ['a', 'b'];
    const drawn = drawOneToHand(deck, hand, discard, (arr) => {
      arr.reverse();
    });
    expect(drawn).toBeDefined();
    expect(hand).toHaveLength(1);
    expect(discard).toHaveLength(0);
    expect(deck.length + hand.length).toBe(2);
  });

  it('moves and discards pile ids', () => {
    const hand = ['c1', 'c2'];
    const play: string[] = [];
    const discard: string[] = [];
    expect(moveCardId(hand, play, 'c1')).toBe(true);
    expect(moveCardId(hand, play, 'missing')).toBe(false);
    discardHandAndPlayArea(hand, play, discard);
    expect(hand).toEqual([]);
    expect(play).toEqual([]);
    expect(discard).toEqual(['c2', 'c1']);
  });

  it('gains and spends turn resources', () => {
    expect(gainResource(2, 3)).toBe(5);
    expect(gainResource(2, 0)).toBe(2);
    expect(trySpendResource(5, 4)).toBe(1);
    expect(trySpendResource(3, 4)).toBeNull();
    expect(trySpendResource(3, -1)).toBeNull();
    expect(resetResource()).toBe(0);
  });

  it('refills empty market slots', () => {
    const slots = ['x', '', ''];
    let n = 0;
    refillEmptySlots(
      slots,
      () => {
        n += 1;
        return `new${n}`;
      },
      (id) => id,
    );
    expect(slots).toEqual(['x', 'new1', 'new2']);

    const stalled = ['', ''];
    refillEmptySlots(
      stalled,
      () => '',
      () => undefined,
    );
    expect(stalled).toEqual(['', '']);

    const partial = ['keep', ''];
    refillEmptySlots(
      partial,
      () => 'drawn',
      (id) => (id === 'keep' ? undefined : id),
    );
    expect(partial[1]).toBe('drawn');

    const noMeta = [''];
    refillEmptySlots(
      noMeta,
      () => 'orphan',
      () => undefined,
    );
    expect(noMeta[0]).toBe('orphan');
  });
});
