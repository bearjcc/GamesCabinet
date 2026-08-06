import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { type Card, makeCard, type Rank } from '../shared/cards';
import {
  askableRanks,
  canAsk,
  canDraw,
  collectBooks,
  GoFish,
  type GoFishState,
  opponentOf,
} from './game';

function gfClient(setup: () => GoFishState, numPlayers = 2) {
  const client = Client({
    game: { ...GoFish, setup },
    numPlayers,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof gfClient>): GoFishState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as GoFishState;
}

function baseState(partial: Partial<GoFishState> = {}): GoFishState {
  return {
    hands: [[], []],
    stock: [],
    books: [0, 0],
    pendingFishRank: null,
    ...partial,
  };
}

describe('opponentOf / askableRanks / canAsk / canDraw', () => {
  it('maps the other seat for two players', () => {
    expect(opponentOf(0)).toBe(1);
    expect(opponentOf(1)).toBe(0);
  });

  it('lists unique ranks held in hand order of first appearance', () => {
    expect(
      askableRanks([
        makeCard('hearts', 'A'),
        makeCard('clubs', 'A'),
        makeCard('spades', '3'),
        makeCard('diamonds', 'A'),
      ]),
    ).toEqual(['A', '3']);
  });

  it('allows ask only for a held rank when not pending a fish', () => {
    const g = baseState({
      hands: [[makeCard('hearts', 'A'), makeCard('clubs', '2')], [makeCard('spades', '3')]],
    });
    expect(canAsk(g, 0, 'A')).toBe(true);
    expect(canAsk(g, 0, 'K')).toBe(false);
    expect(canAsk(g, 0, '2')).toBe(true);
    expect(
      canAsk(
        baseState({
          hands: [[makeCard('hearts', 'A')], []],
          pendingFishRank: 'A',
        }),
        0,
        'A',
      ),
    ).toBe(false);
  });

  it('allows draw when fishing or when the hand is empty with stock remaining', () => {
    expect(
      canDraw(
        baseState({
          hands: [[makeCard('hearts', 'A')], []],
          stock: [makeCard('clubs', '2')],
          pendingFishRank: 'A',
        }),
        0,
      ),
    ).toBe(true);
    expect(
      canDraw(
        baseState({
          hands: [[], [makeCard('spades', '3')]],
          stock: [makeCard('clubs', '2')],
        }),
        0,
      ),
    ).toBe(true);
    expect(
      canDraw(
        baseState({
          hands: [[makeCard('hearts', 'A')], []],
          stock: [makeCard('clubs', '2')],
        }),
        0,
      ),
    ).toBe(false);
    expect(canDraw(baseState({ hands: [] as Card[][], stock: [makeCard('clubs', '2')] }), 0)).toBe(
      false,
    );
    expect(canAsk(baseState({ hands: [] as Card[][] }), 0, 'A')).toBe(false);
    expect(canAsk(baseState({ hands: [[]] }), 0, 'A')).toBe(false);
  });

  it('collectBooks scores fours and keeps incomplete ranks', () => {
    expect(
      collectBooks([
        makeCard('hearts', 'A'),
        makeCard('spades', 'A'),
        makeCard('diamonds', 'A'),
        makeCard('clubs', 'A'),
        makeCard('hearts', '2'),
      ]),
    ).toEqual({
      hand: [makeCard('hearts', '2')],
      books: 1,
    });
  });
});

describe('GoFish setup', () => {
  it('deals seven cards each from a 52-card deck; remainder is stock', () => {
    const client = Client({ game: { ...GoFish, seed: 'go-fish-deal' }, numPlayers: 2 });
    client.start();
    const g = G(client);
    expect(g.hands).toHaveLength(2);
    expect(g.hands.every((h) => h.length === 7)).toBe(true);
    expect(g.stock).toHaveLength(52 - 14);
    expect(g.books).toEqual([0, 0]);
    expect(g.pendingFishRank).toBeNull();
    const ids = [...g.hands[0], ...g.hands[1], ...g.stock].map((c) => c.id);
    expect(new Set(ids).size).toBe(52);
  });
});

describe('GoFish ask', () => {
  it('transfers all matching ranks from the opponent and keeps the turn', () => {
    const client = gfClient(() =>
      baseState({
        hands: [
          [makeCard('hearts', 'A'), makeCard('clubs', '2')],
          [makeCard('spades', 'A'), makeCard('diamonds', 'A'), makeCard('clubs', '3')],
        ],
      }),
    );
    client.moves.ask('A');
    const g = G(client);
    expect(g.hands[0].map((c) => c.id).sort()).toEqual(
      ['clubs-2', 'diamonds-A', 'hearts-A', 'spades-A'].sort(),
    );
    expect(g.hands[1].map((c) => c.id)).toEqual(['clubs-3']);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
    expect(g.pendingFishRank).toBeNull();
  });

  it('sets pending fish when the opponent has none of the rank', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
        stock: [makeCard('spades', '3')],
      }),
    );
    client.moves.ask('A');
    expect(G(client).pendingFishRank).toBe('A');
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('ends the turn immediately when go-fish is required but stock is empty', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
        stock: [],
      }),
    );
    client.moves.ask('A');
    expect(G(client).pendingFishRank).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects asking for a rank not held', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
      }),
    );
    const before = structuredClone(G(client));
    client.moves.ask('K');
    expect(G(client)).toEqual(before);
  });
});

