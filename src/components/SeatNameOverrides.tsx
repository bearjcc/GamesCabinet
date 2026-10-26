import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { BOT_SEAT_NAME } from '../lib/lobby';

const SeatNameOverridesContext = createContext<
  ((playerID: string) => string | undefined) | undefined
>(undefined);

export function SeatNameOverridesProvider({
  botPlayerIds,
  children,
}: {
  botPlayerIds?: readonly string[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    if (!botPlayerIds?.length) return undefined;
    const bots = new Set(botPlayerIds);
    return (playerID: string) => (bots.has(playerID) ? BOT_SEAT_NAME : undefined);
  }, [botPlayerIds]);

  return (
    <SeatNameOverridesContext.Provider value={value}>{children}</SeatNameOverridesContext.Provider>
  );
}

export function useSeatNameOverrides(): ((playerID: string) => string | undefined) | undefined {
  return useContext(SeatNameOverridesContext);
}
