import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { makeCard } from '../shared/cards';
import {
  canPlay,
  compareWarRanks,
  createEmptyWarState,
  MAX_ROUNDS,
  resolveFight,
  War,
  type WarState,
  warFaceDownCount,
  warRankValue,
} from './game';

function warClient(setup: () => WarState, numPlayers = 2) {
  const client = Client({
    game: { ...War, setup },
    numPlayers,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof warClient>): WarState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as WarState;
}

describe('war rank helpers', () => {
  it('treats Ace as high and ignores suits via rank-only compare', () => {
    expect(warRankValue('A')).toBeGreaterThan(warRankValue('K'));
    expect(compareWarRanks('A', 'K')).toBeGreaterThan(0);
    expect(compareWarRanks('10', 'J')).toBeLessThan(0);
    expect(compareWarRanks('Q', 'Q')).toBe(0);
  });

  it('prefers 3 face-down when both have 4+, else 1 when both have 2+', () => {
    expect(warFaceDownCount(4, 4)).toBe(3);
    expect(warFaceDownCount(10, 5)).toBe(3);
    expect(warFaceDownCount(3, 3)).toBe(1);
    expect(warFaceDownCount(2, 2)).toBe(1);
    expect(warFaceDownCount(1, 5)).toBeNull();
    expect(warFaceDownCount(0, 0)).toBeNull();
  });
});

describe('War setup', () => {
  it('deals all 52 cards equally into two face-down decks of 26', () => {
    const client = Client({ game: { ...War, seed: 'war-deal' }, numPlayers: 2 });
    client.start();
    const g = G(client);
    expect(g.decks).toHaveLength(2);
    expect(g.decks[0]).toHaveLength(26);
    expect(g.decks[1]).toHaveLength(26);
    expect(g.faceUp).toEqual([null, null]);
    expect(g.rounds).toBe(0);
    const ids = [...g.decks[0], ...g.decks[1]].map((c) => c.id);
    expect(new Set(ids).size).toBe(52);
  });
});

describe('War play', () => {
  it('awards both cards to the higher rank at the bottom of the winner deck', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [makeCard('hearts', 'K'), makeCard('clubs', '2')],
          [makeCard('spades', '3'), makeCard('diamonds', '4')],
        ],
      }),
    );
    client.moves.play();
    const g = G(client);
    expect(g.faceUp[0]?.id).toBe('hearts-K');
    expect(g.faceUp[1]?.id).toBe('spades-3');
    expect(g.decks[0].map((c) => c.id)).toEqual(['clubs-2', 'hearts-K', 'spades-3']);
    expect(g.decks[1].map((c) => c.id)).toEqual(['diamonds-4']);
    expect(g.lastWinner).toBe('0');
    expect(g.lastWasWar).toBe(false);
    expect(g.rounds).toBe(1);
  });

  it('lets Ace beat King', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], [makeCard('spades', 'K')]],
      }),
    );
    client.moves.play();
    expect(G(client).lastWinner).toBe('0');
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('awards the pot to player 1 when their rank is higher', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [makeCard('hearts', '3'), makeCard('clubs', '2')],
          [makeCard('spades', 'Q'), makeCard('diamonds', '4')],
        ],
      }),
    );
    client.moves.play();
    const g = G(client);
    expect(g.lastWinner).toBe('1');
    expect(g.decks[1].map((c) => c.id)).toEqual(['diamonds-4', 'hearts-3', 'spades-Q']);
    expect(g.decks[0].map((c) => c.id)).toEqual(['clubs-2']);
  });

  it('rejects play when a deck is empty', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], []],
      }),
    );
    expect(canPlay(G(client))).toBe(false);
  });

  it('ignores play once the round cap is reached', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[makeCard('hearts', 'A')], [makeCard('spades', '2')]],
        rounds: MAX_ROUNDS,
      }),
    );
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
    const before = structuredClone(G(client));
    client.moves.play();
    expect(G(client)).toEqual(before);
  });
});

