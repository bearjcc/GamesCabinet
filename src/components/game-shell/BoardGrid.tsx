import type { BoardGridModel } from './types';

export function BoardGrid({ model }: { model: BoardGridModel }) {
  const className = ['game-shell-board-grid', model.className].filter(Boolean).join(' ');
  return (
    <div
      className={className}
      role="grid"
      aria-label={model.ariaLabel}
      data-testid={model.testId}
      style={{
        gridTemplateColumns: `repeat(${model.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${model.rows}, minmax(0, 1fr))`,
      }}
    >
      {model.cells.map((cell) => (
        <div key={cell.id} role="gridcell" aria-label={cell.ariaLabel}>
          {cell.content}
        </div>
      ))}
    </div>
  );
}
