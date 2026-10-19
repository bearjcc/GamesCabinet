import type { BoardProps } from 'boardgame.io/react';

type MatchData = BoardProps<unknown>['matchData'];

/** Seat name when known, otherwise a caller-supplied fallback label. */
export function playerSeatLabel(
  player: string | number,
  matchData: MatchData | undefined,
  fallback: string,
): string {
  const name = matchData?.[Number(player)]?.name?.trim();
  return name || fallback;
}