describe('War ties', () => {
  it('resolves war with 1 face-down + 1 face-up when both have exactly enough', () => {
    // Each starts with 4 cards: face-up tie, 1 down, 1 up to decide.
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [
            makeCard('hearts', '5'),
            makeCard('clubs', '2'),
            makeCard('diamonds', '9'),
            makeCard('spades', '3'),
          ],
          [
            makeCard('spades', '5'),
            makeCard('hearts', '4'),
            makeCard('clubs', '7'),
            makeCard('diamonds', '6'),
          ],
        ],
      }),
    );
    client.moves.play();
    const g = G(client);
    expect(g.lastWasWar).toBe(true);
    expect(g.warDownCounts).toEqual([1, 1]);
    expect(g.faceUp[0]?.id).toBe('diamonds-9');
    expect(g.faceUp[1]?.id).toBe('clubs-7');
    expect(g.lastWinner).toBe('0');
    // Winner takes all 6 pot cards; each had 1 leftover.
    expect(g.decks[0]).toHaveLength(1 + 6);
    expect(g.decks[1]).toHaveLength(1);
  });

  it('uses 3 face-down + 1 face-up when both have at least 4 cards after the tie', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [
            makeCard('hearts', '8'),
            makeCard('clubs', '2'),
            makeCard('diamonds', '3'),
            makeCard('spades', '4'),
            makeCard('hearts', 'A'),
            makeCard('clubs', '5'),
          ],
          [
            makeCard('spades', '8'),
            makeCard('hearts', '6'),
            makeCard('diamonds', '7'),
            makeCard('clubs', '9'),
            makeCard('spades', '10'),
            makeCard('hearts', 'J'),
          ],
        ],
      }),
    );
    client.moves.play();
    const g = G(client);
    expect(g.lastWasWar).toBe(true);
    expect(g.warDownCounts).toEqual([3, 3]);
    expect(g.faceUp[0]?.rank).toBe('A');
    expect(g.faceUp[1]?.rank).toBe('10');
    expect(g.lastWinner).toBe('0');
  });

  it('ends the game when a player cannot complete war', () => {
    // Tie on the only card each has left after playing - neither can war.
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[makeCard('hearts', '9')], [makeCard('spades', '9')]],
      }),
    );
    client.moves.play();
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('awards the win when only one player can complete war', () => {
    // After tie, p0 has 2 left (can 1+1), p1 has 1 left (cannot).
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [makeCard('hearts', '6'), makeCard('clubs', '2'), makeCard('diamonds', 'K')],
          [makeCard('spades', '6'), makeCard('hearts', '3')],
        ],
      }),
    );
    client.moves.play();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('awards player 1 the win when player 0 cannot complete war', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [makeCard('hearts', '6'), makeCard('clubs', '2')],
          [makeCard('spades', '6'), makeCard('hearts', '3'), makeCard('diamonds', 'K')],
        ],
      }),
    );
    client.moves.play();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('resolves a nested war when the war face-up cards also tie', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [
            makeCard('hearts', '5'),
            makeCard('clubs', '2'),
            makeCard('diamonds', '3'),
            makeCard('spades', '4'),
            makeCard('hearts', '9'),
            makeCard('clubs', '6'),
            makeCard('diamonds', '7'),
            makeCard('spades', '8'),
            makeCard('hearts', 'A'),
          ],
          [
            makeCard('spades', '5'),
            makeCard('hearts', '2'),
            makeCard('clubs', '3'),
            makeCard('diamonds', '4'),
            makeCard('spades', '9'),
            makeCard('hearts', '6'),
            makeCard('clubs', '7'),
            makeCard('diamonds', '8'),
            makeCard('spades', 'K'),
          ],
        ],
      }),
    );
    client.moves.play();
    const g = G(client);
    expect(g.lastWasWar).toBe(true);
    expect(g.warDownCounts).toEqual([6, 6]);
    expect(g.faceUp[0]?.rank).toBe('A');
    expect(g.faceUp[1]?.rank).toBe('K');
    expect(g.lastWinner).toBe('0');
  });
});

describe('War endgame', () => {
  it('wins when the opponent is emptied by a normal fight', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[makeCard('hearts', 'Q')], [makeCard('clubs', '2')]],
      }),
    );
    client.moves.play();
    expect(G(client).decks[1]).toHaveLength(0);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('reports a draw when both decks are already empty', () => {
    const client = warClient(() => createEmptyWarState());
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('awards player 1 when player 0 starts empty', () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [[], [makeCard('spades', 'A')]],
      }),
    );
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it(`draws after ${MAX_ROUNDS} rounds without an empty deck`, () => {
    const client = warClient(() =>
      createEmptyWarState({
        decks: [
          [makeCard('hearts', 'A'), makeCard('clubs', '3')],
          [makeCard('spades', 'K'), makeCard('diamonds', '2')],
        ],
        rounds: MAX_ROUNDS - 1,
      }),
    );
    client.moves.play();
    expect(G(client).rounds).toBe(MAX_ROUNDS);
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });
});

describe('resolveFight guards', () => {
  it('returns draw when both decks are empty', () => {
    expect(resolveFight(createEmptyWarState())).toEqual({ draw: true });
  });

  it('returns the seat that still has cards when the other is empty', () => {
    expect(
      resolveFight(
        createEmptyWarState({
          decks: [[makeCard('hearts', 'A')], []],
        }),
      ),
    ).toEqual({ winner: '0' });
    expect(
      resolveFight(
        createEmptyWarState({
          decks: [[], [makeCard('spades', 'K')]],
        }),
      ),
    ).toEqual({ winner: '1' });
  });
});

describe('War ai', () => {
  const enumerate = War.ai!.enumerate as (
    g: WarState,
    ctx: { currentPlayer: string },
  ) => { move: string; args?: unknown[] }[];

  it('always enumerates play when both decks have cards', () => {
    expect(
      enumerate(
        createEmptyWarState({
          decks: [[makeCard('hearts', 'A')], [makeCard('spades', '2')]],
        }),
        { currentPlayer: '0' },
      ),
    ).toEqual([{ move: 'play' }]);
  });

  it('enumerates nothing when play is illegal', () => {
    expect(
      enumerate(createEmptyWarState({ decks: [[makeCard('hearts', 'A')], []] }), {
        currentPlayer: '0',
      }),
    ).toEqual([]);
  });
});
