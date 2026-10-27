import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { IconButton } from '../IconControl';
import { IconHelp, IconMore, IconScores, IconUndo } from '../icons';
import { TurnPlate } from './TurnPlate';
import type { GameShellRailActionModel, GameShellRailModel } from './types';

type RailIcon = ComponentType<{ className?: string }>;

const ICONS: Record<GameShellRailActionModel['id'], RailIcon> = {
  undo: IconUndo,
  rules: IconHelp,
  scores: IconScores,
  more: IconMore,
};

export function GameShellRail({ model }: { model: GameShellRailModel }) {
  return (
    <header className="game-shell-rail" data-testid="game-shell-rail">
      <div className="game-shell-rail__start">
        <Link to="/" className="game-shell-rail__home" data-testid="game-shell-home">
          <img
            className="game-shell-rail__mark"
            src="/brand/gamescabinet-mark.png"
            width={24}
            height={24}
            alt=""
          />
        </Link>
        <div className="game-shell-rail__title-block">
          <h2 className="game-shell-rail__title">{model.gameTitle}</h2>
          {model.meta ? <div className="game-shell-rail__meta">{model.meta}</div> : null}
          {model.quietHint ? (
            <p
              className="game-shell-rail__quiet"
              data-testid="game-shell-quiet-hint"
              role="status"
              aria-live="polite"
            >
              {model.quietHint}
            </p>
          ) : null}
        </div>
      </div>
      {model.turnPlate ? (
        <div className="game-shell-rail__center">
          <TurnPlate model={model.turnPlate} />
        </div>
      ) : null}
      <div className="game-shell-rail__actions" role="toolbar" aria-label="Match controls">
        {model.actions.map((action) => {
          const Icon = ICONS[action.id];
          return (
            <IconButton
              key={action.id}
              className="game-shell-rail__icon"
              label={action.label}
              testId={`game-shell-action-${action.id}`}
              disabled={action.disabled}
              pressed={action.pressed}
              onClick={action.onClick ?? (() => undefined)}
            >
              <Icon />
            </IconButton>
          );
        })}
      </div>
    </header>
  );
}
