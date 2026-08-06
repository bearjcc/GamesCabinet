/**
 * FreeCell (solo solitaire).
 *
 * Layout: 52 cards dealt into 8 cascades (7/7/7/7/6/6/6/6), 4 empty freecells,
 * 4 empty foundations. All cascade cards are face-up.
 *
 * Moves:
 * - cascadeToCascade(fromCol, toCol, count)
 * - cascadeToFreecell(fromCol, freecellIndex)
 * - freecellToCascade(freecellIndex, toCol)
 * - cascadeToFoundation(fromCol)
 * - freecellToFoundation(freecellIndex)
 *
 * Cascade build: descending alternating colours. Empty cascade accepts any card.
 * Freecell: one card each.
 * Foundation: Ace-up same suit (helpers imported from Klondike).
 *
 * Supermove (multi-card cascadeToCascade):
 *   max = (emptyFreecells + 1) * 2^emptyCascades
 * where emptyCascades excludes the destination column when it is empty.
 * The moved cards must also form a legal alternating descending run, and the
 * bottom card of the run must build on the destination top (or empty).
 */
import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { findFoundationIndex, isRed, rankValue } from '../klondike/game';
import { type Card, createStandardDeck, toRuleCards } from '../shared/cards';

export type FreeCellState = {
  cascades: Card[][];
  freecells: (Card | null)[];
  foundations: Card[][];
};

const CASCADE_COUNT = 8;
const FREECELL_COUNT = 4;
/** Deal sizes per cascade column (left to right). */
const DEAL_SIZES = [7, 7, 7, 7, 6, 6, 6, 6] as const;

export function foundationCount(G: FreeCellState): number {
  return G.foundations.reduce((n, pile) => n + pile.length, 0);
}

export function canPlaceOnCascade(card: Card, targetTop: Card | undefined): boolean {
  if (!targetTop) return true;
  return (
    rankValue(card.rank) === rankValue(targetTop.rank) - 1 &&
    isRed(card.suit) !== isRed(targetTop.suit)
  );
}

/** True when `cards` is a contiguous alternating descending run (first is the bottom). */
export function isLegalCascadeRun(cards: readonly Card[]): boolean {
  if (cards.length === 0) return false;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const next = cards[i];
    if (rankValue(next.rank) !== rankValue(prev.rank) - 1) return false;
    if (isRed(next.suit) === isRed(prev.suit)) return false;
  }
  return true;
}

/**
 * Max cards movable as one cascade-to-cascade unit (classic FreeCell formula).
 * Destination column is not counted among empty cascades when empty.
 */
export function maxSupermove(G: FreeCellState, toCol: number): number {
  const emptyFreecells = G.freecells.filter((c) => c === null).length;
  let emptyCascades = 0;
  for (let i = 0; i < CASCADE_COUNT; i++) {
    if (i === toCol) continue;
    if (G.cascades[i].length === 0) emptyCascades++;
  }
  return (emptyFreecells + 1) * 2 ** emptyCascades;
}

export function dealFreeCell(deck: Card[]): FreeCellState {
  const cards = [...deck];
  const cascades: Card[][] = Array.from({ length: CASCADE_COUNT }, () => []);
  for (let col = 0; col < CASCADE_COUNT; col++) {
    const n = DEAL_SIZES[col];
    for (let i = 0; i < n; i++) {
      const card = cards.shift();
      if (!card) throw new Error('dealFreeCell: deck exhausted');
      cascades[col].push(card);
    }
  }
  if (cards.length !== 0) throw new Error('dealFreeCell: leftover cards');
  return {
    cascades,
    freecells: [null, null, null, null],
    foundations: [[], [], [], []],
  };
}

export function emptyFreeCell(): FreeCellState {
  return {
    cascades: Array.from({ length: CASCADE_COUNT }, () => []),
    freecells: [null, null, null, null],
    foundations: [[], [], [], []],
  };
}

function cascadeOk(col: number): boolean {
  return Number.isInteger(col) && col >= 0 && col < CASCADE_COUNT;
}

function freecellOk(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < FREECELL_COUNT;
}

export const FreeCell: Game<FreeCellState> = {
  name: 'freecell',
  setup: ({ random }) => {
    const deck = toRuleCards(createStandardDeck());
    return dealFreeCell(random.Shuffle(deck));
  },
  turn: { minMoves: 1, maxMoves: 1 },
  moves: {
    cascadeToFreecell: ({ G }, fromCol: number, freecellIndex: number) => {
      if (!cascadeOk(fromCol) || !freecellOk(freecellIndex)) return INVALID_MOVE;
      const from = G.cascades[fromCol];
      if (from.length === 0) return INVALID_MOVE;
      if (G.freecells[freecellIndex] !== null) return INVALID_MOVE;
      G.freecells[freecellIndex] = from.pop()!;
    },

    freecellToCascade: ({ G }, freecellIndex: number, toCol: number) => {
      if (!freecellOk(freecellIndex) || !cascadeOk(toCol)) return INVALID_MOVE;
      const card = G.freecells[freecellIndex];
      if (!card) return INVALID_MOVE;
      const to = G.cascades[toCol];
      const top = to[to.length - 1];
      if (!canPlaceOnCascade(card, top)) return INVALID_MOVE;
      G.freecells[freecellIndex] = null;
      to.push(card);
    },

    cascadeToFoundation: ({ G }, fromCol: number) => {
      if (!cascadeOk(fromCol)) return INVALID_MOVE;
      const from = G.cascades[fromCol];
      const card = from[from.length - 1];
      if (!card) return INVALID_MOVE;
      const fi = findFoundationIndex(G.foundations, card);
      if (fi < 0) return INVALID_MOVE;
      from.pop();
      G.foundations[fi].push(card);
    },

    freecellToFoundation: ({ G }, freecellIndex: number) => {
      if (!freecellOk(freecellIndex)) return INVALID_MOVE;
      const card = G.freecells[freecellIndex];
      if (!card) return INVALID_MOVE;
      const fi = findFoundationIndex(G.foundations, card);
      if (fi < 0) return INVALID_MOVE;
      G.freecells[freecellIndex] = null;
      G.foundations[fi].push(card);
    },

    cascadeToCascade: ({ G }, fromCol: number, toCol: number, count: number) => {
      if (!cascadeOk(fromCol) || !cascadeOk(toCol) || fromCol === toCol) return INVALID_MOVE;
      if (!Number.isInteger(count) || count < 1) return INVALID_MOVE;
      const from = G.cascades[fromCol];
      const to = G.cascades[toCol];
      if (count > from.length) return INVALID_MOVE;
      if (count > maxSupermove(G, toCol)) return INVALID_MOVE;
      const start = from.length - count;
      const run = from.slice(start);
      if (!isLegalCascadeRun(run)) return INVALID_MOVE;
      const destTop = to[to.length - 1];
      if (!canPlaceOnCascade(run[0], destTop)) return INVALID_MOVE;
      from.splice(start, count);
      to.push(...run);
    },
  },
  endIf: ({ G }) => {
    const score = foundationCount(G);
    if (score === 52) return { won: true, score };
  },
};
