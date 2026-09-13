export type GameMeta = {
  id: string;
  name: string;
  blurb: string;
  minPlayers: number;
  maxPlayers: number;
  hasBot: boolean;
  /** Offline local Client at `/play/:id` (solo). */
  hasSolo?: boolean;
  /** Single player only: skip table setup; engine runs with numPlayers 1. */
  soloOnly?: boolean;
  /** Offline pass-and-play at `/play/:id` (2+ seats). */
  hasLocal?: boolean;
  /** Solo leaderboard via shared scores API. */
  hasLeaderboard?: boolean;
  /** Hidden from the catalogue until this code is entered locally. */
  accessCode?: string;
  /**
   * Online host/join. Defaults to on when maxPlayers >= 2.
   * Set false for local-only titles (e.g. private IP decks).
   */
  hasOnline?: boolean;
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
    soloOnly: true,
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
    soloOnly: true,
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
    soloOnly: true,
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
    soloOnly: true,
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
  {
    id: 'go-fish',
    name: 'Go Fish',
    blurb: 'Ask for ranks. Make books of four.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'nim',
    name: 'Nim',
    blurb: 'Take 1 to 3 stones. Last take wins.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'war',
    name: 'War',
    blurb: 'Flip cards. Higher rank wins. War on ties.',
    minPlayers: 2,
    maxPlayers: 2,
    hasBot: true,
    hasLocal: true,
  },
  {
    id: 'orbits',
    name: 'Orbits',
    blurb: 'Solo rocket programme. Fuel the stack, survive the launch.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    soloOnly: true,
    hasLeaderboard: true,
    accessCode: 'crawler',
  },
  {
    id: 'tracks',
    name: 'TRACKS',
    blurb: 'Lay track. Connect start to destination. Complete objectives.',
    minPlayers: 2,
    maxPlayers: 6,
    hasBot: false,
    hasLocal: true,
    accessCode: 'CHOOCHOO',
  },
  {
    id: 'hogwarts-battle',
    name: 'Hogwarts Battle',
    blurb: 'Buy cards. Defeat villains. Keep Hogwarts.',
    minPlayers: 1,
    maxPlayers: 4,
    hasBot: false,
    hasSolo: true,
    hasLocal: true,
    hasOnline: true,
    accessCode: 'LUNALOVEGOOD',
  },
  {
    id: 'agency',
    name: 'Agency',
    blurb: 'Staff buildings. Fund missions. Win the Space Race.',
    minPlayers: 1,
    maxPlayers: 1,
    hasBot: false,
    hasSolo: true,
    soloOnly: true,
    accessCode: 'SPUTNIK',
  },
];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

/** Hidden shelves stay out of the grid and SEO until a local code reveals them. */
export function isAccessGated(meta: GameMeta): boolean {
  return Boolean(meta.accessCode);
}

export function isGameVisible(meta: GameMeta, unlocked: readonly string[]): boolean {
  return !isAccessGated(meta) || unlocked.includes(meta.id);
}

export function visibleGames(unlocked: readonly string[], games: GameMeta[] = GAMES): GameMeta[] {
  return games.filter((game) => isGameVisible(game, unlocked));
}

export function findGameByAccessCode(
  code: string,
  games: GameMeta[] = GAMES,
): GameMeta | undefined {
  const normalised = code.trim().toLowerCase();
  if (!normalised) return undefined;
  return games.find((game) => game.accessCode?.trim().toLowerCase() === normalised);
}

export function supportsLocalPlay(meta: GameMeta): boolean {
  return Boolean(meta.hasSolo || meta.hasLocal);
}

export function supportsBotPlay(meta: GameMeta): boolean {
  return Boolean(meta.hasBot);
}

/** Solo-only titles (one player, no pass-and-play / online seats). */
export function isSoloOnly(meta: GameMeta): boolean {
  return meta.soloOnly === true;
}

/** Local solo play route; no table setup. */
export function soloPlayPath(gameId: string): string {
  return `/play/${gameId}`;
}

export type CatalogueGroup = {
  id: 'solo' | 'with-others';
  label: string;
  games: GameMeta[];
};

/** Partition the catalogue for scanning; each game appears once. */
export function catalogueGroups(games: GameMeta[] = GAMES): CatalogueGroup[] {
  const solo: GameMeta[] = [];
  const withOthers: GameMeta[] = [];
  for (const game of games) {
    if (isSoloOnly(game)) solo.push(game);
    else withOthers.push(game);
  }
  const groups: CatalogueGroup[] = [];
  if (solo.length) groups.push({ id: 'solo', label: 'Solo', games: solo });
  if (withOthers.length) {
    groups.push({ id: 'with-others', label: 'With others', games: withOthers });
  }
  return groups;
}
