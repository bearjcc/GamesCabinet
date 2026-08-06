import { describe, expect, it } from 'vitest';
import { kenneyPlayingCardPath, makeCard } from '../shared/cards';
import {
  CRAZY_EIGHTS_EIGHT_ASSETS,
  crazyEightsAssetResolver,
  crazyEightsDeckDefs,
  isWildEightId,
} from './assets';

describe('crazy eights assets', () => {
  it('tags eights as wild and points them at Kenney faces', () => {
    const defs = crazyEightsDeckDefs();
    for (const id of Object.keys(CRAZY_EIGHTS_EIGHT_ASSETS)) {
      const card = defs.find((c) => c.id === id)!;
      expect(card.asset).toBe(CRAZY_EIGHTS_EIGHT_ASSETS[id]);
      expect(card.tags).toContain('wild');
      expect(card.meta).toEqual({ wild: true });
    }
    expect(CRAZY_EIGHTS_EIGHT_ASSETS['hearts-8']).toBe(kenneyPlayingCardPath('hearts', '8'));
    expect(defs.find((c) => c.id === 'hearts-7')?.asset).toBeUndefined();
  });

  it('resolves Kenney faces for eights and non-eights', () => {
    const resolve = crazyEightsAssetResolver();
    expect(resolve(makeCard('hearts', '8'))).toBe(
      '/assets/kenney/boardgame-pack/PNG/Cards/cardHearts8.png',
    );
    expect(resolve(makeCard('spades', 'A'))).toBe(
      '/assets/kenney/boardgame-pack/PNG/Cards/cardSpadesA.png',
    );
    expect(isWildEightId('hearts-8')).toBe(true);
    expect(isWildEightId('hearts-7')).toBe(false);
  });
});
