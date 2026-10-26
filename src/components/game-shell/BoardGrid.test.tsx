// @vitest-environment jsdom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { BoardGrid } from './BoardGrid';

describe('BoardGrid', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it('renders a grid with the requested dimensions', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(BoardGrid, {
          model: {
            columns: 2,
            rows: 2,
            testId: 'grid',
            cells: [
              { id: '0', content: 'a' },
              { id: '1', content: 'b' },
              { id: '2', content: 'c' },
              { id: '3', content: 'd' },
            ],
          },
        }),
      );
    });
    const grid = container.querySelector('[data-testid="grid"]') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toContain('repeat(2');
    expect(grid.textContent).toContain('a');
    root.unmount();
  });
});
