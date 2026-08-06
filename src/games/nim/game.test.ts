import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { DEFAULT_HEAP, MAX_TAKE, Nim, type NimState } from './game';

function startClient() {
  const client = Client({ game: Nim });
  client.start();
  return client;
}

describe('Nim', () => {
  it('starts with a single heap of default stones', () => {
    const client = startClient();
    const G = client.getState()?.G as NimState;
    expect(G.heap).toBe(DEFAULT_HEAP);
    expect(DEFAULT_HEAP).toBe(13);
    expect(MAX_TAKE).toBe(3);
  });

  it('removes stones on a legal take and switches turn', () => {
    const client = startClient();
    client.moves.take(2);
    const state = client.getState();
    const G = state?.G as NimState;
    expect(G.heap).toBe(DEFAULT_HEAP - 2);
    expect(state?.ctx.currentPlayer).toBe('1');
  });

  it('rejects take of zero, negative, over max, or more than heap', () => {
    const client = startClient();
    const before = client.getState()?.G as NimState;
    client.moves.take(0);
    client.moves.take(-1);
    client.moves.take(MAX_TAKE + 1);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');

    // Drain to 2 so take(3) exceeds heap.
    client.moves.take(3);
    client.moves.take(3);
    client.moves.take(3);
    client.moves.take(2);
    const drained = client.getState()?.G as NimState;
    expect(drained.heap).toBe(2);
    const mid = client.getState()?.G as NimState;
    const midPlayer = client.getState()?.ctx.currentPlayer;
    client.moves.take(3);
    expect(client.getState()?.G).toEqual(mid);
    expect(client.getState()?.ctx.currentPlayer).toBe(midPlayer);
  });

  it('awards the player who takes the last stone', () => {
    const client = startClient();
    // 13 stones: 3+3+3+3+1 = P0 takes last
    client.moves.take(3); // 10, P1
    client.moves.take(3); // 7, P0
    client.moves.take(3); // 4, P1
    client.moves.take(3); // 1, P0
    client.moves.take(1); // 0, P0 wins
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('enumerates only legal takes for ai', () => {
    const enumerate = Nim.ai!.enumerate as (G: NimState, ctx: unknown) => unknown[];
    expect(enumerate({ heap: 5 }, {})).toEqual([
      { move: 'take', args: [1] },
      { move: 'take', args: [2] },
      { move: 'take', args: [3] },
    ]);
    expect(enumerate({ heap: 2 }, {})).toEqual([
      { move: 'take', args: [1] },
      { move: 'take', args: [2] },
    ]);
    expect(enumerate({ heap: 0 }, {})).toEqual([]);
  });
});
