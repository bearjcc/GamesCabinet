import { type CSSProperties, type RefObject, useLayoutEffect, useState } from 'react';

export type TracksLayoutMetrics = {
  cellPx: number;
  gutterPx: number;
  vars: CSSProperties;
};

export function tracksHandCardPx(cellPx: number, viewportWidth = window.innerWidth): number {
  return viewportWidth <= 640 ? Math.max(64, Math.round(cellPx * 0.8)) : Math.round(cellPx * 0.8);
}

/** Hand tray height at a given cell size (matches tracks.css tray + hand + piles). */
export function pewHeightForCell(cellPx: number, compact?: boolean): number {
  const isCompact =
    compact ?? (window.innerHeight <= 840 && window.innerWidth > window.innerHeight);
  const handCard = tracksHandCardPx(cellPx);
  const pile = Math.min(52, cellPx * 0.72);
  const hand = handCard + 8;
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

const TRACKS_BOARD_PEW_GAP = 4;
const TRACKS_LAYOUT_SAFETY = 4;

export function measureTracksLayout(
  fieldEl: HTMLElement | null,
  _pewEl: HTMLElement | null,
): TracksLayoutMetrics {
  const vw = window.innerWidth;
  const gutterPx = Math.round(Math.min(48, Math.max(28, (vw * 48) / 820)));
  /** Centred 8×cell + 2×gutter frame — fit inside the grass field with side margin. */
  const maxCellFromWidth = 112;
  const measuredField = fieldEl?.getBoundingClientRect().width ?? 0;
  const fieldWidth = measuredField > 40 ? measuredField : vw;
  /** Room for START/END sign labels that hang slightly outside the gutter column. */
  const terminalSignInset = 20;
  const frameSideMargin = 8;
  const frameBudget = Math.max(0, fieldWidth - frameSideMargin - 2 * terminalSignInset);
  const cellFromWidth = Math.min((frameBudget - 2 * gutterPx) / 8, maxCellFromWidth);

  const fieldTop = fieldEl?.getBoundingClientRect().top ?? 0;
  const compact = window.innerHeight <= 840 && window.innerWidth > window.innerHeight;
  const switchH = fieldEl?.querySelector<HTMLElement>('.tracks-boardswitch')?.offsetHeight ?? 0;
  const switchGap = compact ? 2 : 8;
  const hintH = fieldEl?.querySelector<HTMLElement>('.tracks-hint')?.offsetHeight ?? 0;
  const playEl = fieldEl?.querySelector<HTMLElement>('.tracks-play');
  const playPad =
    playEl instanceof Element && typeof getComputedStyle !== 'undefined'
      ? Number.parseFloat(getComputedStyle(playEl).paddingTop) || 0
      : compact
        ? 4
        : 8;
  const chromeAboveGrid = playPad + switchH + switchGap;

  const pewTopDom = _pewEl?.getBoundingClientRect().top ?? 0;
  const boardSlotHeight =
    pewTopDom > fieldTop + 40 ? pewTopDom - fieldTop : window.innerHeight - fieldTop;
  const totalBudget = window.innerHeight - fieldTop;
  const pewCostFor = (cell: number) => pewHeightForCell(cell, compact);

  let lo = 48;
  let hi = Math.max(48, Math.floor(cellFromWidth));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const boardContent = chromeAboveGrid + 3 * mid + hintH;
    const stack = boardContent + TRACKS_BOARD_PEW_GAP + pewCostFor(mid);
    const fits =
      boardContent + TRACKS_LAYOUT_SAFETY <= boardSlotHeight &&
      stack + TRACKS_LAYOUT_SAFETY <= totalBudget;
    if (fits) lo = mid;
    else hi = mid - 1;
  }

  const cellPx = lo;
  const handCardPx = tracksHandCardPx(cellPx, vw);

  return {
    cellPx,
    gutterPx,
    vars: {
      '--tracks-cell': `${cellPx}px`,
      '--tracks-gutter': `${gutterPx}px`,
      '--tracks-hand-card': `${handCardPx}px`,
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
    vars: {
      '--tracks-cell': '72px',
      '--tracks-gutter': '42px',
      '--tracks-hand-card': '58px',
    } as CSSProperties,
  }));

  useLayoutEffect(() => {
    if (!enabled) return;

    let debounce: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const next = measureTracksLayout(refs.fieldRef.current, refs.pewRef.current);
      setMetrics((prev) => (prev.cellPx === next.cellPx ? prev : next));
    };
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(run, 48);
    };

    run();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => run());
    });
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => schedule()) : undefined;
    if (ro) {
      if (refs.infoRef.current) ro.observe(refs.infoRef.current);
      if (refs.fieldRef.current) ro.observe(refs.fieldRef.current);
      if (refs.pewRef.current) ro.observe(refs.pewRef.current);
    }
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      if (debounce) clearTimeout(debounce);
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [enabled, refs.infoRef, refs.fieldRef, refs.pewRef]);

  return metrics;
}
