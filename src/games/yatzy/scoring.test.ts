import { describe, expect, it } from 'vitest';
import {
  emptyScorecard,
  grandTotal,
  type Scorecard,
  scorecardComplete,
  scoreFns,
  upperBonus,
} from './scoring';

describe('Yatzy scoring', () => {
  it('sums matching faces in the upper section', () => {
    expect(scoreFns.ones([1, 1, 2, 3, 4])).toBe(2);
    expect(scoreFns.sixes([6, 6, 6, 1, 2])).toBe(18);
  });

  it('takes the highest pair for onePair', () => {
    expect(scoreFns.onePair([6, 6, 5, 5, 1])).toBe(12);
    expect(scoreFns.onePair([1, 2, 3, 4, 5])).toBe(0);
  });

  it('scores twoPairs only for two distinct pairs', () => {
    expect(scoreFns.twoPairs([6, 6, 5, 5, 1])).toBe(22);
    expect(scoreFns.twoPairs([6, 6, 6, 5, 5])).toBe(0);
  });

  it('scores straights, full house, and yatzy', () => {
    expect(scoreFns.smallStraight([1, 2, 3, 4, 5])).toBe(15);
    expect(scoreFns.largeStraight([2, 3, 4, 5, 6])).toBe(20);
    expect(scoreFns.fullHouse([3, 3, 3, 2, 2])).toBe(13);
    expect(scoreFns.yatzy([4, 4, 4, 4, 4])).toBe(50);
    expect(scoreFns.yatzy([4, 4, 4, 4, 5])).toBe(0);
  });

  it('awards upper bonus at 63', () => {
    const card = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      onePair: null,
      twoPairs: null,
      threeOfAKind: null,
      fourOfAKind: null,
      smallStraight: null,
      largeStraight: null,
      fullHouse: null,
      chance: null,
      yatzy: null,
    } satisfies Scorecard;
    expect(upperBonus(card)).toBe(50);
    expect(grandTotal(card)).toBe(63 + 50);
  });

  it('scores three and four of a kind and omits bonus below 63', () => {
    expect(scoreFns.threeOfAKind([3, 3, 3, 1, 2])).toBe(9);
    expect(scoreFns.threeOfAKind([1, 2, 3, 4, 5])).toBe(0);
    expect(scoreFns.fourOfAKind([4, 4, 4, 4, 1])).toBe(16);
    expect(scoreFns.fourOfAKind([1, 2, 3, 4, 5])).toBe(0);
    const low = emptyScorecard();
    low.ones = 2;
    expect(upperBonus(low)).toBe(0);
  });

  it('reports incomplete scorecards', () => {
    expect(scorecardComplete(emptyScorecard())).toBe(false);
  });
});
