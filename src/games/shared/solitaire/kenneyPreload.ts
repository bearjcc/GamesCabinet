import { KENNEY_CARD_BACK, kenneyPlayingCardPath } from '../cards/kenney';
import { RANKS, SUITS } from '../cards/types';

let preloaded = false;

/** Warm the browser cache for all Kenney playing-card faces and the stock back. */
export function preloadKenneyPlayingCards(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;

  const urls = new Set<string>([KENNEY_CARD_BACK]);
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      urls.add(kenneyPlayingCardPath(suit, rank));
    }
  }

  for (const url of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
