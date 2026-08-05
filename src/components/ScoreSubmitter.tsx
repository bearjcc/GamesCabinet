import { useEffect, useState } from 'react';
import { decidePendingSubmit, postPendingScore } from '../lib/scoreSubmit';
import type { SubmitScoreInput } from '../lib/scores';

type Props = {
  gameId: string;
  pendingSubmit?: SubmitScoreInput | null;
  onSubmitted?: () => void;
  onError?: (message: string) => void;
};

/** Always-mounted score poster; UI boards keep this outside tab switches. */
export function ScoreSubmitter({ gameId, pendingSubmit = null, onSubmitted, onError }: Props) {
  const [postedKey, setPostedKey] = useState<string | null>(null);

  useEffect(() => {
    const decision = decidePendingSubmit(pendingSubmit, postedKey);
    if (decision.action === 'skip') return;
    setPostedKey(decision.key);
    void (async () => {
      try {
        await postPendingScore(gameId, decision.payload);
        onSubmitted?.();
      } catch {
        onError?.('Could not reach the leaderboard.');
      }
    })();
  }, [gameId, onError, onSubmitted, pendingSubmit, postedKey]);

  return null;
}
