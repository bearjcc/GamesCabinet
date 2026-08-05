import type { ReactNode } from 'react';

/** Shared in-play layout: info (top), board (fills), optional pew (bottom hand/actions). */
export function PlayTable({
  info,
  board,
  pew,
}: {
  info: ReactNode;
  board: ReactNode;
  pew?: ReactNode;
}) {
  return (
    <div className="play-table" data-testid="play-table">
      <div className="play-table__info">{info}</div>
      <div className="play-table__board">{board}</div>
      {pew != null ? <div className="play-table__pew">{pew}</div> : null}
    </div>
  );
}
