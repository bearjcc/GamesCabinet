/** Yatzy scoring (MIT-adapted from PJohannessen/yatzy). */

export type ScoringCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'onePair'
  | 'twoPairs'
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'smallStraight'
  | 'largeStraight'
  | 'fullHouse'
  | 'chance'
  | 'yatzy';

export type ScoringSection = 'Upper' | 'Lower';

export type Scorecard = Record<ScoringCategory, number | null>;

export type CategoryMeta = {
  category: ScoringCategory;
  name: string;
  section: ScoringSection;
};

export const CATEGORIES: CategoryMeta[] = [
  { category: 'ones', name: 'Ones', section: 'Upper' },
  { category: 'twos', name: 'Twos', section: 'Upper' },
  { category: 'threes', name: 'Threes', section: 'Upper' },
  { category: 'fours', name: 'Fours', section: 'Upper' },
  { category: 'fives', name: 'Fives', section: 'Upper' },
  { category: 'sixes', name: 'Sixes', section: 'Upper' },
  { category: 'onePair', name: 'One pair', section: 'Lower' },
  { category: 'twoPairs', name: 'Two pairs', section: 'Lower' },
  { category: 'threeOfAKind', name: 'Three of a kind', section: 'Lower' },
  { category: 'fourOfAKind', name: 'Four of a kind', section: 'Lower' },
  { category: 'smallStraight', name: 'Small straight', section: 'Lower' },
  { category: 'largeStraight', name: 'Large straight', section: 'Lower' },
  { category: 'fullHouse', name: 'Full house', section: 'Lower' },
  { category: 'chance', name: 'Chance', section: 'Lower' },
  { category: 'yatzy', name: 'Yatzy', section: 'Lower' },
];

export function emptyScorecard(): Scorecard {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    onePair: null,
    twoPairs: null,
    threeOfAKind: null,
    fourOfAKind: null,
    smallStraight: null,
    largeStraight: null,
    fullHouse: null,
    chance: null,
    yatzy: null,
  };
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

/** Groups of identical faces, sorted by count desc then face desc. */
function groups(dice: number[]): { face: number; count: number }[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const out: { face: number; count: number }[] = [];
  for (let face = 1; face <= 6; face++) {
    if (counts[face] > 0) out.push({ face, count: counts[face] });
  }
  out.sort((a, b) => b.count - a.count || b.face - a.face);
  return out;
}

function upper(face: number, dice: number[]): number {
  return sum(dice.filter((d) => d === face));
}

export const scoreFns: Record<ScoringCategory, (dice: number[]) => number> = {
  ones: (d) => upper(1, d),
  twos: (d) => upper(2, d),
  threes: (d) => upper(3, d),
  fours: (d) => upper(4, d),
  fives: (d) => upper(5, d),
  sixes: (d) => upper(6, d),
  onePair: (dice) => {
    const g = groups(dice).filter((x) => x.count >= 2);
    if (g.length === 0) return 0;
    return g[0].face * 2;
  },
  twoPairs: (dice) => {
    const pairs = groups(dice).filter((x) => x.count >= 2);
    if (pairs.length < 2) return 0;
    // Exact two pairs + singleton (not full house / three-of-a-kind as "pair")
    const exact = groups(dice);
    const pairFaces = exact.filter((x) => x.count === 2);
    const singleton = exact.filter((x) => x.count === 1);
    if (pairFaces.length === 2 && singleton.length === 1) {
      return pairFaces[0].face * 2 + pairFaces[1].face * 2;
    }
    return 0;
  },
  threeOfAKind: (dice) => {
    const g = groups(dice).find((x) => x.count >= 3);
    return g ? g.face * 3 : 0;
  },
  fourOfAKind: (dice) => {
    const g = groups(dice).find((x) => x.count >= 4);
    return g ? g.face * 4 : 0;
  },
  smallStraight: (dice) => {
    const sorted = [...dice].sort((a, b) => a - b);
    return sorted.join(',') === '1,2,3,4,5' ? 15 : 0;
  },
  largeStraight: (dice) => {
    const sorted = [...dice].sort((a, b) => a - b);
    return sorted.join(',') === '2,3,4,5,6' ? 20 : 0;
  },
  fullHouse: (dice) => {
    const g = groups(dice);
    if (g.length === 2 && g[0].count === 3 && g[1].count === 2) return sum(dice);
    return 0;
  },
  chance: (dice) => sum(dice),
  yatzy: (dice) => (groups(dice)[0]?.count === 5 ? 50 : 0),
};

export function upperTotal(card: Scorecard): number {
  return CATEGORIES.filter((c) => c.section === 'Upper').reduce(
    (t, c) => t + (card[c.category] ?? 0),
    0,
  );
}

export function upperBonus(card: Scorecard): number {
  return upperTotal(card) >= 63 ? 50 : 0;
}

export function lowerTotal(card: Scorecard): number {
  return CATEGORIES.filter((c) => c.section === 'Lower').reduce(
    (t, c) => t + (card[c.category] ?? 0),
    0,
  );
}

export function grandTotal(card: Scorecard): number {
  return upperTotal(card) + upperBonus(card) + lowerTotal(card);
}

export function scorecardComplete(card: Scorecard): boolean {
  return CATEGORIES.every((c) => card[c.category] !== null);
}
