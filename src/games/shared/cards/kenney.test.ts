import { describe, expect, it } from 'vitest';
import { makeCard } from './deck';
import {
  KENNEY_CARD_BACK,
  kenneyPlayingCardAsset,
  kenneyPlayingCardPath,
  kenneyRankToken,
} from './kenney';

describe('kenney playing cards', () => {
  it('maps suits and ranks onto Kenney PNG paths', () => {
    expect(kenneyRankToken('10')).toBe('10');
    expect(kenneyPlayingCardPath('hearts', '8')).toBe(
      '/assets/kenney/boardgame-pack/PNG/Cards/cardHearts8.png',
    );
    expect(kenneyPlayingCardAsset(makeCard('spades', 'A'))).toBe(
      '/assets/kenney/boardgame-pack/PNG/Cards/cardSpadesA.png',
    );
    expect(kenneyPlayingCardAsset(makeCard('clubs', '10'))).toBe(
      '/assets/kenney/boardgame-pack/PNG/Cards/cardClubs10.png',
    );
    expect(KENNEY_CARD_BACK).toContain('cardBack_blue2.png');
  });
});
