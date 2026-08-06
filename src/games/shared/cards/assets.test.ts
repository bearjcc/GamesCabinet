import { describe, expect, it } from 'vitest';
import { assetFromDefs, assetMap, composeAssetResolvers, resolveCardAsset } from './assets';
import { createStandardDeck, makeCard } from './deck';

describe('asset resolvers', () => {
  it('reads assets from card defs', () => {
    const defs = createStandardDeck({
      overrides: [{ id: 'hearts-8', asset: '/h8.svg' }],
    });
    const resolve = assetFromDefs(defs);
    expect(resolve(makeCard('hearts', '8'))).toBe('/h8.svg');
    expect(resolve(makeCard('clubs', '8'))).toBeNull();
  });

  it('composes overrides over a base map', () => {
    const base = assetMap({ 'hearts-8': '/base-h8.svg', 'clubs-8': '/base-c8.svg' });
    const game = assetMap({ 'hearts-8': '/wild-h8.svg' });
    const resolve = composeAssetResolvers(game, base);
    expect(resolve(makeCard('hearts', '8'))).toBe('/wild-h8.svg');
    expect(resolve(makeCard('clubs', '8'))).toBe('/base-c8.svg');
    expect(resolve(makeCard('spades', 'A'))).toBeNull();
  });

  it('resolveCardAsset uses an optional resolver', () => {
    expect(resolveCardAsset(makeCard('hearts', '2'))).toBeNull();
    expect(resolveCardAsset(makeCard('hearts', '2'), () => '/x.svg')).toBe('/x.svg');
  });
});
