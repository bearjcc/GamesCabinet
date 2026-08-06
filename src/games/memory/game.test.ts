import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { Memory, type MemoryState } from './game';

function fixedCards(): MemoryState['cards'] {
  // Pairs sit at (0,1), (2,3), ... so tests can flip known matches.
  const cards: MemoryState['cards'] = [];
  for (let pairId = 0; pairId < 8; pairId++) {
    cards.push({ pairId, faceUp: false }, { pairId, faceUp: false });
  }
  return cards;
}

function startWithCards(cards = fixedCards()) {
  const client = Client({
    game: {
      ...Memory,
      setup: () => ({
        cards: cards.map((c) => ({ ...c })),
        scores: [0, 0] as [number, number],
        firstFlip: null,
      }),
    },
    numPlayers: 2,
  });
  client.start();
  return client;
}

function GOf(client: ReturnType<typeof startWithCards>): MemoryState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as MemoryState;
}

describe('Memory', () => {
  it('shuffles eight pairs in setup', () => {
    const client = Client({ game: { ...Memory, seed: 'memory-deal' }, numPlayers: 2 });
    client.start();
    const G = GOf(client);
    expect(G.cards).toHaveLength(16);
    expect(G.firstFlip).toBeNull();
    expect(G.scores).toEqual([0, 0]);
    const counts = new Map<number, number>();
    for (const c of G.cards) {
      expect(c.faceUp).toBe(false);
      counts.set(c.pairId, (counts.get(c.pairId) ?? 0) + 1);
    }
    expect(counts.size).toBe(8);
    for (const n of counts.values()) expect(n).toBe(2);
  });

  it('rejects flipping an already face-up card', () => {
    const client = startWithCards();
    client.moves.flip(0);
    const afterFirst = GOf(client);
    expect(afterFirst.cards[0].faceUp).toBe(true);
    expect(afterFirst.firstFlip).toBe(0);

    client.moves.flip(0);
    const afterIllegal = GOf(client);
    expect(afterIllegal).toEqual(afterFirst);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('rejects out-of-range flips', () => {
    const client = startWithCards();
    const before = GOf(client);
    client.moves.flip(-1);
    client.moves.flip(16);
    expect(GOf(client)).toEqual(before);
  });

  it('keeps a matched pair face-up, scores, and same player continues', () => {
    const client = startWithCards();
    client.moves.flip(0);
    client.moves.flip(1);

    const G = GOf(client);
    expect(G.cards[0].faceUp).toBe(true);
    expect(G.cards[1].faceUp).toBe(true);
    expect(G.firstFlip).toBeNull();
    expect(G.scores).toEqual([1, 0]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('resolves a mismatch on the next flip and ends the turn', () => {
    const client = startWithCards();
    client.moves.flip(0);
    client.moves.flip(2);

    let G = GOf(client);
    expect(G.cards[0].faceUp).toBe(true);
    expect(G.cards[2].faceUp).toBe(true);
    expect(G.scores).toEqual([0, 0]);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');

    client.moves.flip(4);
    G = GOf(client);
    expect(G.cards[0].faceUp).toBe(false);
    expect(G.cards[2].faceUp).toBe(false);
    expect(G.cards[4].faceUp).toBe(true);
    expect(G.firstFlip).toBe(4);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('ends with the higher score as winner', () => {
    const client = startWithCards();
    // Player 0 takes four pairs
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) {
      client.moves.flip(i);
    }
    expect(GOf(client).scores).toEqual([4, 0]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');

    // Mismatch to hand turn to player 1
    client.moves.flip(8);
    client.moves.flip(10);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');

    // Player 1 takes remaining four pairs
    for (const i of [8, 9, 10, 11, 12, 13, 14, 15]) {
      client.moves.flip(i);
    }

    const state = client.getState();
    expect(GOf(client).scores).toEqual([4, 4]);
    expect(state?.ctx.gameover).toEqual({ draw: true });
  });

  it('awards win to the player with more matches', () => {
    const client = startWithCards();
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      client.moves.flip(i);
    }
    expect(GOf(client).scores).toEqual([5, 0]);
    client.moves.flip(10);
    client.moves.flip(12);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    for (const i of [10, 11, 12, 13, 14, 15]) {
      client.moves.flip(i);
    }
    expect(GOf(client).scores).toEqual([5, 3]);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('awards win to player 1 when they lead on matches', () => {
    const client = startWithCards();
    // Player 0 takes three pairs then mismatches
    for (const i of [0, 1, 2, 3, 4, 5]) {
      client.moves.flip(i);
    }
    client.moves.flip(6);
    client.moves.flip(8);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    // Player 1 clears the rest (five pairs)
    for (const i of [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
      client.moves.flip(i);
    }
    expect(GOf(client).scores).toEqual([3, 5]);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('enumerates only face-down indices for ai', () => {
    const G: MemoryState = {
      cards: fixedCards().map((c, i) => ({ ...c, faceUp: i === 0 || i === 1 })),
      scores: [1, 0],
      firstFlip: null,
    };
    expect((Memory.ai!.enumerate as (G: MemoryState) => unknown[])(G)).toEqual(
      Array.from({ length: 14 }, (_, k) => ({ move: 'flip', args: [k + 2] })),
    );
  });
});
