// @vitest-environment jsdom
import { createElement, createRef, useLayoutEffect, useState } from 'react';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    private readonly cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe() {
      this.cb([], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  measureTracksLayout,
  pewHeightForCell,
  tracksCellWithMeasuredPewSlack,
  tracksHandCardPx,
  useTracksLayout,
} from './useTracksLayout';

describe('tracksHandCardPx', () => {
  it('scales with cell size on desktop widths', () => {
    expect(tracksHandCardPx(112, 1280)).toBe(90);
  });

  it('never goes below 64px on phone widths', () => {
    expect(tracksHandCardPx(48, 390)).toBe(64);
    expect(tracksHandCardPx(100, 390)).toBe(80);
  });
});

describe('tracksCellWithMeasuredPewSlack', () => {
  it('returns the next cell when slack covers the formula gap', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    expect(tracksCellWithMeasuredPewSlack(105, 137, 600, 140, true)).toBe(106);
  });

  it('returns the same cell when slack is zero', () => {
    expect(tracksCellWithMeasuredPewSlack(109, 137, 531, pewHeightForCell(109, true), true)).toBe(
      109,
    );
  });

  it('returns the same cell when the next size exceeds the width cap', () => {
    expect(tracksCellWithMeasuredPewSlack(100, 100, 900, 120, true)).toBe(100);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    expect(tracksCellWithMeasuredPewSlack(109, 109, 900, 140, true)).toBe(109);
  });

  it('returns the same cell when the next row still exceeds the height budget', () => {
    expect(tracksCellWithMeasuredPewSlack(109, 137, 520, 190, true)).toBe(109);
  });
});

describe('measureTracksLayout', () => {
  it('yields at least 110px cells at 1180×820', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });

    const field = {
      getBoundingClientRect: () => ({ top: 200, bottom: 700, left: 0, right: 1180 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const pew = {
      offsetHeight: 190,
      getBoundingClientRect: () => ({ top: 620 }),
    } as unknown as HTMLElement;

    const { cellPx } = measureTracksLayout(field, pew);
    expect(cellPx).toBeGreaterThanOrEqual(110);
  });

  it('fits large cells at 1180×820 when the field starts low enough', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const field = {
      getBoundingClientRect: () => ({ top: 188 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const { cellPx } = measureTracksLayout(field, null);
    expect(cellPx).toBeGreaterThanOrEqual(110);
  });

  it('infers compact landscape from the viewport when pew height is omitted', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    expect(pewHeightForCell(90)).toBe(pewHeightForCell(90, true));
    expect(pewHeightForCell(90, false)).toBeGreaterThan(pewHeightForCell(90));
  });

  it('uses full viewport height when pew top is not below the field', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const field = {
      getBoundingClientRect: () => ({ top: 200 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const pew = {
      getBoundingClientRect: () => ({ top: 220 }),
    } as unknown as HTMLElement;
    const tight = measureTracksLayout(field, pew);
    const loose = measureTracksLayout(field, {
      getBoundingClientRect: () => ({ top: 650 }),
    } as unknown as HTMLElement);
    expect(loose.cellPx).toBeLessThanOrEqual(tight.cellPx);
  });

  it('sets hand card size to 0.8× cell on desktop width', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const field = {
      getBoundingClientRect: () => ({ top: 120 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const { cellPx, vars } = measureTracksLayout(field, {
      getBoundingClientRect: () => ({ top: 700 }),
    } as unknown as HTMLElement);
    expect((vars as Record<string, string>)['--tracks-hand-card']).toBe(
      `${Math.round(cellPx * 0.8)}px`,
    );
  });

  it('enforces 64px minimum hand cards on phone width', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    const field = {
      getBoundingClientRect: () => ({ top: 120 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const { vars } = measureTracksLayout(field, null);
    expect((vars as Record<string, string>)['--tracks-hand-card']).toBe('64px');
  });

  it('uses taller pew estimate in portrait', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 820 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1180 });
    expect(pewHeightForCell(100, false)).toBeGreaterThan(pewHeightForCell(100, true));
  });

  it('uses portrait play padding in the height budget', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const landscape = measureTracksLayout(
      {
        getBoundingClientRect: () => ({ top: 300 }),
        querySelector: () => null,
      } as unknown as HTMLElement,
      null,
    );
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 820 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1180 });
    const portrait = measureTracksLayout(
      {
        getBoundingClientRect: () => ({ top: 300 }),
        querySelector: () => null,
      } as unknown as HTMLElement,
      null,
    );
    expect(landscape.cellPx).toBeGreaterThanOrEqual(portrait.cellPx);
  });

  it('does not bump past the width-derived cell cap', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 884 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const playTable = document.createElement('div');
    playTable.className = 'play-table';
    playTable.setAttribute('data-tracks-cell-px', '100');
    const field = {
      getBoundingClientRect: () => ({ top: 20, width: 884 }),
      querySelector: () => null,
      closest: (sel: string) => (sel === '.play-table' ? playTable : null),
    } as unknown as HTMLElement;
    const pew = {
      offsetHeight: 120,
      getBoundingClientRect: () => ({ top: 780 }),
    } as unknown as HTMLElement;
    const { cellPx } = measureTracksLayout(field, pew);
    expect(cellPx).toBe(92);
  });

  it('uses landscape play padding fallback when the play surface is missing', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const { cellPx } = measureTracksLayout(
      {
        getBoundingClientRect: () => ({ top: 200 }),
        querySelector: () => null,
      } as unknown as HTMLElement,
      null,
    );
    expect(cellPx).toBeGreaterThanOrEqual(48);
  });

  it('uses portrait play padding fallback when the play surface is missing', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 820 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1180 });
    const { cellPx } = measureTracksLayout(
      {
        getBoundingClientRect: () => ({ top: 300 }),
        querySelector: () => null,
      } as unknown as HTMLElement,
      null,
    );
    expect(cellPx).toBeGreaterThanOrEqual(48);
  });

  it('limits cells when the pew top leaves a short board slot', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const field = {
      getBoundingClientRect: () => ({ top: 200 }),
      querySelector: () => null,
    } as unknown as HTMLElement;
    const pew = {
      offsetHeight: 220,
      getBoundingClientRect: () => ({ top: 420 }),
    } as unknown as HTMLElement;
    const { cellPx } = measureTracksLayout(field, pew);
    expect(cellPx).toBeLessThan(80);
  });

  it('falls back when nodes are missing', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
    const { cellPx } = measureTracksLayout(null, null);
    expect(cellPx).toBeGreaterThanOrEqual(48);
  });

  it('subtracts chrome above the grid from the height budget', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });
    const play = document.createElement('div');
    play.className = 'tracks-play';
    document.body.appendChild(play);
    const switchEl = document.createElement('div');
    switchEl.className = 'tracks-boardswitch';
    switchEl.style.marginBottom = '10px';
    document.body.appendChild(switchEl);
    Object.defineProperty(switchEl, 'offsetHeight', { value: 28 });
    const field = {
      getBoundingClientRect: () => ({ top: 180 }),
      querySelector: (sel: string) => {
        if (sel.includes('tracks-play')) return play;
        if (sel.includes('boardswitch')) return switchEl;
        if (sel.includes('hint')) return { offsetHeight: 14 };
        return null;
      },
    } as unknown as HTMLElement;
    const pew = {
      offsetHeight: 200,
      getBoundingClientRect: () => ({ top: 650 }),
    } as unknown as HTMLElement;
    const tight = measureTracksLayout(field, pew);
    const loose = measureTracksLayout(
      {
        getBoundingClientRect: () => ({ top: 180 }),
        querySelector: () => null,
      } as unknown as HTMLElement,
      pew,
    );
    expect(tight.cellPx).toBeLessThanOrEqual(loose.cellPx);
    expect(pewHeightForCell(92)).toBeGreaterThan(120);
  });
});

