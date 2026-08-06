import type { Card, Rank, Suit } from './types';

/** Kenney Boardgame Pack playing cards (CC0) — individual PNGs. */
export const KENNEY_CARDS_DIR = '/assets/kenney/boardgame-pack/PNG/Cards';

export const KENNEY_CARD_BACK = `${KENNEY_CARDS_DIR}/cardBack_blue2.png`;

const SUIT_FILE: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};

/** Kenney filename rank token (A, 2-10, J, Q, K). */
export function kenneyRankToken(rank: Rank): string {
  return rank;
}

export function kenneyPlayingCardPath(suit: Suit, rank: Rank): string {
  return `${KENNEY_CARDS_DIR}/card${SUIT_FILE[suit]}${kenneyRankToken(rank)}.png`;
}

/** Standard French deck faces from Kenney Boardgame Pack. */
export function kenneyPlayingCardAsset(card: Card): string {
  return kenneyPlayingCardPath(card.suit, card.rank);
}
