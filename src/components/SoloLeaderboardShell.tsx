import type { ReactNode } from 'react';
import type { SubmitScoreInput } from '../lib/scores';
import { LeaderboardPanel } from './LeaderboardPanel';
import { PlayTable } from './PlayTable';
import { ScoreSubmitter } from './ScoreSubmitter';
import { type SoloPlayTab, SoloPlayTabs } from './SoloPlayTabs';

/** Shared play/scores layout for solo games with a leaderboard. */
export function SoloLeaderboardShell({
  gameId,
  pendingSubmit,
  tab,
  onTabChange,
  testIdPrefix,
  showTabs = true,
  info,
  board,
  pew,
  actions,
  onSubmitted,
  onError,
}: {
  gameId: string;
  pendingSubmit?: SubmitScoreInput | null;
  tab: SoloPlayTab;
  onTabChange: (tab: SoloPlayTab) => void;
  testIdPrefix: string;
  /** When false, callers supply their own scores navigation (e.g. compact toolbar). */
  showTabs?: boolean;
  info: ReactNode;
  board: ReactNode;
  pew?: ReactNode;
  actions?: ReactNode;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
}) {
  const showPlayChrome = tab === 'play';

  return (
    <>
      <ScoreSubmitter
        gameId={gameId}
        pendingSubmit={pendingSubmit}
        onSubmitted={onSubmitted}
        onError={onError}
      />
      <PlayTable
        info={
          <>
            {info}
            {showTabs ? (
              <SoloPlayTabs value={tab} onChange={onTabChange} testIdPrefix={testIdPrefix} />
            ) : null}
          </>
        }
        board={
          tab === 'scores' ? (
            <LeaderboardPanel gameId={gameId} testIdPrefix={testIdPrefix} />
          ) : (
            board
          )
        }
        pew={showPlayChrome ? pew : undefined}
        actions={showPlayChrome ? actions : undefined}
      />
    </>
  );
}
