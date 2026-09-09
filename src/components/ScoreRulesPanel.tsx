import type { ReactNode } from 'react';

/** Collapsed-by-default scoring rules — expands over the board without shifting layout. */
export function ScoreRulesPanel({
  summary,
  children,
  testId = 'score-rules',
}: {
  summary: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <details className="score-rules" data-testid={testId}>
      <summary className="score-rules__toggle">{summary}</summary>
      <div className="score-rules__body">{children}</div>
    </details>
  );
}
