export type CellPos = { row: number; col: number };

function sameCell(a: CellPos, b: CellPos): boolean {
  return a.row === b.row && a.col === b.col;
}

function isOrthogonalNeighbour(a: CellPos, b: CellPos): boolean {
  return (
    (Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
    (Math.abs(a.col - b.col) === 1 && a.row === b.row)
  );
}

/** Extend or undo a straight H/V selection path (Ursa Minor rules). */
export function extendSelection(selected: CellPos[], row: number, col: number): CellPos[] {
  const next = { row, col };
  if (selected.length === 0) return [next];

  const last = selected[selected.length - 1];
  if (sameCell(last, next)) return selected;

  const len = selected.length;

  if (len >= 2) {
    const prev = selected[len - 2];
    if (sameCell(prev, next)) return selected.slice(0, -1);
  }

  if (selected.some((sc) => sameCell(sc, next))) return selected;

  if (len === 1) {
    if (isOrthogonalNeighbour(last, next)) return [...selected, next];
    return selected;
  }

  const first = selected[0];
  const second = selected[1];
  const isHorizontal = first.row === second.row;
  const sameLine = isHorizontal
    ? next.row === last.row && Math.abs(next.col - last.col) === 1
    : next.col === last.col && Math.abs(next.row - last.row) === 1;
  if (sameLine) return [...selected, next];
  return selected;
}

/** True when path is a contiguous straight horizontal or vertical line of length >= 1. */
export function isStraightPath(path: CellPos[]): boolean {
  if (path.length === 0) return false;
  if (path.length === 1) return true;

  const first = path[0];
  const second = path[1];
  const isHorizontal = first.row === second.row;
  const isVertical = first.col === second.col;
  if (!isHorizontal && !isVertical) return false;

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (isHorizontal) {
      if (b.row !== first.row || Math.abs(b.col - a.col) !== 1) return false;
    } else if (b.col !== first.col || Math.abs(b.row - a.row) !== 1) {
      return false;
    }
  }

  const seen = new Set<string>();
  for (const c of path) {
    const key = `${c.row},${c.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

export function wordFromGrid(grid: string[][], path: CellPos[]): string {
  return path.map((c) => grid[c.row]?.[c.col] ?? '').join('');
}
