import { withMatchChrome } from '../components/MatchChrome';
import { CheckersBoard } from './checkers/Board';
import { ConnectFourBoard } from './connect-four/Board';
import { CrazyEightsBoard } from './crazy-eights/Board';
import { DominoesBoard } from './dominoes/Board';
import { Game2048Board } from './game-2048/Board';
import { KlondikeBoard } from './klondike/Board';
import { LetterWalkerBoard } from './letter-walker/Board';
import { MancalaBoard } from './mancala/Board';
import { MemoryBoard } from './memory/Board';
import { ReversiBoard } from './reversi/Board';
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
  'crazy-eights': withMatchChrome(CrazyEightsBoard),
  reversi: withMatchChrome(ReversiBoard),
  memory: withMatchChrome(MemoryBoard),
  mancala: withMatchChrome(MancalaBoard),
  klondike: withMatchChrome(KlondikeBoard),
} as const;