describe('GoFish draw (go fish)', () => {
  it('ends the turn when the drawn card does not match the ask', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
        stock: [makeCard('spades', '3')],
        pendingFishRank: 'A',
      }),
    );
    client.moves.draw();
    expect(
      G(client)
        .hands[0].map((c) => c.id)
        .sort(),
    ).toEqual(['hearts-A', 'spades-3'].sort());
    expect(G(client).pendingFishRank).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('keeps the turn when the drawn card matches the ask', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
        stock: [makeCard('spades', 'A')],
        pendingFishRank: 'A',
      }),
    );
    client.moves.draw();
    expect(
      G(client)
        .hands[0].map((c) => c.id)
        .sort(),
    ).toEqual(['hearts-A', 'spades-A'].sort());
    expect(G(client).pendingFishRank).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('lets an empty hand draw from stock without a pending ask', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[], [makeCard('clubs', '2')]],
        stock: [makeCard('hearts', '5')],
      }),
    );
    client.moves.draw();
    expect(G(client).hands[0]).toEqual([makeCard('hearts', '5')]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('rejects draw when not fishing and the hand is not empty', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[makeCard('hearts', 'A')], [makeCard('clubs', '2')]],
        stock: [makeCard('spades', '3')],
      }),
    );
    const before = structuredClone(G(client));
    client.moves.draw();
    expect(G(client)).toEqual(before);
  });
});

describe('GoFish books', () => {
  it('scores a book of four and removes those cards from the hand', () => {
    const client = gfClient(() =>
      baseState({
        hands: [
          [makeCard('hearts', 'A'), makeCard('clubs', '2')],
          [makeCard('spades', 'A'), makeCard('diamonds', 'A'), makeCard('clubs', 'A')],
        ],
      }),
    );
    client.moves.ask('A');
    const g = G(client);
    expect(g.books[0]).toBe(1);
    expect(g.hands[0].map((c) => c.id)).toEqual(['clubs-2']);
    expect(g.hands[0].every((c) => c.rank !== 'A')).toBe(true);
  });
});

describe('GoFish endgame', () => {
  it('awards the win to player 1 when they hold more books at the end', () => {
    const client = gfClient(() =>
      baseState({
        hands: [
          [makeCard('hearts', 'A'), makeCard('spades', 'A'), makeCard('diamonds', 'A')],
          [makeCard('clubs', 'A')],
        ],
        stock: [],
        books: [1, 3],
      }),
    );
    client.moves.ask('A');
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('awards the win to the player with more books when stock and hands are empty', () => {
    const mid = gfClient(() =>
      baseState({
        hands: [
          [
            makeCard('hearts', 'A'),
            makeCard('spades', 'A'),
            makeCard('diamonds', 'A'),
            makeCard('clubs', '2'),
          ],
          [makeCard('clubs', 'A')],
        ],
        stock: [],
        books: [2, 1],
      }),
    );
    mid.moves.ask('A');
    // Book formed; clubs-2 remains - not over yet.
    expect(mid.getState()?.ctx.gameover).toBeUndefined();

    const terminal = gfClient(() =>
      baseState({
        hands: [
          [makeCard('hearts', 'A'), makeCard('spades', 'A'), makeCard('diamonds', 'A')],
          [makeCard('clubs', 'A')],
        ],
        stock: [],
        books: [2, 1],
      }),
    );
    terminal.moves.ask('A');
    expect(G(terminal).hands.every((h) => h.length === 0)).toBe(true);
    expect(G(terminal).books[0]).toBe(3);
    expect(terminal.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('reports a draw when books are tied at end', () => {
    const client = gfClient(() =>
      baseState({
        hands: [
          [makeCard('hearts', 'K'), makeCard('spades', 'K'), makeCard('diamonds', 'K')],
          [makeCard('clubs', 'K')],
        ],
        stock: [],
        books: [2, 3],
      }),
    );
    client.moves.ask('K');
    expect(G(client).books).toEqual([3, 3]);
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });
});

describe('GoFish empty-hand turn skip', () => {
  it('passes the turn when the current player has no cards and stock is empty', () => {
    const client = gfClient(() =>
      baseState({
        hands: [[], [makeCard('clubs', '2')]],
        stock: [],
        books: [1, 1],
      }),
    );
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });
});

describe('GoFish ai', () => {
  const enumerate = GoFish.ai!.enumerate as (
    g: GoFishState,
    ctx: { currentPlayer: string },
  ) => { move: string; args?: unknown[] }[];

  it('enumerates ask moves for held ranks and draw when fishing', () => {
    const askG = baseState({
      hands: [[makeCard('hearts', 'A'), makeCard('clubs', 'A'), makeCard('spades', '3')], []],
    });
    const listed = enumerate(askG, { currentPlayer: '0' });
    expect(listed).toContainEqual({ move: 'ask', args: ['A'] });
    expect(listed).toContainEqual({ move: 'ask', args: ['3'] });
    expect(listed.some((m) => m.move === 'draw')).toBe(false);

    const fishG = baseState({
      hands: [[makeCard('hearts', 'A')], []],
      stock: [makeCard('clubs', '2')],
      pendingFishRank: 'A' as Rank,
    });
    expect(enumerate(fishG, { currentPlayer: '0' })).toEqual([{ move: 'draw' }]);
  });

  it('enumerates only draw for an empty-hand refill', () => {
    const empty = baseState({
      hands: [[], [makeCard('clubs', '2')]],
      stock: [makeCard('hearts', '5')],
    });
    expect(enumerate(empty, { currentPlayer: '0' })).toEqual([{ move: 'draw' }]);
  });

  it('tolerates a missing hand seat when enumerating asks', () => {
    expect(enumerate(baseState({ hands: [] as Card[][] }), { currentPlayer: '0' })).toEqual([]);
  });

  it('offers no asks while a fish is pending and stock is empty', () => {
    expect(
      enumerate(
        baseState({
          hands: [[makeCard('hearts', 'A')], []],
          stock: [],
          pendingFishRank: 'A',
        }),
        { currentPlayer: '0' },
      ),
    ).toEqual([]);
  });
});
