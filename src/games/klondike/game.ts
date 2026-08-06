import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { type Card, createStandardDeck, type Rank, type Suit, toRuleCards } from '../shared/cards';

export type TableCard = Card & { faceUp: boolean };

export type KlondikeState = {
  stock: TableCard[];
  waste: TableCard[];
  foundations: TableCard[][];
  tableau: TableCard[][];
};

const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
};

export function rankValue(rank: Rank): number {
  return RANK_VALUE[rank];
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function foundationCount(G: KlondikeState): number {
  return G.foundations.reduce((n, pile) => n + pile.length, 0);
}

export function canPlaceOnTableau(card: Card, targetTop: Card | undefined): boolean {
  if (!targetTop) return card.rank === 'K';
  return (
    rankValue(card.rank) === rankValue(targetTop.rank) - 1 &&
    isRed(card.suit) !== isRed(targetTop.suit)
  );
}

export function canPlaceOnFoundation(card: Card, foundation: readonly Card[]): boolean {
  const top = foundation[foundation.length - 1];
  if (!top) return card.rank === 'A';
  return card.suit === top.suit && rankValue(card.rank) === rankValue(top.rank) + 1;
}

export function findFoundationIndex(foundations: readonly (readonly Card[])[], card: Card): number {
  for (let i = 0; i < foundations.length; i++) {
    if (canPlaceOnFoundation(card, foundations[i])) return i;
  }
  return -1;
}

/** True when `cards` is a contiguous face-up alternating descending run (first is the bottom). */
export function isLegalRun(cards: readonly TableCard[]): boolean {
  if (cards.length === 0) return false;
  if (cards.some((c) => !c.faceUp)) return false;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const next = cards[i];
    if (rankValue(next.rank) !== rankValue(prev.rank) - 1) return false;
    if (isRed(next.suit) === isRed(prev.suit)) return false;
  }
  return true;
}

function flipExposed(column: TableCard[]): void {
  if (column.length === 0) return;
  const top = column[column.length - 1];
  if (!top.faceUp) top.faceUp = true;
}

export function dealKlondike(deck: Card[]): KlondikeState {
  const cards: TableCard[] = deck.map((c) => ({ ...c, faceUp: false }));
  const tableau: TableCard[][] = Array.from({ length: 7 }, () => []);
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const card = cards.shift();
      if (!card) throw new Error('dealKlondike: deck exhausted');
      tableau[col].push(card);
    }
    tableau[col][tableau[col].length - 1]!.faceUp = true;
  }
  return {
    stock: cards,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}

export function emptyKlondike(): KlondikeState {
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: Array.from({ length: 7 }, () => []),
  };
}

function colOk(col: number): boolean {
  return Number.isInteger(col) && col >= 0 && col <= 6;
}

export const Klondike: Game<KlondikeState> = {
  name: 'klondike',
  setup: ({ random }) => {
    const deck = toRuleCards(createStandardDeck());
    return dealKlondike(random.Shuffle(deck));
  },
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    draw: ({ G }) => {
      if (G.stock.length > 0) {
        const card = G.stock.shift()!;
        card.faceUp = true;
        G.waste.push(card);
        return;
      }
      if (G.waste.length === 0) return INVALID_MOVE;
      // Recycle: oldest waste becomes next draw (physical flip of the pile).
      G.stock = G.waste.map((c) => ({ ...c, faceUp: false }));
      G.waste = [];
    },

    wasteToFoundation: ({ G }) => {
      const card = G.waste[G.waste.length - 1];
      if (!card) return INVALID_MOVE;
      const fi = findFoundationIndex(G.foundations, card);
      if (fi < 0) return INVALID_MOVE;
      G.waste.pop();
      G.foundations[fi].push(card);
    },

    wasteToTableau: ({ G }, col: number) => {
      if (!colOk(col)) return INVALID_MOVE;
      const card = G.waste[G.waste.length - 1];
      if (!card) return INVALID_MOVE;
      const target = G.tableau[col];
      const top = target[target.length - 1];
      if (!canPlaceOnTableau(card, top)) return INVALID_MOVE;
      G.waste.pop();
      target.push(card);
    },

    tableauToFoundation: ({ G }, col: number) => {
      if (!colOk(col)) return INVALID_MOVE;
      const column = G.tableau[col];
      const card = column[column.length - 1];
      if (!card?.faceUp) return INVALID_MOVE;
      const fi = findFoundationIndex(G.foundations, card);
      if (fi < 0) return INVALID_MOVE;
      column.pop();
      G.foundations[fi].push(card);
      flipExposed(column);
    },

    tableauToTableau: ({ G }, fromCol: number, toCol: number, count: number) => {
      if (!colOk(fromCol) || !colOk(toCol) || fromCol === toCol) return INVALID_MOVE;
      if (!Number.isInteger(count) || count < 1) return INVALID_MOVE;
      const from = G.tableau[fromCol];
      const to = G.tableau[toCol];
      if (count > from.length) return INVALID_MOVE;
      const start = from.length - count;
      const run = from.slice(start);
      if (!isLegalRun(run)) return INVALID_MOVE;
      const destTop = to[to.length - 1];
      if (!canPlaceOnTableau(run[0], destTop)) return INVALID_MOVE;
      from.splice(start, count);
      to.push(...run);
      flipExposed(from);
    },
  },
  endIf: ({ G }) => {
    const score = foundationCount(G);
    if (score === 52) return { won: true, score };
  },
};
