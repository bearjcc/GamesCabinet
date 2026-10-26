import { BoardStage } from './BoardStage';
import { GameShellBottomBar } from './GameShellBottomBar';
import { GameShellRail } from './GameShellRail';
import { HandTray } from './HandTray';
import type { GameShellConfig, GameShellSlots } from './types';

export type GameShellProps = GameShellConfig & GameShellSlots;

export function GameShell({
  rail,
  stage,
  bottomBar,
  tray,
  testId = 'game-shell',
  board,
  trayContent,
  underBoard,
  overlay,
  rulesSheet,
  scoresSheet,
  menuSheet,
}: GameShellProps) {
  const bar = bottomBar ?? { actions: rail.actions };
  return (
    <div className="game-shell" data-testid={testId}>
      <GameShellRail model={rail} />
      <BoardStage model={stage} board={board} underBoard={underBoard} overlay={overlay} />
      {tray && trayContent ? <HandTray model={tray}>{trayContent}</HandTray> : null}
      <GameShellBottomBar model={bar} />
      {rulesSheet ? (
        <div className="game-shell-sheet" data-testid="game-shell-rules-sheet">
          {rulesSheet}
        </div>
      ) : null}
      {scoresSheet ? (
        <div className="game-shell-sheet" data-testid="game-shell-scores-sheet">
          {scoresSheet}
        </div>
      ) : null}
      {menuSheet ? (
        <div className="game-shell-sheet" data-testid="game-shell-menu-sheet">
          {menuSheet}
        </div>
      ) : null}
    </div>
  );
}
