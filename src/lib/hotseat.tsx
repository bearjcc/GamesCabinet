import type { BoardProps } from 'boardgame.io/react';
import { type ComponentType, useEffect } from 'react';

export function withHotseatSeatSync(
  Board: ComponentType<BoardProps>,
  onSeat: (id: string) => void,
  shouldTakeSeat: (playerID: string) => boolean = () => true,
) {
  return function HotseatBoard(props: BoardProps) {
    useEffect(() => {
      if (props.ctx.gameover) return;
      if (!shouldTakeSeat(props.ctx.currentPlayer)) return;
      onSeat(props.ctx.currentPlayer);
    }, [props.ctx.currentPlayer, props.ctx.gameover]);
    return <Board {...props} />;
  };
}
