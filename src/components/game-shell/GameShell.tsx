import { useRef } from 'react';
import { useTracksLayout } from '../../games/tracks/useTracksLayout';
import { GameShellEndStripMount } from '../MatchChromeEndStrip';
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
  const tracksGrass = stage.felt === 'tracks';
  const railRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pewRef = useRef<HTMLDivElement>(null);
  const tracksLayout = useTracksLayout(tracksGrass, {
    infoRef: railRef,
    fieldRef,
    pewRef,
  });

  const stageNode = (
    <BoardStage model={stage} board={board} underBoard={underBoard} overlay={overlay} />
  );

  const trayNode =
    tray && trayContent ? (
      <div ref={pewRef}>
        <HandTray model={tray}>{trayContent}</HandTray>
      </div>
    ) : null;

  return (
    <div
      className={tracksGrass ? 'game-shell game-shell--tracks' : 'game-shell'}
      data-testid={testId}
      style={tracksGrass ? tracksLayout.vars : undefined}
      data-tracks-cell-px={tracksGrass ? tracksLayout.cellPx : undefined}
    >
      <div ref={railRef}>
        <GameShellRail model={rail} />
      </div>
      {tracksGrass ? (
        <div
          ref={fieldRef}
          className="tracks-grass-field game-shell-tracks-field"
          data-testid="tracks-grass-field"
          style={tracksLayout.vars}
        >
          {stageNode}
          {trayNode}
        </div>
      ) : (
        <>
          {stageNode}
          {trayNode}
        </>
      )}
      <GameShellEndStripMount />
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
