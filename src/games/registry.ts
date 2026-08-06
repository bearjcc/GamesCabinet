import type { Game } from 'boardgame.io';
import { Backgammon } from './backgammon/game';
import { Battleship } from './battleship/game';
import { Checkers } from './checkers/game';
import { Chess } from './chess/game';
import { ChineseCheckers } from './chinese-checkers/game';
import { ConnectFour } from './connect-four/game';
import { CrazyEights } from './crazy-eights/game';
import { Dominoes } from './dominoes/game';
import { DotsAndBoxes } from './dots-and-boxes/game';
import { FreeCell } from './freecell/game';
import { Game2048 } from './game-2048/game';
import { Go } from './go/game';
import { GoFish } from './go-fish/game';
import { Klondike } from './klondike/game';
import { LetterWalker } from './letter-walker/game';
import { Mancala } from './mancala/game';
import { Memory } from './memory/game';
import { Nim } from './nim/game';
import { NineMensMorris } from './nine-mens-morris/game';
import { Reversi } from './reversi/game';
import { SnakesAndLadders } from './snakes-and-ladders/game';
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
  CrazyEights,
  Reversi,
  Memory,
  Mancala,
  Klondike,
  FreeCell,
  Go,
  ChineseCheckers,
  Battleship,
  Chess,
  NineMensMorris,
  Backgammon,
  DotsAndBoxes,
  SnakesAndLadders,
  GoFish,
  Nim,
];

export const gamesById = {
  'tic-tac-toe': TicTacToe,
  'connect-four': ConnectFour,
  checkers: Checkers,
  dominoes: Dominoes,
  '2048': Game2048,
  yatzy: Yatzy,
  'letter-walker': LetterWalker,
  'crazy-eights': CrazyEights,
  reversi: Reversi,
  memory: Memory,
  mancala: Mancala,
  klondike: Klondike,
  freecell: FreeCell,
  go: Go,
  'chinese-checkers': ChineseCheckers,
  battleship: Battleship,
  chess: Chess,
  'nine-mens-morris': NineMensMorris,
  backgammon: Backgammon,
  'dots-and-boxes': DotsAndBoxes,
  'snakes-and-ladders': SnakesAndLadders,
  'go-fish': GoFish,
  nim: Nim,
} as const;

export type GameId = keyof typeof gamesById;
