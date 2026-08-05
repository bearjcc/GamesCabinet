import type { FilteredMetadata } from 'boardgame.io';

export type SeatSummary = {
  total: number;
  filled: number;
  full: boolean;
  labels: string[];
};

/** Summarise lobby seats from boardgame.io matchData. */
export function summariseSeats(matchData: FilteredMetadata | undefined): SeatSummary | null {
  if (!matchData?.length) return null;
  const labels = matchData.map((seat, i) => seat.name?.trim() || `Seat ${i + 1} open`);
  const filled = matchData.filter((seat) => Boolean(seat.name?.trim())).length;
  return {
    total: matchData.length,
    filled,
    full: filled >= matchData.length,
    labels,
  };
}

export function roomShareUrl(
  gameId: string,
  matchID: string,
  origin = window.location.origin,
): string {
  return `${origin}/g/${gameId}/${matchID}`;
}
