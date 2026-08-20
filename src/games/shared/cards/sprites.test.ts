import { describe, expect, it } from 'vitest';
import { spriteStyle } from './sprites';

describe('sprite atlas styles', () => {
  it('positions a middle cell in a two-row atlas', () => {
    expect(
      spriteStyle({
        sheet: 'sheet_111',
        index: 12,
        cols: 10,
        rows: 3,
      }),
    ).toEqual({
      backgroundSize: '1000% 300%',
      backgroundPosition: '22.2222% 50%',
    });
  });

  it('supports a single-column or single-row atlas', () => {
    expect(spriteStyle({ sheet: 'sheet_001', index: 0, cols: 1, rows: 1 })).toEqual({
      backgroundSize: '100% 100%',
      backgroundPosition: '0% 0%',
    });
  });

  it('rejects cells outside the atlas', () => {
    expect(() => spriteStyle({ sheet: 'sheet_001', index: 2, cols: 2, rows: 1 })).toThrow(
      'Sprite index 2 is outside a 2x1 atlas',
    );
  });

  it('rejects invalid atlas dimensions', () => {
    expect(() => spriteStyle({ sheet: 'sheet_001', index: 0, cols: 0, rows: 1 })).toThrow(
      'Sprite atlas dimensions must be positive integers: 0x1',
    );
  });
});
