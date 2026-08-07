import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActionSurface } from './ActionSurface';

describe('ActionSurface', () => {
  it('shows disabled reasons on the button for touch clients', () => {
    const html = renderToStaticMarkup(
      createElement(ActionSurface, {
        actions: [
          {
            id: 'drop-0',
            kind: 'move',
            label: 'Drop column 1',
            disabled: true,
            disabledReason: 'Column full',
            testId: 'c4-action-col-0',
            onAction: () => {},
          },
        ],
      }),
    );
    expect(html).toContain('data-disabled-reason="Column full"');
    expect(html).toContain('action-surface__reason');
    expect(html).toContain('Column full');
    expect(html).toContain('Drop column 1');
  });

  it('omits reason markup when the action is interactive', () => {
    const html = renderToStaticMarkup(
      createElement(ActionSurface, {
        actions: [
          {
            id: 'drop-0',
            kind: 'move',
            label: 'Drop column 1',
            onAction: () => {},
          },
        ],
      }),
    );
    expect(html).not.toContain('action-surface__reason');
    expect(html).not.toContain('data-disabled-reason');
  });
});