describe('useTracksLayout', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    container?.remove();
  });

  it('measures on mount when enabled', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1180 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 820 });

    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();
    let cell = 0;

    function Probe() {
      const layout = useTracksLayout(true, { infoRef, fieldRef, pewRef });
      cell = layout.cellPx;
      return createElement(
        'div',
        null,
        createElement('div', { ref: infoRef, style: { height: '120px' } }),
        createElement('div', { ref: fieldRef, style: { height: '300px', width: '1180px' } }),
        createElement('div', { ref: pewRef, style: { height: '180px' } }),
      );
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    expect(cell).toBeGreaterThan(48);
    root.unmount();
  });

  it('handles enabling before refs attach', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();

    function Probe() {
      const [on, setOn] = useState(false);
      useLayoutEffect(() => setOn(true));
      useTracksLayout(on, { infoRef, fieldRef, pewRef });
      return null;
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    root.unmount();
  });

  it('observes whichever refs are mounted', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();

    function Probe({ mode }: { mode: 'info' | 'field' | 'pew' }) {
      useTracksLayout(true, { infoRef, fieldRef, pewRef });
      if (mode === 'info') return createElement('div', { ref: infoRef });
      if (mode === 'field') return createElement('div', { ref: fieldRef });
      return createElement('div', { ref: pewRef });
    }

    const root = createRoot(container);
    for (const mode of ['info', 'field', 'pew'] as const) {
      flushSync(() => {
        root.render(createElement(Probe, { mode }));
      });
    }
    window.dispatchEvent(new Event('resize'));
    root.unmount();
  });

  it('works when ResizeObserver is unavailable', () => {
    const saved = globalThis.ResizeObserver;
    // @ts-expect-error test fallback
    delete globalThis.ResizeObserver;
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();

    function Probe() {
      useTracksLayout(true, { infoRef, fieldRef, pewRef });
      return createElement('div', { ref: fieldRef });
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    root.unmount();
    globalThis.ResizeObserver = saved;
  });

  it('remeasures on the next animation frame', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();

    function Probe() {
      useTracksLayout(true, { infoRef, fieldRef, pewRef });
      return createElement('div', { ref: fieldRef });
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    root.unmount();
    vi.restoreAllMocks();
  });

  it('cancels a pending remeasure on unmount', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();

    function Probe() {
      useTracksLayout(true, { infoRef, fieldRef, pewRef });
      return createElement('div', { ref: fieldRef });
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    root.unmount();
    expect(cancel).toHaveBeenCalledWith(42);
    raf.mockRestore();
    cancel.mockRestore();
  });

  it('tears down observers when layout is disabled', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();
    const disconnect = vi.fn();
    const saved = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;

    function Probe({ enabled }: { enabled: boolean }) {
      useTracksLayout(enabled, { infoRef, fieldRef, pewRef });
      return createElement('div', { ref: fieldRef });
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe, { enabled: true }));
    });
    flushSync(() => {
      root.render(createElement(Probe, { enabled: false }));
    });
    expect(disconnect).toHaveBeenCalled();
    root.unmount();
    globalThis.ResizeObserver = saved;
  });

  it('skips layout work when disabled', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const infoRef = createRef<HTMLDivElement>();
    const fieldRef = createRef<HTMLDivElement>();
    const pewRef = createRef<HTMLDivElement>();
    let cell = 0;

    function Probe() {
      const layout = useTracksLayout(false, { infoRef, fieldRef, pewRef });
      cell = layout.cellPx;
      return null;
    }

    const root = createRoot(container);
    flushSync(() => {
      root.render(createElement(Probe));
    });
    expect(cell).toBe(72);
    root.unmount();
  });
});
