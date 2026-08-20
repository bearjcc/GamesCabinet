/** Generic pile helpers for deckbuilder genre kits (Hogwarts, Agency, …). */

/** Move discard into deck and shuffle when the deck is empty. */
export function reshuffleDiscardIntoDeck<T>(
  deck: T[],
  discard: T[],
  shuffle: (arr: T[]) => void,
): void {
  if (deck.length > 0 || discard.length === 0) return;
  deck.push(...discard);
  discard.length = 0;
  shuffle(deck);
}

/** Draw one card from deck into hand, reshuffling discard if needed. */
export function drawOneToHand<T>(
  deck: T[],
  hand: T[],
  discard: T[],
  shuffle: (arr: T[]) => void,
): T | undefined {
  reshuffleDiscardIntoDeck(deck, discard, shuffle);
  if (deck.length === 0) return undefined;
  const card = deck.shift()!;
  hand.push(card);
  return card;
}

/** Move a specific id from one pile to another. */
export function moveCardId(from: string[], to: string[], id: string): boolean {
  const idx = from.indexOf(id);
  if (idx < 0) return false;
  from.splice(idx, 1);
  to.push(id);
  return true;
}

/** Discard all cards from hand and play area into discard. */
export function discardHandAndPlayArea(
  hand: string[],
  playArea: string[],
  discard: string[],
): void {
  discard.push(...hand, ...playArea);
  hand.length = 0;
  playArea.length = 0;
}
