import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react';

export type TracksLayoutMetrics = {
  cellPx: number;
  gutterPx: number;
  vars: CSSProperties;
};

/** Hand tray height at a given cell size (matches tracks.css tray + hand + piles). */
export function pewHeightForCell(cellPx: number, compact?: boolean): number {
  const isCompact =
    compact ?? (window.innerHeight <= 840 && window.innerWidth > window.innerHeight);
  const pile = Math.min(52, cellPx * 0.72);
  const hand = cellPx + 8;
  const pilesBlock = 8 + pile + 10;
  const trayVertical = isCompact ? 8 : 16;
  const pewPad = 6;
  return hand + pilesBlock + trayVertical + pewPad;
}

/** When the tray measures shorter than the formula, try one larger cell size. */
export function tracksCellWithMeasuredPewSlack(
  lo: number,
  cellW: number,
  heightBudget: number,
  pewMeasured: number,
  compact: boolean,
): number {
  const slack = Math.max(0, pewHeightForCell(lo, compact) - pewMeasured);
  if (slack <= 0) return lo;
  const next = lo + 1;
  const maxCell = Math.floor(cellW);
  if (next <= maxCell && 3 * next + pewHeightForCell(next, compact) <= heightBudget + slack) {
    return next;
  }
  return lo;
}

export function measureTracksLayout(
  fieldEl: HTMLElement | null,
  _pewEl: HTMLElement | null,
): TracksLayoutMetrics {
  const vw = window.innerWidth;
  const gutterPx = Math.round(Math.min(42, Math.max(20, (vw * 42) / 820)));
  const cellW = (vw - 2 * gutterPx) / 8;

  const fieldTop = fieldEl?.getBoundingClientRect().top ?? 0;
  const switchH = fieldEl?.querySelector<HTMLElement>('.tracks-boardswitch')?.offsetHeight ?? 0;
  const hintH = fieldEl?.querySelector<HTMLElement>('.tracks-hint')?.offsetHeight ?? 0;
  const compact = window.innerHeight <= 840 && window.innerWidth > window.innerHeight;
  const playPad = compact ? 4 : 8;

  const heightBudget = window.innerHeight - fieldTop - switchH - hintH - playPad;
  let lo = 48;
  let hi = Math.max(48, Math.floor(cellW));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (3 * mid + pewHeightForCell(mid, compact) <= heightBudget) lo = mid;
    else hi = mid - 1;
  }

  const pewMeasured = _pewEl?.offsetHeight ?? 0;
  const playTable =
    fieldEl && typeof fieldEl.closest === 'function' ? fieldEl.closest('.play-table') : null;
  const currentCell = Number(playTable?.getAttribute('data-tracks-cell-px') ?? 0);
  if (pewMeasured > 48 && currentCell > 0 && Math.abs(lo - currentCell) <= 2) {
    lo = tracksCellWithMeasuredPewSlack(lo, cellW, heightBudget, pewMeasured, compact);
  }

  const cellPx = lo;

  return {
    cellPx,
    gutterPx,
    vars: {
      '--tracks-cell': `${cellPx}px`,
      '--tracks-gutter': `${gutterPx}px`,
    } as CSSProperties,
  };
}

/** Size TRACKS cells from viewport once at mount and on real resize. */
export function useTracksLayout(
  enabled: boolean,
  refs: {
    infoRef: RefObject<HTMLElement | null>;
    fieldRef: RefObject<HTMLElement | null>;
    pewRef: RefObject<HTMLElement | null>;
  },
): TracksLayoutMetrics {
  const [metrics, setMetrics] = useState<TracksLayoutMetrics>(() => ({
    cellPx: 72,
    gutterPx: 42,
    vars: { '--tracks-cell': '72px', '--tracks-gutter': '42px' } as CSSProperties,
  }));

  useLayoutEffect(() => {
    if (!enabled) return;

    const run = () => {
      setMetrics(measureTracksLayout(refs.fieldRef.current, refs.pewRef.current));
    };

    run();
    const raf = requestAnimationFrame(() => run());
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => run()) : undefined;
    if (ro) {
      if (refs.infoRef.current) ro.observe(refs.infoRef.current);
      if (refs.fieldRef.current) ro.observe(refs.fieldRef.current);
      if (refs.pewRef.current) ro.observe(refs.pewRef.current);
    }
    window.addEventListener('resize', run);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [enabled, refs.infoRef, refs.fieldRef, refs.pewRef]);

  return metrics;
}
