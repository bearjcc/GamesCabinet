import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  advancePosition,
  applyDie,
  BOARD_SIZE,
  FINAL_SQUARE,
  resolveSquare,
  SNAKES_AND_LADDERS,
  SnakesAndLadders,
  type SnakesAndLaddersState,
  squareAt,
} from './game';

function startClient(setup?: () => SnakesAndLaddersState, seed = 'sal') {
  const client = Client({
    game: setup ? { ...SnakesAndLadders, seed, setup } : { ...SnakesAndLadders, seed },
    numPlayers: 2,
  });
  client.start();
  return client;
}

function startP1Client(setup: () => SnakesAndLaddersState, seed: string) {
  const client = Client({
    game: {
      ...SnakesAndLadders,
      seed,
      setup,
      turn: {
        ...SnakesAndLadders.turn,
        order: {
          first: () => 1,
          next: ({ ctx }) => (ctx.playOrderPos === 1 ? 0 : 1),
        },
      },
    },
    numPlayers: 2,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof startClient>): SnakesAndLaddersState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as SnakesAndLaddersState;
}

/** Find a Client seed whose first D6 equals `face` for the given setup. */
function clientWithFirstRoll(
  face: number,
  setup: () => SnakesAndLaddersState,
  prefix: string,
): ReturnType<typeof startClient> {
  for (let i = 0; i < 64; i++) {
    const client = startClient(setup, `${prefix}-${i}`);
    client.moves.roll();
    if (G(client).lastRoll === face) return client;
  }
  throw new Error(`no seed yielded first roll ${face} for ${prefix}`);
}

describe('SnakesAndLadders board constants', () => {
  it('uses a classic 10x10 board ending at 100', () => {
    expect(BOARD_SIZE).toBe(10);
    expect(FINAL_SQUARE).toBe(100);
  });

  it('has a fixed deterministic snakes and ladders table', () => {
    expect(SNAKES_AND_LADDERS[1]).toBe(38);
    expect(SNAKES_AND_LADDERS[16]).toBe(6);
    expect(SNAKES_AND_LADDERS[80]).toBe(100);
    expect(SNAKES_AND_LADDERS[98]).toBe(78);
    for (const [from, to] of Object.entries(SNAKES_AND_LADDERS)) {
      expect(Number(from)).toBeGreaterThanOrEqual(1);
      expect(Number(from)).toBeLessThanOrEqual(FINAL_SQUARE);
      expect(to).toBeGreaterThanOrEqual(1);
      expect(to).toBeLessThanOrEqual(FINAL_SQUARE);
      expect(to).not.toBe(Number(from));
    }
  });
});

describe('advancePosition (exact landing with bounce-back)', () => {
  it('advances within the board', () => {
    expect(advancePosition(0, 4)).toBe(4);
    expect(advancePosition(50, 6)).toBe(56);
  });

  it('lands exactly on the final square', () => {
    expect(advancePosition(97, 3)).toBe(100);
    expect(advancePosition(99, 1)).toBe(100);
  });

  it('bounces back when the roll overshoots the final square', () => {
    // 98 + 5 = 103 -> overshoot 3 -> 97
    expect(advancePosition(98, 5)).toBe(97);
    // 99 + 2 = 101 -> overshoot 1 -> 99
    expect(advancePosition(99, 2)).toBe(99);
    // 95 + 6 = 101 -> overshoot 1 -> 99
    expect(advancePosition(95, 6)).toBe(99);
  });
});

describe('squareAt', () => {
  it('maps the boustrophedon grid (bottom-left = 1, top-left = 100)', () => {
    expect(squareAt(9, 0)).toBe(1);
    expect(squareAt(9, 9)).toBe(10);
    expect(squareAt(8, 0)).toBe(20);
    expect(squareAt(8, 9)).toBe(11);
    expect(squareAt(0, 0)).toBe(100);
    expect(squareAt(0, 9)).toBe(91);
  });
});

describe('resolveSquare / applyDie', () => {
  it('climbs ladders and slides snakes', () => {
    expect(resolveSquare(1)).toBe(38);
    expect(resolveSquare(16)).toBe(6);
    expect(resolveSquare(42)).toBe(42);
  });

  it('applies bounce then teleporter in one step', () => {
    expect(applyDie(3, 1)).toBe(14); // 4 ladder -> 14
    expect(applyDie(15, 1)).toBe(6); // 16 snake -> 6
    expect(applyDie(99, 1)).toBe(100);
    expect(applyDie(98, 5)).toBe(97);
  });
});

describe('SnakesAndLadders Client', () => {
  it('starts both pawns off the board with no last roll', () => {
    const client = startClient();
    expect(G(client)).toEqual({
      positions: [0, 0],
      lastRoll: null,
    });
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('rolls 1d6, moves the current pawn, and ends the turn', () => {
    const client = startClient();
    client.moves.roll();
    const g = G(client);
    expect(g.lastRoll).toBeGreaterThanOrEqual(1);
    expect(g.lastRoll).toBeLessThanOrEqual(6);
    expect(g.positions[0]).toBe(applyDie(0, g.lastRoll!));
    expect(g.positions[1]).toBe(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('climbs a ladder when the roll lands on a ladder foot', () => {
    const client = clientWithFirstRoll(
      1,
      () => ({ positions: [3, 0], lastRoll: null }),
      'sal-ladder',
    );
    expect(G(client).positions[0]).toBe(14);
  });

  it('slides a snake when the roll lands on a snake head', () => {
    const client = clientWithFirstRoll(
      1,
      () => ({ positions: [15, 0], lastRoll: null }),
      'sal-snake',
    );
    expect(G(client).positions[0]).toBe(6);
  });

  it('wins on an exact landing on square 100', () => {
    const client = clientWithFirstRoll(
      1,
      () => ({ positions: [99, 0], lastRoll: null }),
      'sal-win',
    );
    expect(G(client).positions[0]).toBe(100);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('moves and wins as seat 1', () => {
    let won = false;
    for (let i = 0; i < 64; i++) {
      const client = startP1Client(
        () => ({ positions: [0, 99], lastRoll: null }),
        `sal-p1-win-${i}`,
      );
      client.moves.roll();
      if (G(client).lastRoll === 1) {
        expect(G(client).positions[1]).toBe(100);
        expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
        won = true;
        break;
      }
    }
    expect(won).toBe(true);
  });

  it('bounces back instead of winning on an overshoot', () => {
    const client = clientWithFirstRoll(
      5,
      () => ({ positions: [98, 0], lastRoll: null }),
      'sal-bounce',
    );
    expect(G(client).positions[0]).toBe(97);
    expect(client.getState()?.ctx.gameover).toBeUndefined();
  });

  it('enumerates only roll for ai', () => {
    const enumerate = SnakesAndLadders.ai!.enumerate as (
      G: SnakesAndLaddersState,
      ctx: unknown,
    ) => { move: string }[];
    expect(enumerate({ positions: [0, 0], lastRoll: null }, {})).toEqual([{ move: 'roll' }]);
  });
});
