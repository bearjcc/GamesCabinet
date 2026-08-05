import { useCallback, useEffect, useState } from 'react';
import { fetchScores, type ScoreEntry } from '../lib/scores';

type Props = {
  gameId: string;
  testIdPrefix?: string;
};

export function LeaderboardPanel({ gameId, testIdPrefix = 'lb' }: Props) {
  const [dailyScores, setDailyScores] = useState<ScoreEntry[]>([]);
  const [allScores, setAllScores] = useState<ScoreEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [daily, all] = await Promise.all([
        fetchScores(gameId, 'daily'),
        fetchScores(gameId, 'all'),
      ]);
      setDailyScores(daily);
      setAllScores(all);
      setMessage(null);
    } catch {
      setMessage('Could not reach the leaderboard.');
    }
  }, [gameId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="lb-scores" data-testid={`${testIdPrefix}-scores`}>
      {message ? <p className="lb-message">{message}</p> : null}
      <section>
        <h3>Today</h3>
        <ScoreList entries={dailyScores} empty="No scores yet today." />
      </section>
      <section>
        <h3>All time</h3>
        <ScoreList entries={allScores} empty="No scores yet." />
      </section>
    </div>
  );
}

function ScoreList({ entries, empty }: { entries: ScoreEntry[]; empty: string }) {
  if (entries.length === 0) return <p className="lw-scores-empty">{empty}</p>;
  return (
    <ol className="lw-score-list">
      {entries.map((e, i) => (
        <li key={e.id}>
          <span className="lw-score-rank">#{i + 1}</span>
          <span className="lw-score-name">{e.playerName}</span>
          <span className="lw-score-value">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
