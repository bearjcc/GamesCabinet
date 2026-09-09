import type { ReactNode } from 'react';
import { ScoreRulesPanel } from './ScoreRulesPanel';

export type MatchScore = {
  label: string;
  value: ReactNode;
};

export type MatchScoreRules = {
  summary: string;
  body: ReactNode;
  testId?: string;
};

export function formatMatchScore(scores: MatchScore[]): string[] {
  return scores.map(({ label, value }) => `${label} ${String(value)}`);
}

/** Shared compact score/resource strip for in-play match information. */
export function MatchScoreboard({
  scores,
  rules,
  testId = 'match-scoreboard',
}: {
  scores: MatchScore[];
  rules?: MatchScoreRules;
  testId?: string;
}) {
  return (
    <div className="match-scoreboard-wrap">
      <div className="match-scoreboard" data-testid={testId} role="group" aria-label="Match scores">
        {scores.map(({ label, value }) => (
          <span key={label} className="match-scoreboard__item">
            <span className="match-scoreboard__label">{label}</span>{' '}
            <strong className="match-scoreboard__value">{value}</strong>
          </span>
        ))}
      </div>
      {rules ? (
        <ScoreRulesPanel summary={rules.summary} testId={rules.testId ?? `${testId}-rules`}>
          {rules.body}
        </ScoreRulesPanel>
      ) : null}
    </div>
  );
}
