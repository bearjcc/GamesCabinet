import type { Game } from 'boardgame.io';
import { Checkers } from './checkers/game';
import { ConnectFour } from './connect-four/game';
import { Dominoes } from './dominoes/game';
import { Game2048 } from './game-2048/game';
import { LetterWalker } from './letter-walker/game';
import { TicTacToe } from './tic-tac-toe/game';
import { Yatzy } from './yatzy/game';

// Registry mixes game state types; boardgame.io Game generics cannot unify them.
export const gameList: Game<any>[] = [
  TicTacToe,
  ConnectFour,
  Checkers,
  Dominoes,
  Game2048,
  Yatzy,
  LetterWalker,
];

export const gamesById = {
  'tic-tac-toe': TicTacToe,
  'connect-four': ConnectFour,
  checkers: Checkers,
  dominoes: Dominoes,
  '2048': Game2048,
  yatzy: Yatzy,
  'letter-walker': LetterWalker,
} as const;

export type GameId = keyof typeof gamesById;
