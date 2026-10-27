import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { BOT_SEAT_NAME } from '../lib/lobby';

const SeatNameOverridesContext = createContext<
  ((playerID: string) => string | undefined) | undefined
>(undefined);

export function SeatNameOverridesProvider({
  botPlayerIds,
  seatLabels,
  children,
}: {
  botPlayerIds?: readonly string[];
  /** Indexed labels for local hot-seat (`?names=`). */
  seatLabels?: readonly string[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const bots = botPlayerIds?.length ? new Set(botPlayerIds) : null;
    const hasLabels = seatLabels?.some((l) => l.trim());
    if (!bots && !hasLabels) return undefined;
    return (playerID: string) => {
      if (bots?.has(playerID)) return BOT_SEAT_NAME;
      const index = Number(playerID);
      if (hasLabels && Number.isFinite(index) && seatLabels![index]?.trim()) {
        return seatLabels![index]!.trim();
      }
      return undefined;
    };
  }, [botPlayerIds, seatLabels]);

  return (
    <SeatNameOverridesContext.Provider value={value}>{children}</SeatNameOverridesContext.Provider>
  );
}

export function useSeatNameOverrides(): ((playerID: string) => string | undefined) | undefined {
  return useContext(SeatNameOverridesContext);
}
