import { describe, expect, it } from 'vitest';
import { gameList, gamesById } from './registry';

describe('game registry', () => {
  it('lists every catalogue game once', () => {
    expect(gameList).toHaveLength(7);
    expect(gamesById['tic-tac-toe'].name).toBe('tic-tac-toe');
    expect(gamesById['2048'].name).toBe('2048');
    expect(gamesById['letter-walker'].name).toBe('letter-walker');
  });
});
