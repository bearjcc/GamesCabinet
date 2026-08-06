import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import {
  CrazyEights,
  type CrazyEightsState,
  canPlayCard,
  handSizeFor,
  matchContext,
  WILD_RANK,
} from './game';

function ceClient(setup: () => CrazyEightsState, numPlayers = 2) {
  const client = Client({
    game: { ...CrazyEights, setup },
    numPlayers,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof ceClient>): CrazyEightsState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as CrazyEightsState;
}

function baseState(partial: Partial<CrazyEightsState> = {}): CrazyEightsState {
  return {
    hands: [[], []],
    stock: [],
    discard: [makeCard('hearts', '5')],
    currentSuit: 'hearts',
    drewThisTurn: false,
    ...partial,
  };
}

describe('handSizeFor', () => {
  it('deals seven for two players and five otherwise', () => {
    expect(handSizeFor(2)).toBe(7);
    expect(handSizeFor(1)).toBe(7);
    expect(handSizeFor(3)).toBe(5);
    expect(handSizeFor(4)).toBe(5);
  });
});

describe('matchContext / canPlayCard', () => {
  it('requires a discard top', () => {
    expect(matchContext(baseState({ discard: [] }))).toBeNull();
    expect(canPlayCard(baseState({ discard: [] }), makeCard('hearts', '9'))).toBe(false);
  });

  it('allows suit/rank matches and wild eights with a declared suit', () => {
    const g = baseState();
    expect(canPlayCard(g, makeCard('hearts', '9'))).toBe(true);
    expect(canPlayCard(g, makeCard('clubs', '5'))).toBe(true);
    expect(canPlayCard(g, makeCard('spades', '2'))).toBe(false);
    expect(canPlayCard(g, makeCard('spades', WILD_RANK))).toBe(false);
    expect(canPlayCard(g, makeCard('spades', WILD_RANK), 'clubs')).toBe(true);
    expect(canPlayCard(g, makeCard('hearts', '9'), 'clubs')).toBe(false);
  });
});

describe('CrazyEights setup', () => {
  it('deals seven cards each for two players', () => {
    const client = Client({ game: { ...CrazyEights, seed: 'ce-deal-2' }, numPlayers: 2 });
    client.start();
    const g = G(client);
    expect(g.hands).toHaveLength(2);
    expect(g.hands.every((h) => h.length === 7)).toBe(true);
    expect(g.discard).toHaveLength(1);
    expect(g.discard[0].rank).not.toBe(WILD_RANK);
  });

  it('deals five cards each for three players', () => {
    const client = Client({ game: { ...CrazyEights, seed: 'ce-deal-3' }, numPlayers: 3 });
    client.start();
    expect(G(client).hands.every((h) => h.length === 5)).toBe(true);
  });
});

describe('CrazyEights moves', () => {
  it('plays a matching card and advances the turn', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('hearts', '9'), makeCard('clubs', '2')], [makeCard('spades', '3')]],
      }),
    );
    client.moves.playCard(0);
    expect(G(client).discard.at(-1)?.id).toBe('hearts-9');
    expect(G(client).currentSuit).toBe('hearts');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('plays a wild eight with a declared suit', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('clubs', WILD_RANK)], [makeCard('spades', '3')]],
      }),
    );
    client.moves.playCard(0, 'diamonds');
    expect(G(client).currentSuit).toBe('diamonds');
    expect(G(client).hands[0]).toHaveLength(0);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('rejects illegal plays', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('spades', '2'), makeCard('clubs', WILD_RANK)], [makeCard('hearts', '3')]],
      }),
    );
    const before = structuredClone(G(client));
    client.moves.playCard(0);
    client.moves.playCard(1);
    client.moves.playCard(9);
    client.moves.playCard(1, 'not-a-suit' as never);
    expect(G(client)).toEqual(before);
  });

  it('draws from stock and allows pass only after a draw', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('spades', '2')], [makeCard('clubs', '3')]],
        stock: [makeCard('diamonds', '4')],
      }),
    );
    const beforePass = structuredClone(G(client));
    client.moves.pass();
    expect(G(client)).toEqual(beforePass);

    client.moves.drawCard();
    expect(G(client).hands[0]).toHaveLength(2);
    expect(G(client).drewThisTurn).toBe(true);
    client.moves.pass();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('reshuffles the discard into stock when drawing from an empty stock', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('spades', '2')], [makeCard('clubs', '3')]],
        stock: [],
        discard: [makeCard('hearts', '5'), makeCard('hearts', '6'), makeCard('hearts', '7')],
      }),
    );
    client.moves.drawCard();
    expect(G(client).hands[0]).toHaveLength(2);
    expect(G(client).discard).toHaveLength(1);
  });

  it('rejects draw when no cards remain', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('spades', '2')], [makeCard('clubs', '3')]],
        stock: [],
        discard: [makeCard('hearts', '5')],
      }),
    );
    const before = structuredClone(G(client));
    client.moves.drawCard();
    expect(G(client)).toEqual(before);
  });

  it('allows play after drawing', () => {
    const client = ceClient(() =>
      baseState({
        hands: [[makeCard('spades', '2')], [makeCard('clubs', '3')]],
        stock: [makeCard('hearts', '9')],
      }),
    );
    client.moves.drawCard();
    client.moves.playCard(1);
    expect(G(client).discard.at(-1)?.id).toBe('hearts-9');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });
});

describe('CrazyEights ai', () => {
  it('enumerates plays, draws, and passes', () => {
    const playG = baseState({
      hands: [[makeCard('hearts', '9'), makeCard('clubs', WILD_RANK)], []],
      stock: [makeCard('diamonds', '2')],
    });
    const listed = (
      CrazyEights.ai!.enumerate as (
        g: CrazyEightsState,
        ctx: { currentPlayer: string },
      ) => { move: string; args?: unknown[] }[]
    )(playG, { currentPlayer: '0' });
    expect(listed).toContainEqual({ move: 'playCard', args: [0] });
    expect(listed.filter((m) => m.move === 'playCard' && m.args?.[0] === 1)).toHaveLength(4);
    expect(listed).toContainEqual({ move: 'drawCard' });

    const passG = baseState({
      hands: [[makeCard('spades', '2')], []],
      stock: [],
      discard: [makeCard('hearts', '5')],
      drewThisTurn: true,
    });
    const passListed = (
      CrazyEights.ai!.enumerate as (
        g: CrazyEightsState,
        ctx: { currentPlayer: string },
      ) => { move: string; args?: unknown[] }[]
    )(passG, { currentPlayer: '0' });
    expect(passListed).toContainEqual({ move: 'pass' });
    expect(passListed.some((m) => m.move === 'drawCard')).toBe(false);
  });

  it('returns no moves without a discard top', () => {
    const empty = baseState({ discard: [], hands: [[makeCard('hearts', '2')], []] });
    expect(
      (
        CrazyEights.ai!.enumerate as (
          g: CrazyEightsState,
          ctx: { currentPlayer: string },
        ) => unknown[]
      )(empty, { currentPlayer: '0' }),
    ).toEqual([]);
  });
});
