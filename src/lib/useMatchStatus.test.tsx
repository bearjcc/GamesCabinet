// @vitest-environment jsdom
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeatNameOverridesProvider } from '../components/SeatNameOverrides';
import { HotseatProvider } from './hotseat';
import * as storage from './storage';
import { useMatchStatus } from './useMatchStatus';

function Probe({
  currentPlayer = '0',
  playerID = '0',
  onResult,
}: {
  currentPlayer?: string;
  playerID?: string;
  onResult: (value: ReturnType<typeof useMatchStatus>) => void;
}) {
  const status = useMatchStatus({ currentPlayer }, playerID);
  onResult(status);
  return null;
}

describe('useMatchStatus', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('');
  });

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
    expect(seen).toEqual({ text: "You's turn", tone: 'you' });
    root.unmount();
  });

  it('uses bot seat overrides from context', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    let seen: ReturnType<typeof useMatchStatus> | undefined;
    const root = createRoot(container);
    flushSync(() => {
      root.render(
        createElement(
          SeatNameOverridesProvider,
          { botPlayerIds: ['1'] },
          createElement(Probe, {
            currentPlayer: '1',
            playerID: '0',
            onResult: (value) => {
              seen = value;
            },
          }),
        ),
      );
    });
    expect(seen?.text).toBe("Bot's turn");
    root.unmount();
  });

  it('prefers explicit nameForPlayer over bot overrides', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    let seen: ReturnType<typeof useMatchStatus> | undefined;
    const root = createRoot(container);
    function NamedProbe() {
      const status = useMatchStatus({ currentPlayer: '1' }, '0', {
        nameForPlayer: () => 'Rival',
      });
      seen = status;
      return null;
    }
    flushSync(() => {
      root.render(
        createElement(
          SeatNameOverridesProvider,
          { botPlayerIds: ['1'] },
          createElement(NamedProbe),
        ),
      );
    });
    expect(seen?.text).toBe("Rival's turn");
    root.unmount();
  });

  it('falls through blank nameForPlayer to bot overrides', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    let seen: ReturnType<typeof useMatchStatus> | undefined;
    const root = createRoot(container);
    function BlankProbe() {
      const status = useMatchStatus({ currentPlayer: '1' }, '0', {
        nameForPlayer: () => '   ',
      });
      seen = status;
      return null;
    }
    flushSync(() => {
      root.render(
        createElement(
          SeatNameOverridesProvider,
          { botPlayerIds: ['1'] },
          createElement(BlankProbe),
        ),
      );
    });
    expect(seen?.text).toBe("Bot's turn");
    root.unmount();
  });
});
