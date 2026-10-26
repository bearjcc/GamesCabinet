import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  tracksTileArtSource,
  tracksTileAssetKey,
  tracksTilePreloadUrls,
  tracksTileSizeForDisplay,
  tracksTileUrl,
} from './tileArt';

describe('tracks tile art', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps asset keys and sources', () => {
    expect(tracksTileAssetKey({ kind: 'obstacle', variant: 'mountain' })).toBe('obstacle-mountain');
    expect(tracksTileAssetKey({ kind: 'obstacle' })).toBe('obstacle-river');
    expect(tracksTileArtSource({ kind: 'tunnel-arch' })).toBe('bear-finished');
    expect(tracksTileArtSource({ kind: 'junction' })).toBe('bear-composed-placeholder');
    expect(tracksTileArtSource({ kind: 'straight' })).toBe('bear-composed');
    expect(tracksTileArtSource({ kind: 'obstacle', variant: 'river' })).toBe(
      'bear-composed-placeholder',
    );
  });

  it('builds stable URLs', () => {
    expect(tracksTileUrl({ kind: 'curve' }, 1024)).toBe('/assets/tracks/1024/curve.webp');
    expect(tracksTileUrl({ kind: 'obstacle', variant: 'river' }, 512)).toBe(
      '/assets/tracks/512/obstacle-river.webp',
    );
  });

  it('preloads every raster at both sizes', () => {
    const urls = tracksTilePreloadUrls();
    expect(urls.filter((u) => u.includes('whistlestop')).length).toBe(2);
    expect(urls.filter((u) => u.includes('obstacle-mountain')).length).toBe(2);
  });

  it('picks tile size from device pixel ratio', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    expect(tracksTileSizeForDisplay()).toBe(1024);
    vi.stubGlobal('window', { devicePixelRatio: 1.2 });
    expect(tracksTileSizeForDisplay()).toBe(512);
    vi.stubGlobal('window', undefined);
    expect(tracksTileSizeForDisplay()).toBe(512);
  });
});
