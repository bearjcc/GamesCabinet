import type { ComponentType } from 'react';
import { IconButton } from '../IconControl';
import { IconHelp, IconMore, IconScores, IconUndo } from '../icons';
import type { GameShellBottomBarModel, GameShellRailActionModel } from './types';

type RailIcon = ComponentType<{ className?: string }>;

const ICONS: Record<GameShellRailActionModel['id'], RailIcon> = {
  undo: IconUndo,
  rules: IconHelp,
  scores: IconScores,
  more: IconMore,
};

export function GameShellBottomBar({ model }: { model: GameShellBottomBarModel }) {
  return (
    <nav className="game-shell-bottom-bar" data-testid="game-shell-bottom-bar" aria-label="Match">
      {model.actions.map((action) => {
        const Icon = ICONS[action.id];
        return (
          <IconButton
            key={action.id}
            label={action.label}
            testId={`game-shell-bottom-${action.id}`}
            disabled={action.disabled}
            pressed={action.pressed}
            onClick={action.onClick ?? (() => undefined)}
          >
            <Icon />
          </IconButton>
        );
      })}
    </nav>
  );
}
