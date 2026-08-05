import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { canMove, Game2048, type Game2048State, type SwipeDir, spawn } from './game';

function startClient(seed = '2048-test') {
  const client = Client({ game: { ...Game2048, seed }, numPlayers: 1 });
  client.start();
  return client;
}

function cellsOf(client: ReturnType<typeof startClient>): (number | null)[] {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return (state.G as Game2048State).cells;
}

describe('Game2048', () => {
  it('starts with exactly two tiles on the board', () => {
    const client = startClient();
    const filled = cellsOf(client).filter((c) => c !== null);
    expect(filled).toHaveLength(2);
    for (const v of filled) {
      expect(v === 2 || v === 4).toBe(true);
    }
  });

  it('rejects a swipe that does not change the board', () => {
    const client = Client({
      game: {
        ...Game2048,
        seed: 'noop',
        setup: () => ({
          cells: [
            null,
            null,
            null,
            2,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
          score: 0,
          won: false,
        }),
      },
      numPlayers: 1,
    });
    client.start();
    const before = cellsOf(client);
    expect(canMove(before, 'right')).toBe(false);
    client.moves.swipe('right' satisfies SwipeDir);
    expect(cellsOf(client)).toEqual(before);
    expect(client.getState()?.G.score).toBe(0);
  });

  it('merges equal tiles and increases score', () => {
    const client = Client({
      game: {
        ...Game2048,
        seed: 'merge',
        setup: () => ({
          cells: [
            2,
            2,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
          score: 0,
          won: false,
        }),
      },
      numPlayers: 1,
    });
    client.start();
    client.moves.swipe('left');
    const G = client.getState()?.G as Game2048State;
    expect(G.cells[0]).toBe(4);
    expect(G.score).toBe(4);
    expect(G.cells.filter((c) => c !== null).length).toBeGreaterThanOrEqual(2);
  });

  it('ends when no moves remain', () => {
    const client = Client({
      game: {
        ...Game2048,
        seed: 'dead',
        setup: () => ({
          cells: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2],
          score: 99,
          won: false,
        }),
      },
      numPlayers: 1,
    });
    client.start();
    expect(client.getState()?.ctx.gameover).toEqual({ score: 99, won: false });
  });

  it('marks won when a 2048 tile appears', () => {
    const client = Client({
      game: {
        ...Game2048,
        seed: 'win',
        setup: () => ({
          cells: [
            1024,
            1024,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
          score: 0,
          won: false,
        }),
      },
      numPlayers: 1,
    });
    client.start();
    client.moves.swipe('left');
    const G = client.getState()?.G as Game2048State;
    expect(G.cells).toContain(2048);
    expect(G.won).toBe(true);
  });

  it('rejects an invalid swipe direction', () => {
    const client = startClient();
    const before = cellsOf(client);
    client.moves.swipe('sideways' as SwipeDir);
    expect(cellsOf(client)).toEqual(before);
  });

  it('does not spawn on a full board', () => {
    const cells = Array(16).fill(2) as (number | null)[];
    spawn(cells, { Shuffle: (arr) => arr, Number: () => 0.5 });
    expect(cells.every((value) => value === 2)).toBe(true);
  });

  it('can spawn a four tile when the random draw is high', () => {
    const cells = Array(16).fill(null) as (number | null)[];
    spawn(cells, { Shuffle: (arr) => arr, Number: () => 0.95 });
    expect(cells[0]).toBe(4);
  });
});
