import type { ReactNode } from 'react';

/** Shared in-play layout: info (top), board (fills), optional pew (bottom hand/actions). */
export function PlayTable({
  info,
  board,
  pew,
  actions,
  felt = false,
  reservePew = false,
}: {
  info: ReactNode;
  board: ReactNode;
  pew?: ReactNode;
  /** Sticky thumb-zone for shared ActionSurface (or equivalent). */
  actions?: ReactNode;
  /** Page background is the felt table; no inner panel behind cards/tiles. */
  felt?: boolean;
  /** Reserve pew height so actions appearing never shrink the board. */
  reservePew?: boolean;
}) {
  const showPewBody = pew != null;
  const reserveActions = reservePew || actions != null;
  const showPew = showPewBody || reserveActions;
  const className = [
    'play-table',
    felt ? 'play-table--felt' : '',
    reservePew ? 'play-table--reserve-pew' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} data-testid="play-table">
      <div className="play-table__info">{info}</div>
      <div className="play-table__board">{board}</div>
      {showPew ? (
        <div className="play-table__pew">
          {showPewBody ? <div className="play-table__pew-body">{pew}</div> : null}
          <div
            className="play-table__actions"
            data-testid="play-table-actions"
            data-has-actions={actions != null ? 'true' : 'false'}
          >
            {actions ?? null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
