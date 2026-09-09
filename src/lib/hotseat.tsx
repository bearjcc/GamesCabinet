import type { BoardProps } from 'boardgame.io/react';
import { type ComponentType, useEffect, useRef } from 'react';

/** Minimum time a hot-seat turn banner stays readable before the seat switches. */
export const HOTSEAT_TURN_HOLD_MS = 1600;

export function withHotseatSeatSync(
  Board: ComponentType<BoardProps>,
  onSeat: (id: string) => void,
  shouldTakeSeat: (playerID: string) => boolean = () => true,
) {
  return function HotseatBoard(props: BoardProps) {
    const prevPlayerRef = useRef<string | null>(null);

    useEffect(() => {
      if (props.ctx.gameover) return;
      if (!shouldTakeSeat(props.ctx.currentPlayer)) return;

      const current = props.ctx.currentPlayer;
      if (prevPlayerRef.current === null) {
        prevPlayerRef.current = current;
        onSeat(current);
        return;
      }
      if (prevPlayerRef.current === current) return;

      prevPlayerRef.current = current;
      const timer = window.setTimeout(() => onSeat(current), HOTSEAT_TURN_HOLD_MS);
      return () => window.clearTimeout(timer);
    }, [props.ctx.currentPlayer, props.ctx.gameover]);

    return <Board {...props} />;
  };
}
