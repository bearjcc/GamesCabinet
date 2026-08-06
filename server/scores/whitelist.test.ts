import { describe, expect, it } from 'vitest';
import { isLeaderboardGame } from './whitelist.ts';

describe('isLeaderboardGame', () => {
  it('allows catalogue games with hasLeaderboard', () => {
    expect(isLeaderboardGame('2048')).toBe(true);
    expect(isLeaderboardGame('yatzy')).toBe(true);
    expect(isLeaderboardGame('letter-walker')).toBe(true);
    expect(isLeaderboardGame('klondike')).toBe(true);
  });

  it('rejects unknown and non-leaderboard catalogue games', () => {
    expect(isLeaderboardGame('tic-tac-toe')).toBe(false);
    expect(isLeaderboardGame('crazy-eights')).toBe(false);
    expect(isLeaderboardGame('not-a-game')).toBe(false);
    expect(isLeaderboardGame('')).toBe(false);
  });
});
