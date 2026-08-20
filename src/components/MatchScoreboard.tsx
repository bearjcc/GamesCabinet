import type { ReactNode } from 'react';

export type MatchScore = {
  label: string;
  value: ReactNode;
};

export function formatMatchScore(scores: MatchScore[]): string[] {
  return scores.map(({ label, value }) => `${label} ${String(value)}`);
}

/** Shared compact score/resource strip for in-play match information. */
export function MatchScoreboard({
  scores,
  testId = 'match-scoreboard',
}: {
  scores: MatchScore[];
  testId?: string;
}) {
  return (
    <div className="match-scoreboard" data-testid={testId} role="group" aria-label="Match scores">
      {scores.map(({ label, value }) => (
        <span key={label} className="match-scoreboard__item">
          <span className="match-scoreboard__label">{label}</span>{' '}
          <strong className="match-scoreboard__value">{value}</strong>
        </span>
      ))}
    </div>
  );
}
