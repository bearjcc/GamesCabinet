import { describe, expect, it } from 'vitest';
import { idx, rowCol } from './coords';

describe('idx / rowCol', () => {
  it('maps row-major coordinates to a flat index', () => {
    expect(idx(0, 0, 7)).toBe(0);
    expect(idx(0, 6, 7)).toBe(6);
    expect(idx(1, 0, 7)).toBe(7);
    expect(idx(5, 3, 7)).toBe(38);
    expect(idx(2, 1, 3)).toBe(7);
  });

  it('round-trips through rowCol', () => {
    for (const width of [3, 7]) {
      for (let i = 0; i < width * 4; i++) {
        const { row, col } = rowCol(i, width);
        expect(idx(row, col, width)).toBe(i);
      }
    }
  });
});
