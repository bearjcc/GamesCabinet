import { describe, expect, it } from 'vitest';
import { extendSelection, isStraightPath, wordFromGrid } from './selection';

describe('extendSelection', () => {
  it('starts a path on the first cell', () => {
    expect(extendSelection([], 2, 3)).toEqual([{ row: 2, col: 3 }]);
  });

  it('ignores selecting the same cell twice in a row', () => {
    expect(extendSelection([{ row: 1, col: 1 }], 1, 1)).toEqual([{ row: 1, col: 1 }]);
  });

  it('extends vertically', () => {
    expect(extendSelection([{ row: 0, col: 1 }], 1, 1)).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ]);
  });

  it('extends to an orthogonal neighbour', () => {
    expect(extendSelection([{ row: 2, col: 3 }], 2, 4)).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ]);
  });

  it('undoes when re-selecting the previous cell', () => {
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];
    expect(extendSelection(path, 0, 1)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('locks direction after two cells', () => {
    const path = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ];
    expect(extendSelection(path, 2, 2)).toEqual(path);
    expect(extendSelection(path, 1, 3)).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ]);
  });

  it('ignores non-neighbour second cells', () => {
    expect(extendSelection([{ row: 0, col: 0 }], 2, 2)).toEqual([{ row: 0, col: 0 }]);
  });

  it('extends a vertical path', () => {
    expect(
      extendSelection(
        [
          { row: 0, col: 1 },
          { row: 1, col: 1 },
        ],
        2,
        1,
      ),
    ).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ]);
  });

  it('ignores revisiting earlier cells except the previous one', () => {
    expect(
      extendSelection(
        [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        0,
        0,
      ),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });
});

describe('isStraightPath', () => {
  it('rejects an empty path', () => {
    expect(isStraightPath([])).toBe(false);
  });

  it('accepts a single cell', () => {
    expect(isStraightPath([{ row: 2, col: 2 }])).toBe(true);
  });

  it('accepts a horizontal run', () => {
    expect(
      isStraightPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toBe(true);
  });

  it('accepts a vertical run', () => {
    expect(
      isStraightPath([
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
      ]),
    ).toBe(true);
  });

  it('rejects diagonals and horizontal gaps', () => {
    expect(
      isStraightPath([
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ]),
    ).toBe(false);
    expect(
      isStraightPath([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    ).toBe(false);
  });

  it('rejects a gap in a vertical path', () => {
    expect(
      isStraightPath([
        { row: 0, col: 1 },
        { row: 2, col: 1 },
      ]),
    ).toBe(false);
  });

  it('rejects duplicate cells in a path', () => {
    expect(
      isStraightPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
      ]),
    ).toBe(false);
  });
});

describe('wordFromGrid', () => {
  it('joins letters along the path', () => {
    const grid = [
      ['C', 'A', 'T'],
      ['X', 'Y', 'Z'],
    ];
    expect(
      wordFromGrid(grid, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toBe('CAT');
  });

  it('returns empty letters for out-of-range cells', () => {
    expect(
      wordFromGrid(
        [['A']],
        [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 0, col: 9 },
        ],
      ),
    ).toBe('A');
  });
});
