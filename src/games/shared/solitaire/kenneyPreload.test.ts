import { afterEach, describe, expect, it, vi } from 'vitest';
import { KENNEY_CARD_BACK } from '../cards/kenney';
import { preloadKenneyPlayingCards } from './kenneyPreload';

describe('preloadKenneyPlayingCards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests all faces and the stock back once', () => {
    const srcs: string[] = [];
    class MockImage {
      decoding = 'async';
      set src(url: string) {
        srcs.push(url);
      }
    }
    vi.stubGlobal('Image', MockImage);

    preloadKenneyPlayingCards();
    preloadKenneyPlayingCards();

    expect(srcs).toContain(KENNEY_CARD_BACK);
    expect(srcs.filter((s) => s.includes('cardHeartsA.png'))).toHaveLength(1);
    expect(
      srcs.filter((s) => /\/Cards\/card(?:Clubs|Diamonds|Hearts|Spades)/.test(s)),
    ).toHaveLength(52);
    expect(srcs).toHaveLength(53);
  });
});
