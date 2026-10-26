import type { GameShellRailActionModel } from './types';

export function shellSheetActions(
  open: 'rules' | 'scores' | 'menu' | null,
  handlers: {
    onRules?: () => void;
    onScores?: () => void;
    onMenu?: () => void;
    onUndo?: () => void;
    undoDisabled?: boolean;
  },
): GameShellRailActionModel[] {
  return [
    {
      id: 'undo',
      label: 'Undo',
      disabled: handlers.undoDisabled ?? true,
      onClick: handlers.onUndo,
    },
    {
      id: 'rules',
      label: 'Rules',
      pressed: open === 'rules',
      onClick: handlers.onRules,
    },
    {
      id: 'scores',
      label: 'Scores',
      pressed: open === 'scores',
      onClick: handlers.onScores,
    },
    {
      id: 'more',
      label: 'More',
      pressed: open === 'menu',
      onClick: handlers.onMenu,
    },
  ];
}
