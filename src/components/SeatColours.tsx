import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { colourForPlayer, contrastingInk } from '../lib/seatColours';
import type { SeatColour } from '../lib/storage';

type SeatColoursValue = {
  colours: readonly (SeatColour | undefined)[];
};

const SeatColoursContext = createContext<SeatColoursValue | null>(null);

export function SeatColoursProvider({
  colours,
  children,
}: {
  colours: readonly (SeatColour | undefined)[];
  children: ReactNode;
}) {
  const value = useMemo(() => ({ colours }), [colours]);
  return <SeatColoursContext.Provider value={value}>{children}</SeatColoursContext.Provider>;
}

export function useSeatColour(player: string | number): SeatColour | undefined {
  const ctx = useContext(SeatColoursContext);
  if (!ctx) return undefined;
  return colourForPlayer(ctx.colours, player);
}

export function useSeatColourStyle(
  player: string | number,
): { background: string; color: string } | undefined {
  const colour = useSeatColour(player);
  if (!colour) return undefined;
  return { background: colour, color: contrastingInk(colour) };
}
