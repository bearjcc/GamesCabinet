import type { Card, CardZones, Rank, Suit } from './types';
import { dealEvenly, flipStarter, type ShuffleFn } from './zones';

export type MatchingTable = CardZones & {
  currentSuit: Suit;
  /** True after the current player has drawn at least once this turn. */
  drewThisTurn: boolean;
};

export type SetupMatchingOptions = {
  deck: Card[];
  numPlayers: number;
  handSize: number;
  shuffle: ShuffleFn<Card>;
  /** Ranks that must not start the discard (reshuffle/skip). Defaults to none. */
  avoidStarterRanks?: readonly Rank[];
};

/**
 * Shuffle, deal, flip a starter onto discard, and set currentSuit from the starter.
 * If the starter rank is avoided, keep flipping until a legal starter appears (or stock empties).
 */
export function setupMatchingTable(options: SetupMatchingOptions): MatchingTable {
  const shuffled = options.shuffle(options.deck.slice());
  const { hands, stock } = dealEvenly(shuffled, options.numPlayers, options.handSize);
  const zones: CardZones = { hands, stock, discard: [] };

  let starter: Card | null = null;
  const avoid = new Set(options.avoidStarterRanks ?? []);
  while (zones.stock.length > 0) {
    const card = flipStarter(zones);
    // stock length was checked; flipStarter always yields a card here
    if (!avoid.has(card!.rank)) {
      starter = card;
      break;
    }
  }
  if (!starter) {
    // Degenerate: use whatever is on discard, or invent a suit if empty.
    starter = zones.discard[zones.discard.length - 1] ?? null;
  }

  return {
    ...zones,
    currentSuit: starter?.suit ?? 'clubs',
    drewThisTurn: false,
  };
}
