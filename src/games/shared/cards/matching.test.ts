import { describe, expect, it } from 'vitest';
import { makeCard } from './deck';
import { canPlayMatching, handHasPlay, isWildRank, matchesRankOrSuit } from './matching';

const ctx = {
  top: makeCard('hearts', '5'),
  currentSuit: 'hearts' as const,
};

describe('matching', () => {
  it('matches rank or current suit', () => {
    expect(matchesRankOrSuit(makeCard('clubs', '5'), ctx)).toBe(true);
    expect(matchesRankOrSuit(makeCard('hearts', 'K'), ctx)).toBe(true);
    expect(matchesRankOrSuit(makeCard('spades', '2'), ctx)).toBe(false);
  });

  it('treats configured ranks as wild', () => {
    expect(isWildRank(makeCard('clubs', '8'), ['8'])).toBe(true);
    expect(isWildRank(makeCard('clubs', '7'), ['8'])).toBe(false);
    expect(canPlayMatching(makeCard('spades', '8'), ctx, { wildRanks: ['8'] })).toBe(true);
    expect(canPlayMatching(makeCard('spades', '2'), ctx, { wildRanks: ['8'] })).toBe(false);
  });

  it('detects whether a hand has any legal play', () => {
    expect(handHasPlay([makeCard('spades', '2'), makeCard('hearts', '9')], ctx)).toBe(true);
    expect(handHasPlay([makeCard('spades', '2')], ctx, { wildRanks: ['8'] })).toBe(false);
    expect(handHasPlay([makeCard('spades', '8')], ctx, { wildRanks: ['8'] })).toBe(true);
  });
});
