import type { BoardProps } from 'boardgame.io/react';
import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';

/** Minimum time a hot-seat turn banner stays readable before the seat switches. */
export const HOTSEAT_TURN_HOLD_MS = 1600;

const HotseatContext = createContext(false);

/** True inside pass-and-play boards wrapped by withHotseatSeatSync. */
export function useHotseat(): boolean {
  return useContext(HotseatContext);
}

export function HotseatProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <HotseatContext.Provider value={value}>{children}</HotseatContext.Provider>;
}

/**
 * Pass-and-play: align the viewed seat with ctx.currentPlayer before paint and
 * pass the effective seat into the board so status never flashes "their turn".
 * Seat switches in the shell wait briefly so the prior turn banner stays readable.
 */
export function withHotseatSeatSync(
  Board: ComponentType<BoardProps>,
  onSeat: (id: string) => void,
  shouldTakeSeat: (playerID: string) => boolean = () => true,
) {
  return function HotseatBoard(props: BoardProps) {
    const { ctx, playerID } = props;
    const takeSeat = !ctx.gameover && shouldTakeSeat(ctx.currentPlayer);
    const effectivePlayerID = takeSeat ? ctx.currentPlayer : playerID;
    const prevPlayerRef = useRef<string | null>(null);

    useLayoutEffect(() => {
      if (!takeSeat) return;

      const current = ctx.currentPlayer;
      if (playerID === current) {
        prevPlayerRef.current = current;
        return;
      }

      if (prevPlayerRef.current === null) {
        prevPlayerRef.current = current;
        onSeat(current);
        return;
      }

      if (prevPlayerRef.current === current) return;

      prevPlayerRef.current = current;
      const timer = window.setTimeout(() => onSeat(current), HOTSEAT_TURN_HOLD_MS);
      return () => window.clearTimeout(timer);
    }, [takeSeat, playerID, ctx.currentPlayer]);

    const isActive = !ctx.gameover && effectivePlayerID === ctx.currentPlayer;

    return (
      <HotseatContext.Provider value={true}>
        <Board {...props} playerID={effectivePlayerID} isActive={isActive} />
      </HotseatContext.Provider>
    );
  };
}
