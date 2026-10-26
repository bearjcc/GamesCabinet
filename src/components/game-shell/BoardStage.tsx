import type { ReactNode } from 'react';
import type { BoardStageModel } from './types';

export function BoardStage({
  model,
  board,
  underBoard,
  overlay,
}: {
  model: BoardStageModel;
  board: ReactNode;
  underBoard?: ReactNode;
  overlay?: ReactNode;
}) {
  const feltClass =
    model.felt === 'green'
      ? 'game-shell-stage--felt-green'
      : model.felt === 'blue'
        ? 'game-shell-stage--felt-blue'
        : model.felt === 'tracks'
          ? 'game-shell-stage--felt-tracks'
          : '';
  return (
    <div
      className={`game-shell-stage ${feltClass}`.trim()}
      data-testid="game-shell-stage"
      data-felt={model.felt || 'none'}
    >
      <div className="game-shell-stage__board" data-testid="game-shell-board-slot">
        {board}
      </div>
      {underBoard ? <div className="game-shell-stage__under">{underBoard}</div> : null}
      {overlay ? (
        <div className="game-shell-stage__overlay" data-testid="game-shell-overlay-slot">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}
