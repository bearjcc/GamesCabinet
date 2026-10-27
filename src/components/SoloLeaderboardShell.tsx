import type { ReactNode } from 'react';
import type { StatusTone } from '../lib/matchStatus';
import type { SubmitScoreInput } from '../lib/scores';
import { GameShell, RulesPanel, shellSheetActions } from './game-shell';
import { GameShellMenuSheet } from './game-shell/GameShellMenuSheet';
import { quietHintFromStatus } from './game-shell/turnPlate';
import type { BoardStageModel, HandTrayModel, TurnPlateModel } from './game-shell/types';
import { useShellSheets } from './game-shell/useShellSheets';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ScoreSubmitter } from './ScoreSubmitter';

/** Shared play/scores layout for solo games with a leaderboard. */
export function SoloLeaderboardShell({
  gameId,
  gameTitle,
  pendingSubmit,
  tab,
  onTabChange,
  testIdPrefix,
  meta,
  quietHint,
  board,
  pew,
  actions,
  tray,
  onSubmitted,
  onError,
  stage = { felt: 'green' },
  reservePew = false,
  scoresSheet,
  undo,
  status,
  turnPlate: turnPlateOverride = null,
  gameover,
  rules,
}: {
  gameId: string;
  gameTitle: string;
  pendingSubmit?: SubmitScoreInput | null;
  tab: 'play' | 'scores';
  onTabChange: (tab: 'play' | 'scores') => void;
  testIdPrefix: string;
  meta?: ReactNode;
  quietHint?: string;
  board: ReactNode;
  pew?: ReactNode;
  actions?: ReactNode;
  tray?: HandTrayModel | null;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
  stage?: BoardStageModel;
  reservePew?: boolean;
  scoresSheet?: ReactNode;
  undo?: { disabled?: boolean; onUndo?: () => void };
  status?: { text: string; tone: StatusTone };
  turnPlate?: TurnPlateModel | null;
  gameover?: unknown;
  rules?: { title?: string; body: ReactNode; testId?: string };
}) {
  const { sheet, setSheet } = useShellSheets({
    onUndo: undo?.onUndo,
    undoDisabled: undo?.disabled ?? true,
    onScores: () => onTabChange(tab === 'scores' ? 'play' : 'scores'),
  });

  const railActions = shellSheetActions(sheet, {
    onRules: () => setSheet((s) => (s === 'rules' ? null : 'rules')),
    onScores: () => {
      setSheet((s) => {
        const next = s === 'scores' ? null : 'scores';
        onTabChange(next === 'scores' ? 'scores' : 'play');
        return next;
      });
    },
    onMenu: () => setSheet((s) => (s === 'menu' ? null : 'menu')),
    onUndo: undo?.onUndo,
    undoDisabled: undo?.disabled ?? true,
  });

  const showPlayChrome = tab === 'play';
  const trayModel =
    tray ?? (pew || actions || reservePew ? { testId: `${testIdPrefix}-tray` } : null);

  const resolvedQuietHint =
    quietHint ?? (status && showPlayChrome ? quietHintFromStatus(status, quietHint) : undefined);

  return (
    <>
      {gameover && status ? (
        <p className="sr-only" role="status" data-testid="match-status">
          {status.text}
        </p>
      ) : null}
      <ScoreSubmitter
        gameId={gameId}
        pendingSubmit={pendingSubmit}
        onSubmitted={onSubmitted}
        onError={onError}
      />
      <GameShell
        rail={{
          gameTitle,
          meta,
          quietHint: resolvedQuietHint,
          turnPlate: showPlayChrome ? turnPlateOverride : null,
          actions: railActions,
        }}
        stage={stage}
        board={board}
        tray={showPlayChrome ? trayModel : null}
        trayContent={
          showPlayChrome ? (
            <>
              {pew}
              {actions}
            </>
          ) : null
        }
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
        scoresSheet={
          sheet === 'scores'
            ? (scoresSheet ?? <LeaderboardPanel gameId={gameId} testIdPrefix={testIdPrefix} />)
            : null
        }
        menuSheet={sheet === 'menu' ? <GameShellMenuSheet /> : null}
      />
    </>
  );
}
