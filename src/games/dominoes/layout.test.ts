import { describe, expect, it } from 'vitest';
import {
  boardBoundsRem,
  endBoxRem,
  nearestEndIndex,
  TILE_LONG_REM,
  TILE_SHORT_REM,
  tileBoxRem,
} from './layout';

describe('tileBoxRem', () => {
  it('places horizontal tiles so neighbours on the E-W axis abut', () => {
    const a = tileBoxRem(0, 0, 0);
    const b = tileBoxRem(1, 0, 0);
    expect(a.width).toBe(TILE_LONG_REM);
    expect(a.height).toBe(TILE_SHORT_REM);
    expect(a.left + a.width).toBeCloseTo(b.left);
  });

  it('places vertical tiles so neighbours on the N-S axis abut', () => {
    const a = tileBoxRem(0, 0, 90);
    const b = tileBoxRem(0, 1, 90);
    expect(a.width).toBe(TILE_SHORT_REM);
    expect(a.height).toBe(TILE_LONG_REM);
    expect(a.top + a.height).toBeCloseTo(b.top);
  });
});

describe('nearestEndIndex', () => {
  const ends = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];

  it('snaps to the closest allowed end', () => {
    expect(nearestEndIndex({ x: TILE_LONG_REM + 0.2, y: 0.1 }, ends, [0, 1])).toBe(0);
    expect(nearestEndIndex({ x: -TILE_LONG_REM, y: 0 }, ends, [0, 1])).toBe(1);
  });

  it('returns null when outside snap radius or not allowed', () => {
    expect(nearestEndIndex({ x: 10, y: 10 }, ends, [0, 1])).toBeNull();
    expect(nearestEndIndex({ x: TILE_LONG_REM, y: 0 }, ends, [1])).toBeNull();
  });

  it('skips missing end entries', () => {
    expect(nearestEndIndex({ x: TILE_LONG_REM, y: 0 }, [{ x: 1, y: 0 }], [9])).toBeNull();
  });
});

describe('boardBoundsRem empty board', () => {
  it('returns padded bounds when no tiles or ends exist', () => {
    expect(boardBoundsRem([], [])).toEqual({
      minX: -TILE_LONG_REM,
      minY: -TILE_LONG_REM,
      width: TILE_LONG_REM * 2,
      height: TILE_LONG_REM * 2,
    });
  });
});

describe('boardBoundsRem with tiles', () => {
  it('includes padding around tiles and ends', () => {
    const b = boardBoundsRem([{ x: 0, y: 0, rot: 0 }], [{ x: 1, y: 0 }]);
    const tile = tileBoxRem(0, 0, 0);
    const end = endBoxRem(1, 0);
    expect(b.minX).toBeLessThan(tile.left);
    expect(b.width).toBeGreaterThan(end.left + end.width - tile.left);
  });
});
