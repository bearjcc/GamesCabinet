export type GameMeta = {
  id: string;
  name: string;
  blurb: string;
  minPlayers: number;
  maxPlayers: number;
  hasBot: boolean;
  /** Offline local Client at `/play/:id` (solo). */
  hasSolo?: boolean;
  /** Offline pass-and-play at `/play/:id` (2+ seats). */
  hasLocal?: boolean;
  /** Solo leaderboard via shared scores API. */
  hasLeaderboard?: boolean;
};

export const GAMES: GameMeta[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic-tac-toe',
    blurb: 'Three in a row.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    blurb: 'Drop discs. Four in a line.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'checkers',
    name: 'Checkers',
    blurb: 'English draughts. Capture to the crown.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'dominoes',
    name: 'Dominoes',
    blurb: 'Double-six draw with spinners.',
    minPlayers: 2,
    maxPlayers: 4,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: '2048',
    name: '2048',
    blurb: 'Slide tiles. Reach 2048.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    hasLeaderboard: true,
  },
  {
    id: 'yatzy',
    name: 'Yatzy',
    blurb: 'Five dice. Fifteen boxes.',
    minPlayers: 1,
    maxPlayers: 4,
    hasBot: true,
    hasSolo: true,
    hasLocal: true,
    hasLeaderboard: true,
  },
  {
    id: 'letter-walker',
    name: 'Letter Walker',
    blurb: 'Slide letters. Find a word. Concept by Luke Walker.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    hasLeaderboard: true,
  },
  {
    id: 'crazy-eights',
    name: 'Crazy Eights',
    blurb: 'Match suit or rank. Eights are wild.',
    minPlayers: 2,
    maxPlayers: 4,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'reversi',
    name: 'Reversi',
    blurb: 'Outflank discs. Majority wins.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'memory',
    name: 'Memory',
    blurb: 'Flip pairs. Most matches wins.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'mancala',
    name: 'Mancala',
    blurb: 'Kalaha. Sow stones. Capture. Fill your store.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'klondike',
    name: 'Klondike',
    blurb: 'Classic solitaire. Build foundations Ace to King.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    hasLeaderboard: true,
  },
  {
    id: 'freecell',
    name: 'FreeCell',
    blurb: 'Solitaire with freecells. Build foundations Ace to King.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    hasLeaderboard: true,
  },
  {
    id: 'go',
    name: 'Go',
    blurb: '9x9. Capture groups. Two passes end the game.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'chinese-checkers',
    name: 'Chinese Checkers',
    blurb: 'Hop pegs across the star. Fill the opposite home.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'battleship',
    name: 'Battleship',
    blurb: 'Place ships. Fire. Fog of war.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'chess',
    name: 'Chess',
    blurb: 'Standard chess. Checkmate the king.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'nine-mens-morris',
    name: "Nine Men's Morris",
    blurb: 'Place, mill, and reduce the opponent to two.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'backgammon',
    name: 'Backgammon',
    blurb: 'Race, hit, and bear off. No doubling cube.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'dots-and-boxes',
    name: 'Dots and Boxes',
    blurb: 'Claim lines. Close boxes. Extra turn when you score.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'snakes-and-ladders',
    name: 'Snakes and Ladders',
    blurb: 'Roll, climb ladders, slide snakes. Race to the end.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

export function supportsLocalPlay(meta: GameMeta): boolean {
  return Boolean(meta.hasSolo || meta.hasLocal);
}

export function supportsBotPlay(meta: GameMeta): boolean {
  return Boolean(meta.hasBot);
}
