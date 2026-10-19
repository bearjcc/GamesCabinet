type WinLineProps = {
  cells: readonly number[];
  cols: number;
  rows: number;
  className?: string;
  testId?: string;
};

/** Draw a line through the centres of winning grid cells (normalised 0–1 coords). */
export function WinLine({ cells, cols, rows, className, testId }: WinLineProps) {
  if (cells.length < 2) return null;
  const centres = cells.map((i) => ({
    x: ((i % cols) + 0.5) / cols,
    y: (Math.floor(i / cols) + 0.5) / rows,
  }));
  const first = centres[0];
  const last = centres[centres.length - 1];
  return (
    <svg
      className={className}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden
      role="presentation"
      data-testid={testId}
    >
      <line x1={first.x} y1={first.y} x2={last.x} y2={last.y} />
    </svg>
  );
}
