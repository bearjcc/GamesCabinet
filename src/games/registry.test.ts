import { describe, expect, it } from 'vitest';
import { gameList, gamesById } from './registry';

describe('game registry', () => {
  it('lists every catalogue game once', () => {
    expect(gameList).toHaveLength(15);
    expect(gamesById['tic-tac-toe'].name).toBe('tic-tac-toe');
    expect(gamesById['2048'].name).toBe('2048');
    expect(gamesById['letter-walker'].name).toBe('letter-walker');
    expect(gamesById['crazy-eights'].name).toBe('crazy-eights');
    expect(gamesById.reversi.name).toBe('reversi');
    expect(gamesById.memory.name).toBe('memory');
    expect(gamesById.mancala.name).toBe('mancala');
    expect(gamesById.klondike.name).toBe('klondike');
    expect(gamesById.freecell.name).toBe('freecell');
    expect(gamesById.go.name).toBe('go');
    expect(gamesById['chinese-checkers'].name).toBe('chinese-checkers');
  });
});
