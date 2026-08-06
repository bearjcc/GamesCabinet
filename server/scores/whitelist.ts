import { GAMES } from '../../src/lib/games.ts';

/** True when `gameId` is a catalogue game with a solo leaderboard. */
export function isLeaderboardGame(gameId: string): boolean {
  if (!gameId) return false;
  const meta = GAMES.find((g) => g.id === gameId);
  return Boolean(meta?.hasLeaderboard);
}
