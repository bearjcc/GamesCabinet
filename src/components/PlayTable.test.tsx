// @vitest-environment jsdom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayTable } from './PlayTable';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

describe('PlayTable tracks grass', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it('wraps board and pew in a full-width grass field', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(PlayTable, {
          felt: 'tracks',
          info: createElement('p', null, 'info'),
          board: createElement('div', { 'data-testid': 'board' }),
          pew: createElement('div', { 'data-testid': 'pew' }),
        }),
      );
    });
    expect(container.querySelector('[data-testid="tracks-grass-field"]')).not.toBeNull();
    root.unmount();
  });
});
