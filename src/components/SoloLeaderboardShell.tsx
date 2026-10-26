import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { StatusTone } from '../lib/matchStatus';
import type { SubmitScoreInput } from '../lib/scores';
import { GameShell, RulesPanel, shellSheetActions } from './game-shell';
import { turnPlateFromMatchStatus } from './game-shell/turnPlate';
import type { BoardStageModel, HandTrayModel, TurnPlateModel } from './game-shell/types';
import { useShellSheets } from './game-shell/useShellSheets';
import { LeaderboardPanel } from './LeaderboardPanel';
import { ScoreSubmitter } from './ScoreSubmitter';
import { type SoloPlayTab, SoloPlayTabs } from './SoloPlayTabs';

/** Shared play/scores layout for solo games with a leaderboard. */
export function SoloLeaderboardShell({
  gameId,
  gameTitle,
  pendingSubmit,
  tab,
  onTabChange,
  testIdPrefix,
  showTabs = true,
  info,
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
  turnName,
  turnPlate: turnPlateOverride,
  gameover,
  rules,
}: {
  gameId: string;
  gameTitle: string;
  pendingSubmit?: SubmitScoreInput | null;
  tab: SoloPlayTab;
  onTabChange: (tab: SoloPlayTab) => void;
  testIdPrefix: string;
  showTabs?: boolean;
  /** Legacy chrome in the rail meta until callers migrate to Scoreboard and shell actions. */
  info?: ReactNode;
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
  turnName?: string;
  turnPlate?: TurnPlateModel | null;
  gameover?: unknown;
  rules?: { title?: string; body: ReactNode; testId?: string };
}) {
  const { sheet, setSheet } = useShellSheets({
    onUndo: undo?.onUndo,
    undoDisabled: undo?.disabled ?? true,
    onScores: () => onTabChange(tab === 'scores' ? 'play' : 'scores'),
  });

  useEffect(() => {
    if (tab === 'scores') setSheet('scores');
    else if (sheet === 'scores') setSheet(null);
  }, [tab, sheet, setSheet]);

  const railActions = shellSheetActions(tab === 'scores' ? 'scores' : sheet, {
    onRules: () => setSheet((s) => (s === 'rules' ? null : 'rules')),
    onScores: () => onTabChange(tab === 'scores' ? 'play' : 'scores'),
    onMenu: () => setSheet((s) => (s === 'menu' ? null : 'menu')),
    onUndo: undo?.onUndo,
    undoDisabled: undo?.disabled ?? true,
  });

  const showPlayChrome = tab === 'play';
  const trayModel =
    tray ?? (pew || actions || reservePew ? { testId: `${testIdPrefix}-tray` } : null);

  const resolvedTurnPlate =
    turnPlateOverride === undefined
      ? status && !gameover && status.tone !== 'done'
        ? turnPlateFromMatchStatus(status, turnName ?? status.text)
        : null
      : turnPlateOverride;

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
          turnPlate: showPlayChrome ? resolvedTurnPlate : null,
          meta: (
            <>
              {info}
              {showTabs ? (
                <SoloPlayTabs value={tab} onChange={onTabChange} testIdPrefix={testIdPrefix} />
              ) : null}
            </>
          ),
          actions: railActions,
        }}
        stage={stage}
        board={
          tab === 'scores'
            ? (scoresSheet ?? <LeaderboardPanel gameId={gameId} testIdPrefix={testIdPrefix} />)
            : board
        }
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
      />
    </>
  );
}
