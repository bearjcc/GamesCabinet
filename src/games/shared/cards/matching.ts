import type { Card, Rank, Suit } from './types';

export type MatchContext = {
  top: Card;
  /** Active suit when a wild was played; otherwise usually top.suit. */
  currentSuit: Suit;
};

export function matchesRankOrSuit(card: Card, ctx: MatchContext): boolean {
  return card.rank === ctx.top.rank || card.suit === ctx.currentSuit;
}

export function isWildRank(card: Card, wildRanks: readonly Rank[]): boolean {
  return wildRanks.includes(card.rank);
}

/** Legal if wild, or matches rank/suit against the current context. */
export function canPlayMatching(
  card: Card,
  ctx: MatchContext,
  options?: { wildRanks?: readonly Rank[] },
): boolean {
  if (options?.wildRanks && isWildRank(card, options.wildRanks)) return true;
  return matchesRankOrSuit(card, ctx);
}

export function handHasPlay(
  hand: Card[],
  ctx: MatchContext,
  options?: { wildRanks?: readonly Rank[] },
): boolean {
  return hand.some((c) => canPlayMatching(c, ctx, options));
}
