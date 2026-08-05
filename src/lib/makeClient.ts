import type { Game } from 'boardgame.io';
import { Client } from 'boardgame.io/react';
import type { ComponentType } from 'react';

// boardgame.io Client generics don't unify cleanly across a game registry.
export function makeClient(opts: {
  game: Game;
  board: ComponentType<any>;
  multiplayer?: any;
  numPlayers?: number;
  debug?: boolean;
}) {
  return Client({
    game: opts.game as Game,
    board: opts.board,
    multiplayer: opts.multiplayer,
    numPlayers: opts.numPlayers,
    debug: opts.debug ?? false,
  } as any);
}
