// @vitest-environment jsdom
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SeatNameOverridesProvider, useSeatNameOverrides } from './SeatNameOverrides';

function Probe({ onResult }: { onResult: (fn: ReturnType<typeof useSeatNameOverrides>) => void }) {
  const fn = useSeatNameOverrides();
  useEffect(() => onResult(fn), [fn, onResult]);
  return null;
}

describe('SeatNameOverridesProvider', () => {
  it('names bot seats only', () => {
    let resolve!: ReturnType<typeof useSeatNameOverrides>;
    const div = document.createElement('div');
    const root = createRoot(div);
    flushSync(() => {
      root.render(
        <SeatNameOverridesProvider botPlayerIds={['1']}>
          <Probe
            onResult={(fn) => {
              resolve = fn;
            }}
          />
        </SeatNameOverridesProvider>,
      );
    });
    expect(resolve?.('1')).toBe('Bot');
    expect(resolve?.('0')).toBeUndefined();
    root.unmount();
  });

  it('maps seatLabels by player index', () => {
    let resolve!: ReturnType<typeof useSeatNameOverrides>;
    const div = document.createElement('div');
    const root = createRoot(div);
    flushSync(() => {
      root.render(
        <SeatNameOverridesProvider seatLabels={['Bear', 'Ana', 'Kit']}>
          <Probe
            onResult={(fn) => {
              resolve = fn;
            }}
          />
        </SeatNameOverridesProvider>,
      );
    });
    expect(resolve?.('0')).toBe('Bear');
    expect(resolve?.('2')).toBe('Kit');
    expect(resolve?.('not-a-seat')).toBeUndefined();
    root.unmount();
  });

  it('returns undefined resolver when no overrides apply', () => {
    let resolve!: ReturnType<typeof useSeatNameOverrides>;
    const div = document.createElement('div');
    const root = createRoot(div);
    flushSync(() => {
      root.render(
        <SeatNameOverridesProvider seatLabels={[' ', '']}>
          <Probe
            onResult={(fn) => {
              resolve = fn;
            }}
          />
        </SeatNameOverridesProvider>,
      );
    });
    expect(resolve).toBeUndefined();
    root.unmount();
  });
});
