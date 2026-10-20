export type GameIdentityToken = 'red' | 'blue' | 'green' | 'yellow' | 'umber' | 'navy';

const GAME_IDENTITY: Record<string, GameIdentityToken> = {
  'tic-tac-toe': 'red',
  'connect-four': 'blue',
  checkers: 'red',
  dominoes: 'umber',
  '2048': 'yellow',
  yatzy: 'blue',
  'letter-walker': 'green',
  'crazy-eights': 'green',
  reversi: 'navy',
  memory: 'yellow',
  mancala: 'green',
  klondike: 'green',
  freecell: 'blue',
  go: 'navy',
  'chinese-checkers': 'red',
  battleship: 'navy',
  chess: 'umber',
  'nine-mens-morris': 'umber',
  backgammon: 'umber',
  'dots-and-boxes': 'blue',
  'snakes-and-ladders': 'yellow',
  'go-fish': 'green',
  nim: 'red',
  war: 'red',
  orbits: 'navy',
  tracks: 'yellow',
  'hogwarts-battle': 'navy',
};

const FIXED_SEAT_COLOUR_GAMES = new Set(['chess', 'checkers', 'go', 'backgammon', 'reversi']);

export function gameIdentityToken(gameId: string): GameIdentityToken {
  return GAME_IDENTITY[gameId] ?? 'blue';
}

export function gameAccentVar(gameId: string): string {
  return `var(--game-${gameIdentityToken(gameId)})`;
}

export function gameAccentStyle(gameId: string): { '--game-accent': string } {
  return { '--game-accent': gameAccentVar(gameId) };
}

export function usesLaunchSeatColours(gameId: string): boolean {
  return !FIXED_SEAT_COLOUR_GAMES.has(gameId);
}
