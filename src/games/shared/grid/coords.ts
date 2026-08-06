/** Flat index for a cell in a row-major grid of the given width (column count). */
export function idx(row: number, col: number, width: number): number {
  return row * width + col;
}

/** Row and column for a flat index in a row-major grid of the given width. */
export function rowCol(index: number, width: number): { row: number; col: number } {
  return { row: Math.floor(index / width), col: index % width };
}
