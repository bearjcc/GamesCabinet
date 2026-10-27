import type { FilteredMetadata } from 'boardgame.io';
import { useCallback } from 'react';
import { useSeatNameOverrides } from '../components/SeatNameOverrides';
import { playerDisplayName } from './matchPlayers';

/** Lobby / bot / hot-seat labels merged with playerDisplayName. */
export function usePlayerDisplayName(): (playerID: string, matchData?: FilteredMetadata) => string {
  const overrides = useSeatNameOverrides();
  return useCallback(
    (playerID: string, matchData?: FilteredMetadata) =>
      playerDisplayName(playerID, { matchData, nameForPlayer: overrides }),
    [overrides],
  );
}
