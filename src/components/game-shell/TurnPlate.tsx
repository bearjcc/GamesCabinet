import type { CSSProperties } from 'react';
import type { TurnPlateModel } from './types';

export function TurnPlate({
  model,
  testId = 'game-shell-turn-plate',
}: {
  model: TurnPlateModel;
  testId?: string;
}) {
  const style = model.seatColour ? { '--turn-plate-seat': model.seatColour } : undefined;
  return (
    <div
      className={`game-shell-turn-plate game-shell-turn-plate--${model.tone}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
      style={style as CSSProperties}
    >
      <span className="game-shell-turn-plate__avatar" aria-hidden>
        {model.initial}
      </span>
      <span className="game-shell-turn-plate__copy">
        <span className="game-shell-turn-plate__name">{model.name}&apos;s turn</span>
        {model.hint ? <span className="game-shell-turn-plate__hint">{model.hint}</span> : null}
      </span>
    </div>
  );
}
