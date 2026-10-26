import { afterEach, describe, expect, it, vi } from 'vitest';
import { preloadTracksTiles } from './tracksPreload';

describe('preloadTracksTiles', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warms the image cache once', () => {
    const imgs: { src: string }[] = [];
    class FakeImage {
      decoding = '';
      set src(v: string) {
        imgs.push({ src: v });
      }
    }
    vi.stubGlobal('Image', FakeImage);
    preloadTracksTiles();
    preloadTracksTiles();
    expect(imgs.some((i) => i.src.includes('junction'))).toBe(true);
    expect(imgs.some((i) => i.src.includes('grass-tile'))).toBe(true);
  });
});
