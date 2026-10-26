import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useTracksLayout } from '../games/tracks/useTracksLayout';

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
  felt?: boolean | 'blue' | 'tracks';
  /** Reserve pew height so actions appearing never shrink the board. */
  reservePew?: boolean;
}) {
  const showPewBody = pew != null;
  const reserveActions = reservePew || actions != null;
  const showPew = showPewBody || reserveActions;
  const className = [
    'play-table',
    felt ? 'play-table--felt' : '',
    felt === 'blue' ? 'play-table--felt-blue' : '',
    felt === 'tracks' ? 'play-table--tracks-grass' : '',
    reservePew ? 'play-table--reserve-pew' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const infoRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pewRef = useRef<HTMLDivElement>(null);
  const tracksLayout = useTracksLayout(felt === 'tracks', {
    infoRef,
    fieldRef,
    pewRef,
  });

  if (felt === 'tracks') {
    return (
      <div
        className={className}
        data-testid="play-table"
        style={tracksLayout.vars}
        data-tracks-cell-px={tracksLayout.cellPx}
      >
        <div ref={infoRef} className="play-table__info play-table__info--tracks">
          {info}
        </div>
        <div
          ref={fieldRef}
          className="tracks-grass-field"
          data-testid="tracks-grass-field"
          style={tracksLayout.vars}
        >
          <div className="play-table__board">{board}</div>
          {showPew ? (
            <div ref={pewRef} className="play-table__pew play-table__pew--tracks">
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
      </div>
    );
  }

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
