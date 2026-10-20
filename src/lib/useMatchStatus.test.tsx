// @vitest-environment jsdom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { HotseatProvider } from './hotseat';
import { useMatchStatus } from './useMatchStatus';

function Probe({ onResult }: { onResult: (value: ReturnType<typeof useMatchStatus>) => void }) {
  const status = useMatchStatus({ currentPlayer: '0' }, '0');
  onResult(status);
  return null;
}

describe('useMatchStatus', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it('reads hot-seat context when rendering', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    let seen: ReturnType<typeof useMatchStatus> | undefined;
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(
          HotseatProvider,
          { value: true },
          createElement(Probe, {
            onResult: (value) => {
              seen = value;
            },
          }),
        ),
      );
    });
    expect(seen).toEqual({ text: "Player 1's turn", tone: 'you' });
    root.unmount();
  });
});
