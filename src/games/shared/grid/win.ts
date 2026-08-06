import { idx } from './coords';

export type NInARowOptions = {
  rows: number;
  cols: number;
  n: number;
};

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** First player with `n` consecutive cells in a row, column, or diagonal; else null. */
export function nInARowWinner(
  cells: readonly (string | null)[],
  { rows, cols, n }: NInARowOptions,
): string | null {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const start = cells[idx(r, c, cols)];
      if (!start) continue;
      for (const [dr, dc] of DIRS) {
        let ok = true;
        for (let k = 1; k < n; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || cells[idx(rr, cc, cols)] !== start) {
            ok = false;
            break;
          }
        }
        if (ok) return start;
      }
    }
  }
  return null;
}
