import { describe, expect, it } from 'vitest';
import { idx } from './coords';
import { nInARowWinner } from './win';

describe('nInARowWinner', () => {
  it('finds three-in-a-row on a 3x3 board (tic-tac-toe lines)', () => {
    const empty = Array(9).fill(null) as (string | null)[];
    expect(nInARowWinner(empty, { rows: 3, cols: 3, n: 3 })).toBeNull();

    const row = [...empty];
    row[0] = row[1] = row[2] = '0';
    expect(nInARowWinner(row, { rows: 3, cols: 3, n: 3 })).toBe('0');

    const col = [...empty];
    col[1] = col[4] = col[7] = '1';
    expect(nInARowWinner(col, { rows: 3, cols: 3, n: 3 })).toBe('1');

    const diag = [...empty];
    diag[0] = diag[4] = diag[8] = '0';
    expect(nInARowWinner(diag, { rows: 3, cols: 3, n: 3 })).toBe('0');

    const anti = [...empty];
    anti[2] = anti[4] = anti[6] = '1';
    expect(nInARowWinner(anti, { rows: 3, cols: 3, n: 3 })).toBe('1');
  });

  it('finds four-in-a-row on a 6x7 board (connect four)', () => {
    const rows = 6;
    const cols = 7;
    const cells = Array(rows * cols).fill(null) as (string | null)[];
    expect(nInARowWinner(cells, { rows, cols, n: 4 })).toBeNull();

    for (let k = 0; k < 4; k++) cells[idx(5, k, cols)] = '0';
    expect(nInARowWinner(cells, { rows, cols, n: 4 })).toBe('0');

    const vertical = Array(rows * cols).fill(null) as (string | null)[];
    for (let k = 0; k < 4; k++) vertical[idx(5 - k, 0, cols)] = '1';
    expect(nInARowWinner(vertical, { rows, cols, n: 4 })).toBe('1');

    const diagonal = Array(rows * cols).fill(null) as (string | null)[];
    for (let k = 0; k < 4; k++) diagonal[idx(5 - k, k, cols)] = '0';
    expect(nInARowWinner(diagonal, { rows, cols, n: 4 })).toBe('0');
  });

  it('ignores runs shorter than n', () => {
    const cells = Array(9).fill(null) as (string | null)[];
    cells[0] = cells[1] = '0';
    expect(nInARowWinner(cells, { rows: 3, cols: 3, n: 3 })).toBeNull();
  });
});
