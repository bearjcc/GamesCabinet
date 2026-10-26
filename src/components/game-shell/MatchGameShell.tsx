import type { ReactNode } from 'react';
import type { StatusTone } from '../../lib/matchStatus';
import { GameShell } from './GameShell';
import { RulesPanel } from './RulesPanel';
import { turnPlateFromMatchStatus } from './turnPlate';
import type { BoardStageModel, HandTrayModel, TurnPlateModel } from './types';
import { useShellSheets } from './useShellSheets';

export type MatchGameShellProps = {
  gameTitle: string;
  ctx: { gameover?: unknown };
  status: { text: string; tone: StatusTone };
  /** Turn plate heading; defaults to the name before "'s turn" in status text. */
  turnName?: string;
  turnPlate?: TurnPlateModel | null;
  stage?: BoardStageModel;
  board: ReactNode;
  tray?: HandTrayModel | null;
  trayContent?: ReactNode;
  underBoard?: ReactNode;
  overlay?: ReactNode;
  rules?: { title?: string; body: ReactNode; testId?: string };
  scoresSheet?: ReactNode;
  menuSheet?: ReactNode;
  railMeta?: ReactNode;
  undo?: { disabled?: boolean; onUndo?: () => void };
  onScores?: () => void;
};

function turnNameFromStatus(text: string): string {
  const match = /^(.+?)'s turn/.exec(text);
  return match?.[1]?.trim() || text;
}

export function MatchGameShell({
  gameTitle,
  ctx,
  status,
  turnName,
  turnPlate: turnPlateOverride,
  stage = { felt: 'green' },
  board,
  tray,
  trayContent,
  underBoard,
  overlay,
  rules,
  scoresSheet,
  menuSheet,
  railMeta,
  undo,
  onScores,
}: MatchGameShellProps) {
  const { sheet, actions } = useShellSheets({
    onUndo: undo?.onUndo,
    undoDisabled: undo?.disabled ?? true,
    onScores,
  });

  const resolvedTurnPlate =
    turnPlateOverride === undefined
      ? ctx.gameover || status.tone === 'done'
        ? null
        : turnPlateFromMatchStatus(status, turnName ?? turnNameFromStatus(status.text))
      : turnPlateOverride;

  return (
    <>
      {ctx.gameover ? (
        <p className="sr-only" role="status" data-testid="match-status">
          {status.text}
        </p>
      ) : null}
      <GameShell
        rail={{
          gameTitle,
          meta: railMeta,
          turnPlate: resolvedTurnPlate,
          actions,
        }}
        stage={stage}
        tray={tray}
        board={board}
        trayContent={trayContent}
        underBoard={underBoard}
        overlay={overlay}
        rulesSheet={
          sheet === 'rules' && rules ? (
            <RulesPanel
              model={{
                title: rules.title ?? gameTitle,
                testId: rules.testId,
                body: rules.body,
              }}
            />
          ) : null
        }
        scoresSheet={sheet === 'scores' ? scoresSheet : null}
        menuSheet={sheet === 'menu' ? menuSheet : null}
      />
    </>
  );
}
