// @vitest-environment jsdom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { GAMES } from '../lib/games';
import { GameThumbnail } from './GameThumbnail';

describe('GameThumbnail', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it('renders known and fallback catalogue art', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(GameThumbnail, { gameId: 'chess' }));
    });
    expect(container.querySelector('[data-testid="game-thumb-chess"]')).toBeTruthy();

    for (const game of GAMES) {
      flushSync(() => {
        root.render(createElement(GameThumbnail, { gameId: game.id }));
      });
      expect(container.querySelector(`[data-testid="game-thumb-${game.id}"]`)).toBeTruthy();
    }

    flushSync(() => {
      root.render(createElement(GameThumbnail, { gameId: 'made-up', variant: 'launch' }));
    });
    expect(container.querySelector('[data-testid="game-thumb-made-up"]')).toBeTruthy();
    expect(container.querySelector('.game-thumb--launch')).toBeTruthy();
  });
});
