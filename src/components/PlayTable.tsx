import type { ReactNode } from 'react';

/** Shared in-play layout: info (top), board (fills), optional pew (bottom hand/actions). */
export function PlayTable({
  info,
  board,
  pew,
  actions,
}: {
  info: ReactNode;
  board: ReactNode;
  pew?: ReactNode;
  /** Sticky thumb-zone for shared ActionSurface (or equivalent). */
  actions?: ReactNode;
}) {
  const showPew = pew != null || actions != null;

  return (
    <div className="play-table" data-testid="play-table">
      <div className="play-table__info">{info}</div>
      <div className="play-table__board">{board}</div>
      {showPew ? (
        <div className="play-table__pew">
          {pew != null ? <div className="play-table__pew-body">{pew}</div> : null}
          {actions != null ? (
            <div className="play-table__actions" data-testid="play-table-actions">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
