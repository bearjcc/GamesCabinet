import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { Yatzy, type YatzyState } from './game';
import { emptyScorecard } from './scoring';

function start(numPlayers = 1, seed = 'yatzy') {
  const client = Client({ game: { ...Yatzy, seed }, numPlayers });
  client.start();
  return client;
}

function G(client: ReturnType<typeof start>): YatzyState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as YatzyState;
}

describe('Yatzy', () => {
  it('rejects a fourth roll', () => {
    const client = start();
    client.moves.rollDice();
    client.moves.rollDice();
    client.moves.rollDice();
    expect(G(client).rolls).toBe(3);
    client.moves.rollDice();
    expect(G(client).rolls).toBe(3);
  });

  it('rejects hold before the first roll', () => {
    const client = start();
    client.moves.toggleDie(0);
    expect(G(client).held[0]).toBe(false);
  });

  it('scores a category and ends the turn', () => {
    const client = start(2);
    client.moves.rollDice();
    const dice = [...G(client).dice];
    client.moves.selectScore('chance');
    expect(G(client).scores[0].chance).toBe(dice.reduce((a, b) => a + b, 0));
    expect(G(client).rolls).toBe(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects scoring the same category twice', () => {
    const client = start();
    client.moves.rollDice();
    client.moves.selectScore('chance');
    client.moves.rollDice();
    const before = G(client).scores[0].chance;
    client.moves.selectScore('chance');
    expect(G(client).scores[0].chance).toBe(before);
    expect(G(client).rolls).toBe(1);
  });

  it('ends when every category is filled', () => {
    const client = start(1, 'full-game');
    const categories = [
      'ones',
      'twos',
      'threes',
      'fours',
      'fives',
      'sixes',
      'onePair',
      'twoPairs',
      'threeOfAKind',
      'fourOfAKind',
      'smallStraight',
      'largeStraight',
      'fullHouse',
      'chance',
      'yatzy',
    ] as const;
    for (const cat of categories) {
      client.moves.rollDice();
      client.moves.selectScore(cat);
    }
    const over = client.getState()?.ctx.gameover as { winner: string };
    expect(over?.winner).toBe('0');
  });

  it('toggles a held die after rolling', () => {
    const client = start();
    client.moves.rollDice();
    client.moves.toggleDie(0);
    expect(G(client).held[0]).toBe(true);
    client.moves.toggleDie(0);
    expect(G(client).held[0]).toBe(false);
  });

  it('rejects an invalid die index and category', () => {
    const client = start();
    client.moves.rollDice();
    client.moves.toggleDie(-1);
    client.moves.toggleDie(5);
    client.moves.selectScore('not-a-category' as never);
    expect(G(client).rolls).toBe(1);
  });

  it('rejects scoring before rolling', () => {
    const client = start();
    client.moves.selectScore('chance');
    expect(G(client).scores[0].chance).toBeNull();
  });

  it('ends with a single winner when totals differ', () => {
    const filled = (value: number) =>
      ({
        ones: value,
        twos: value,
        threes: value,
        fours: value,
        fives: value,
        sixes: value,
        onePair: value,
        twoPairs: value,
        threeOfAKind: value,
        fourOfAKind: value,
        smallStraight: value,
        largeStraight: value,
        fullHouse: value,
        chance: value,
        yatzy: value,
      }) as YatzyState['scores'][number];

    const state: YatzyState = {
      dice: [1, 1, 1, 1, 1],
      held: Array(5).fill(false),
      rolls: 0,
      scores: [filled(2), filled(1)],
    };
    expect(
      (Yatzy.endIf as (ctx: any) => any)({ G: state, ctx: { numPlayers: 2 } as never }),
    ).toEqual({
      winner: '0',
      totals: expect.any(Array),
    });
  });

  it('skips held dice on rerolls', () => {
    const client = start();
    client.moves.rollDice();
    const first = G(client).dice[0];
    client.moves.toggleDie(0);
    client.moves.rollDice();
    expect(G(client).dice[0]).toBe(first);
    expect(G(client).dice[1]).not.toBe(1);
  });

  it('ends in a draw when totals tie', () => {
    const filled = (value: number) =>
      ({
        ones: value,
        twos: value,
        threes: value,
        fours: value,
        fives: value,
        sixes: value,
        onePair: value,
        twoPairs: value,
        threeOfAKind: value,
        fourOfAKind: value,
        smallStraight: value,
        largeStraight: value,
        fullHouse: value,
        chance: value,
        yatzy: value,
      }) as YatzyState['scores'][number];

    const state: YatzyState = {
      dice: [1, 1, 1, 1, 1],
      held: Array(5).fill(false),
      rolls: 0,
      scores: [filled(1), filled(1)],
    };
    expect(
      (Yatzy.endIf as (ctx: any) => any)({ G: state, ctx: { numPlayers: 2 } as never }),
    ).toMatchObject({
      draw: true,
    });
  });
});

describe('Yatzy ai', () => {
  it('returns roll when no rolls remain and score options after rolling', () => {
    const fresh: YatzyState = {
      dice: [1, 1, 1, 1, 1],
      held: Array(5).fill(false),
      rolls: 0,
      scores: [emptyScorecard()],
    };
    expect(
      (Yatzy.ai!.enumerate as (G: any, ctx: any) => any[])(fresh, { currentPlayer: '0' } as never),
    ).toEqual([{ move: 'rollDice' }]);

    const rolled: YatzyState = {
      dice: [2, 3, 4, 5, 6],
      held: [false, false, false, false, false],
      rolls: 1,
      scores: [emptyScorecard()],
    };
    const moves = (Yatzy.ai!.enumerate as (G: any, ctx: any) => any[])(rolled, {
      currentPlayer: '0',
    } as never);
    expect(moves.some((m) => m.move === 'rollDice')).toBe(true);
    expect(moves.some((m) => m.move === 'toggleDie' && m.args?.[0] === 0)).toBe(true);
    expect(moves.some((m) => m.move === 'selectScore' && m.args?.[0] === 'chance')).toBe(true);

    const maxRolled: YatzyState = {
      dice: [2, 3, 4, 5, 6],
      held: Array(5).fill(false),
      rolls: 3,
      scores: [emptyScorecard()],
    };
    const maxMoves = (Yatzy.ai!.enumerate as (G: any, ctx: any) => any[])(maxRolled, {
      currentPlayer: '0',
    } as never);
    expect(maxMoves.some((m) => m.move === 'rollDice')).toBe(false);
    expect(maxMoves.some((m) => m.move === 'toggleDie')).toBe(false);

    const card = emptyScorecard();
    card.chance = 10;
    const partial: YatzyState = {
      dice: [2, 3, 4, 5, 6],
      held: Array(5).fill(false),
      rolls: 3,
      scores: [card],
    };
    const partialMoves = (Yatzy.ai!.enumerate as (G: any, ctx: any) => any[])(partial, {
      currentPlayer: '0',
    } as never);
    expect(partialMoves.some((m) => m.move === 'selectScore' && m.args?.[0] === 'chance')).toBe(
      false,
    );
    expect(partialMoves.some((m) => m.move === 'selectScore' && m.args?.[0] === 'ones')).toBe(true);
  });
});
