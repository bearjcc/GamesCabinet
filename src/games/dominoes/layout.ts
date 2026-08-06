/** Visual layout for Dominoes: 1 game cell = tile long side; tiles abut end-to-end. */

export const TILE_LONG_REM = 4.4;
export const TILE_SHORT_REM = TILE_LONG_REM / 2;
/** Snap radius in rem (~half a tile). */
export const SNAP_RADIUS_REM = TILE_LONG_REM * 0.65;

export type BoxRem = { left: number; top: number; width: number; height: number };
type EndDirection = 'N' | 'E' | 'S' | 'W';

export function isVerticalRot(rot: number): boolean {
  return rot === 90 || rot === 270;
}

/** Axis-aligned box for a placed tile (rotation applied visually via CSS). */
export function tileBoxRem(x: number, y: number, rot: number): BoxRem {
  const cx = x * TILE_LONG_REM;
  const cy = y * TILE_LONG_REM;
  const vertical = isVerticalRot(rot);
  const width = vertical ? TILE_SHORT_REM : TILE_LONG_REM;
  const height = vertical ? TILE_LONG_REM : TILE_SHORT_REM;
  return { left: cx - width / 2, top: cy - height / 2, width, height };
}

/** Centre the visual target on the seam, not on the next tile's centre anchor. */
export function endBoxRem(x: number, y: number, dir?: EndDirection): BoxRem {
  const size = Math.max(TILE_SHORT_REM, 2.75);
  const cx = (x + (dir === 'W' ? 0.5 : dir === 'E' ? -0.5 : 0)) * TILE_LONG_REM;
  const cy = (y + (dir === 'N' ? 0.5 : dir === 'S' ? -0.5 : 0)) * TILE_LONG_REM;
  return { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
}

export function boardBoundsRem(
  tiles: { x: number; y: number; rot: number }[],
  ends: { x: number; y: number }[],
  pad = TILE_SHORT_REM,
): { minX: number; minY: number; width: number; height: number } {
  const boxes = [
    ...tiles.map((t) => tileBoxRem(t.x, t.y, t.rot)),
    ...ends.map((e) => endBoxRem(e.x, e.y)),
  ];
  if (boxes.length === 0) {
    return { minX: -pad, minY: -pad, width: pad * 2, height: pad * 2 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.left);
    minY = Math.min(minY, b.top);
    maxX = Math.max(maxX, b.left + b.width);
    maxY = Math.max(maxY, b.top + b.height);
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

/** Nearest end index within snap radius (rem), or null. */
export function nearestEndIndex(
  pointRem: { x: number; y: number },
  ends: { x: number; y: number }[],
  allowed: number[],
  radiusRem = SNAP_RADIUS_REM,
): number | null {
  let best: number | null = null;
  let bestDist = radiusRem;
  for (const i of allowed) {
    const e = ends[i];
    if (!e) continue;
    const cx = e.x * TILE_LONG_REM;
    const cy = e.y * TILE_LONG_REM;
    const d = Math.hypot(pointRem.x - cx, pointRem.y - cy);
    if (d <= bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
