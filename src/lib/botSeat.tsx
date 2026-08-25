import type { FilteredMetadata, Game } from 'boardgame.io';
import type { BoardProps } from 'boardgame.io/react';
import { useEffect } from 'react';
import { type BotDifficulty, chooseBotMove } from './bots';
import { summariseSeats } from './matchSeats';

export function shouldBotAct(props: {
  isActive: boolean;
  playerID?: string | null;
  ctx: { currentPlayer: string; gameover?: unknown };
  matchData?: FilteredMetadata;
}): boolean {
  if (!props.isActive || props.ctx.gameover || !props.playerID) return false;
  if (props.ctx.currentPlayer !== props.playerID) return false;
  const seats = summariseSeats(props.matchData);
  if (seats && !seats.full) return false;
  return true;
}

export function createSilentBotBoard(game: Game, difficulty: BotDifficulty = 'medium') {
  return function SilentBotBoard({
    G,
    ctx,
    plugins,
    _undo,
    _redo,
    _stateID,
    isActive,
    matchData,
    moves,
    playerID,
  }: BoardProps) {
    useEffect(() => {
      const seat = playerID;
      if (!seat || !shouldBotAct({ isActive, playerID: seat, ctx, matchData })) {
        return;
      }
      let cancelled = false;
      void chooseBotMove(game, { G, ctx, plugins, _undo, _redo, _stateID }, seat, difficulty).then(
        (move) => {
          if (cancelled || !move) return;
          const fn = moves[move.type];
          if (typeof fn === 'function') {
            fn(...(move.args ?? []));
          }
        },
      );
      return () => {
        cancelled = true;
      };
    }, [G, _redo, _stateID, _undo, ctx, isActive, matchData, moves, playerID, plugins]);

    return null;
  };
}
