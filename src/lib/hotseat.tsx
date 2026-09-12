import type { BoardProps } from 'boardgame.io/react';
import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
} from 'react';

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

    useLayoutEffect(() => {
      if (takeSeat && playerID !== ctx.currentPlayer) {
        onSeat(ctx.currentPlayer);
      }
    }, [takeSeat, playerID, ctx.currentPlayer]);

    const isActive = !ctx.gameover && effectivePlayerID === ctx.currentPlayer;

    return (
      <HotseatContext.Provider value={true}>
        <Board {...props} playerID={effectivePlayerID} isActive={isActive} />
      </HotseatContext.Provider>
    );
  };
}
