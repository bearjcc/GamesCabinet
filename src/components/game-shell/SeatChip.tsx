import type { CSSProperties } from 'react';
import type { SeatChipModel } from './types';

export function SeatChip({ model, testId }: { model: SeatChipModel; testId?: string }) {
  const style = model.seatColour ? { '--seat-chip-colour': model.seatColour } : undefined;
  return (
    <span
      className={`game-shell-seat-chip${model.active ? ' is-active' : ''}`}
      data-testid={testId ?? `game-shell-seat-${model.id}`}
      style={style as CSSProperties}
    >
      <span className="game-shell-seat-chip__dot" aria-hidden />
      <span className="game-shell-seat-chip__label">{model.label}</span>
      {model.detail ? <span className="game-shell-seat-chip__detail">{model.detail}</span> : null}
    </span>
  );
}
