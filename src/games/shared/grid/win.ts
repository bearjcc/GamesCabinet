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

function winningRun(
  cells: readonly (string | null)[],
  { rows, cols, n }: NInARowOptions,
): number[] | null {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const start = cells[idx(r, c, cols)];
      if (!start) continue;
      for (const [dr, dc] of DIRS) {
        const run: number[] = [idx(r, c, cols)];
        let ok = true;
        for (let k = 1; k < n; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || cells[idx(rr, cc, cols)] !== start) {
            ok = false;
            break;
          }
          run.push(idx(rr, cc, cols));
        }
        if (ok) return run;
      }
    }
  }
  return null;
}

/** First player with `n` consecutive cells in a row, column, or diagonal; else null. */
export function nInARowWinner(
  cells: readonly (string | null)[],
  options: NInARowOptions,
): string | null {
  const run = winningRun(cells, options);
  if (!run) return null;
  return cells[run[0]]!;
}

/** Cell indices of the first winning run, for board overlays. */
export function nInARowWinningIndices(
  cells: readonly (string | null)[],
  options: NInARowOptions,
): number[] | null {
  return winningRun(cells, options);
}
