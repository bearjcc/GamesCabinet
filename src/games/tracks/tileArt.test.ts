import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  tracksGrassUrl,
  tracksRasterTileUrl,
  tracksTileArtSource,
  tracksTileHasRaster,
  tracksTilePreloadUrls,
  tracksTileSizeForDisplay,
} from './tileArt';

describe('tracks tile art', () => {
  it('maps finished and composed kinds', () => {
    expect(tracksTileArtSource('tunnel-arch')).toBe('bear-finished');
    expect(tracksTileArtSource('tunnel-mid')).toBe('bear-finished');
    expect(tracksTileArtSource('straight')).toBe('bear-composed');
    expect(tracksTileArtSource('curve')).toBe('bear-composed');
    expect(tracksTileArtSource('junction')).toBe('placeholder');
  });

  it('builds stable asset URLs', () => {
    expect(tracksGrassUrl(512)).toBe('/assets/tracks/512/grass.webp');
    expect(tracksRasterTileUrl('straight', 1024)).toBe('/assets/tracks/1024/straight.webp');
    expect(tracksRasterTileUrl('junction', 512)).toBeNull();
  });

  it('preloads grass and raster faces at both sizes', () => {
    const urls = tracksTilePreloadUrls();
    expect(urls).toContain('/assets/tracks/512/grass.webp');
    expect(urls).toContain('/assets/tracks/1024/tunnel-arch.webp');
    expect(urls.filter((u) => u.includes('straight')).length).toBe(2);
  });

  it('flags raster kinds', () => {
    expect(tracksTileHasRaster('curve')).toBe(true);
    expect(tracksTileHasRaster('whistlestop')).toBe(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('picks tile size from device pixel ratio', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    expect(tracksTileSizeForDisplay()).toBe(1024);
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    expect(tracksTileSizeForDisplay()).toBe(512);
  });

  it('defaults tile size without window', () => {
    vi.stubGlobal('window', undefined);
    expect(tracksTileSizeForDisplay()).toBe(512);
  });
});
