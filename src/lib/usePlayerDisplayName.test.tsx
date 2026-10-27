// @vitest-environment jsdom
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SeatNameOverridesProvider } from '../components/SeatNameOverrides';
import * as storage from './storage';
import { usePlayerDisplayName } from './usePlayerDisplayName';

function Probe({ onResult }: { onResult: (fn: ReturnType<typeof usePlayerDisplayName>) => void }) {
  const fn = usePlayerDisplayName();
  useEffect(() => onResult(fn), [fn, onResult]);
  return null;
}

describe('usePlayerDisplayName', () => {
  it('applies bot overrides from context', () => {
    vi.spyOn(storage, 'getNickname').mockReturnValue('You');
    let name!: ReturnType<typeof usePlayerDisplayName>;
    const div = document.createElement('div');
    const root = createRoot(div);
    flushSync(() => {
      root.render(
        <SeatNameOverridesProvider botPlayerIds={['1']}>
          <Probe
            onResult={(fn) => {
              name = fn;
            }}
          />
        </SeatNameOverridesProvider>,
      );
    });
    expect(name('0')).toBe('You');
    expect(name('1')).toBe('Bot');
    root.unmount();
  });
});
