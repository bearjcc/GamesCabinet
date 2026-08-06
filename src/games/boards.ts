import { withMatchChrome } from '../components/MatchChrome';
import { BackgammonBoard } from './backgammon/Board';
import { BattleshipBoard } from './battleship/Board';
import { CheckersBoard } from './checkers/Board';
import { ChessBoard } from './chess/Board';
import { ChineseCheckersBoard } from './chinese-checkers/Board';
import { ConnectFourBoard } from './connect-four/Board';
import { CrazyEightsBoard } from './crazy-eights/Board';
import { DominoesBoard } from './dominoes/Board';
import { DotsAndBoxesBoard } from './dots-and-boxes/Board';
import { FreeCellBoard } from './freecell/Board';
import { Game2048Board } from './game-2048/Board';
import { GoBoard } from './go/Board';
import { GoFishBoard } from './go-fish/Board';
import { KlondikeBoard } from './klondike/Board';
import { LetterWalkerBoard } from './letter-walker/Board';
import { MancalaBoard } from './mancala/Board';
import { MemoryBoard } from './memory/Board';
import { NimBoard } from './nim/Board';
import { NineMensMorrisBoard } from './nine-mens-morris/Board';
import { ReversiBoard } from './reversi/Board';
import { SnakesAndLaddersBoard } from './snakes-and-ladders/Board';
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
  freecell: withMatchChrome(FreeCellBoard),
  go: withMatchChrome(GoBoard),
  'chinese-checkers': withMatchChrome(ChineseCheckersBoard),
  battleship: withMatchChrome(BattleshipBoard),
  chess: withMatchChrome(ChessBoard),
  'nine-mens-morris': withMatchChrome(NineMensMorrisBoard),
  backgammon: withMatchChrome(BackgammonBoard),
  'dots-and-boxes': withMatchChrome(DotsAndBoxesBoard),
  'snakes-and-ladders': withMatchChrome(SnakesAndLaddersBoard),
  'go-fish': withMatchChrome(GoFishBoard),
  nim: withMatchChrome(NimBoard),
} as const;
