import { withMatchChrome } from '../components/MatchChrome';
import { CheckersBoard } from './checkers/Board';
import { ConnectFourBoard } from './connect-four/Board';
import { DominoesBoard } from './dominoes/Board';
import { Game2048Board } from './game-2048/Board';
import { LetterWalkerBoard } from './letter-walker/Board';
import { TicTacToeBoard } from './tic-tac-toe/Board';
import { YatzyBoard } from './yatzy/Board';

/** Boards wrapped once with shared post-game / waiting chrome. */
export const boards = {
  'tic-tac-toe': withMatchChrome(TicTacToeBoard),
  'connect-four': withMatchChrome(ConnectFourBoard),
  checkers: withMatchChrome(CheckersBoard),
  dominoes: withMatchChrome(DominoesBoard),
  '2048': withMatchChrome(Game2048Board),
  yatzy: withMatchChrome(YatzyBoard),
  'letter-walker': withMatchChrome(LetterWalkerBoard),
} as const;
