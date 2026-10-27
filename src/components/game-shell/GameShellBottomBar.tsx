import type { ComponentType } from 'react';
import { IconHelp, IconMore, IconScores, IconUndo } from '../icons';
import type { GameShellBottomBarModel, GameShellRailActionModel } from './types';

type RailIcon = ComponentType<{ className?: string }>;

const ICONS: Record<GameShellRailActionModel['id'], RailIcon> = {
  undo: IconUndo,
  rules: IconHelp,
  scores: IconScores,
  more: IconMore,
};

const SHORT_LABELS: Record<GameShellRailActionModel['id'], string> = {
  undo: 'Undo',
  rules: 'Rules',
  scores: 'Scores',
  more: 'More',
};

export function GameShellBottomBar({ model }: { model: GameShellBottomBarModel }) {
  return (
    <nav className="game-shell-bottom-bar" data-testid="game-shell-bottom-bar" aria-label="Match">
      {model.actions.map((action) => {
        const Icon = ICONS[action.id];
        const short = SHORT_LABELS[action.id];
        return (
          <button
            key={action.id}
            type="button"
            className={`game-shell-bottom-bar__item${action.pressed ? ' is-pressed' : ''}`}
            data-testid={`game-shell-bottom-${action.id}`}
            aria-label={action.label}
            aria-pressed={action.pressed}
            disabled={action.disabled}
            onClick={action.onClick ?? (() => undefined)}
          >
            <Icon className="game-shell-bottom-bar__icon" />
            <span className="game-shell-bottom-bar__label">{short}</span>
          </button>
        );
      })}
    </nav>
  );
}
