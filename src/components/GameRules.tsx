import type { ReactNode } from 'react';

/** Collapsed rules copy for in-game help. */
export function GameRules({
  title = 'How scoring works',
  children,
  testId,
}: {
  title?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <details className="game-rules" data-testid={testId}>
      <summary className="game-rules__summary">{title}</summary>
      <div className="game-rules__body">{children}</div>
    </details>
  );
}
