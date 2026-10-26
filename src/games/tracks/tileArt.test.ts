import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  tracksTileAssetKey,
  tracksTilePreloadUrls,
  tracksTileSizeForDisplay,
  tracksTileUrl,
} from './tileArt';

describe('tracks tile art', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps obstacle variants to asset keys', () => {
    expect(tracksTileAssetKey({ kind: 'obstacle', variant: 'mountain' })).toBe('obstacle-mountain');
    expect(tracksTileAssetKey({ kind: 'obstacle' })).toBe('obstacle-river');
    expect(tracksTileAssetKey({ kind: 'junction' })).toBe('junction');
  });

  it('builds stable URLs', () => {
    expect(tracksTileUrl({ kind: 'curve' }, 1024)).toBe('/assets/tracks/1024/curve.webp');
    expect(tracksTileUrl({ kind: 'obstacle', variant: 'river' }, 512)).toBe(
      '/assets/tracks/512/obstacle-river.webp',
    );
  });

  it('preloads every face at both sizes', () => {
    const urls = tracksTilePreloadUrls();
    expect(urls).toHaveLength(20);
    expect(urls).toContain('/assets/tracks/1024/tunnel-arch.webp');
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
