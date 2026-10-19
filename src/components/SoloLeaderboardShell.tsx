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
  info,
  board,
  pew,
  actions,
  onSubmitted,
  onError,
  felt = false,
  reservePew = false,
}: {
  gameId: string;
  pendingSubmit?: SubmitScoreInput | null;
  tab: SoloPlayTab;
  onTabChange: (tab: SoloPlayTab) => void;
  testIdPrefix: string;
  info: ReactNode;
  board: ReactNode;
  pew?: ReactNode;
  actions?: ReactNode;
  felt?: boolean;
  reservePew?: boolean;
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
        felt={felt}
        reservePew={reservePew}
        info={
          <>
            {info}
            <SoloPlayTabs value={tab} onChange={onTabChange} testIdPrefix={testIdPrefix} />
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
