/** Shell representation modes for card hands (ADR 0001 §4). */
export const CARD_HAND_MODES = ['physical', 'compact', 'list'] as const;

export type CardHandMode = (typeof CARD_HAND_MODES)[number];

export type CardHandViewportHint = 'narrow' | 'wide';

/**
 * Mum-simple hand mode thresholds (count boundaries, exclusive upper for each band):
 * - physical: cardCount < CARD_HAND_PHYSICAL_MAX (8)
 * - compact:  CARD_HAND_PHYSICAL_MAX <= cardCount < CARD_HAND_COMPACT_MAX (14)
 * - list:     cardCount >= CARD_HAND_COMPACT_MAX
 */
export const CARD_HAND_PHYSICAL_MAX = 8;
export const CARD_HAND_COMPACT_MAX = 14;

/**
 * Pick a hand representation from card count.
 * `viewportHint` is accepted for shell callers; Mum-simple thresholds ignore it for now.
 */
export function chooseCardHandMode(
  cardCount: number,
  viewportHint?: CardHandViewportHint,
): CardHandMode {
  void viewportHint;
  if (cardCount < CARD_HAND_PHYSICAL_MAX) return 'physical';
  if (cardCount < CARD_HAND_COMPACT_MAX) return 'compact';
  return 'list';
}
