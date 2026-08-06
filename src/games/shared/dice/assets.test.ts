import { describe, expect, it } from 'vitest';
import { composeDieFaceArt, dieFaceArtMap, resolveDieFaceAsset } from './assets';
import { KENNEY_DICE_SKULL, kenneyDieFaceAsset } from './kenney';

describe('die face asset resolvers', () => {
  it('defaults each face to the Kenney SVG', () => {
    for (const face of [1, 2, 3, 4, 5, 6] as const) {
      expect(resolveDieFaceAsset(face)).toBe(kenneyDieFaceAsset(face));
    }
  });

  it('honours a face-art override slot without forking behaviour', () => {
    expect(resolveDieFaceAsset(1, { 1: KENNEY_DICE_SKULL })).toBe(KENNEY_DICE_SKULL);
    expect(resolveDieFaceAsset(2, { 1: KENNEY_DICE_SKULL })).toBe(kenneyDieFaceAsset(2));
  });

  it('composes override maps so game art wins over base', () => {
    const base = dieFaceArtMap({ 1: '/base-one.svg', 2: '/base-two.svg' });
    const game = dieFaceArtMap({ 1: KENNEY_DICE_SKULL });
    const merged = composeDieFaceArt(game, base);
    expect(resolveDieFaceAsset(1, merged)).toBe(KENNEY_DICE_SKULL);
    expect(resolveDieFaceAsset(2, merged)).toBe('/base-two.svg');
    expect(resolveDieFaceAsset(3, merged)).toBe(kenneyDieFaceAsset(3));
  });
});
