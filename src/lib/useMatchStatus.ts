import type { FilteredMetadata } from 'boardgame.io';
import { useHotseat } from './hotseat';
import {
  type DeriveMatchStatusOptions,
  defaultSeatLabel,
  deriveMatchStatus,
  type MatchStatus,
  type MatchStatusCtx,
} from './matchStatus';

function seatLabelFromMatchData(matchData: FilteredMetadata | undefined) {
  return (playerId: string) => {
    const name = matchData?.[Number(playerId)]?.name?.trim();
    return name || defaultSeatLabel(playerId);
  };
}

/** Merge hot-seat seat labels into deriveMatchStatus options. */
export function withHotseatStatusOptions(
  hotseat: boolean,
  options?: DeriveMatchStatusOptions,
  matchData?: FilteredMetadata,
): DeriveMatchStatusOptions {
  const seatLabel = hotseat
    ? (options?.seatLabel ?? seatLabelFromMatchData(matchData))
    : options?.seatLabel;
  return { ...options, seatLabel };
}

/** deriveMatchStatus with pass-and-play seat names when wrapped by withHotseatSeatSync. */
export function useMatchStatus(
  ctx: MatchStatusCtx,
  playerID: string | null | undefined,
  options?: DeriveMatchStatusOptions,
  matchData?: FilteredMetadata,
): MatchStatus {
  const hotseat = useHotseat();
  return deriveMatchStatus(ctx, playerID, withHotseatStatusOptions(hotseat, options, matchData));
}
