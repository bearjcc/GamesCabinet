import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  allInHome,
  BAR,
  Backgammon,
  type BackgammonState,
  checkerCount,
  isOpenPoint,
  legalPlays,
  pointOwner,
} from './game';

function startClient(setup?: () => BackgammonState, seed = 'backgammon') {
  const client = Client({
    game: setup ? { ...Backgammon, seed, setup } : { ...Backgammon, seed },
    numPlayers: 2,
  });
  client.start();
  return client;
}

/** Client whose first player to move is seat 1. */
function startP1Client(setup: () => BackgammonState) {
  const client = Client({
    game: {
      ...Backgammon,
      setup,
      turn: {
        ...Backgammon.turn,
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

function G(client: ReturnType<typeof startClient>): BackgammonState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as BackgammonState;
}

function emptyPoints(): number[] {
  return Array(25).fill(0);
}

/** Custom board mid-turn with dice already rolled. */
function midTurn(partial: Partial<BackgammonState> & { points: number[] }): BackgammonState {
  return {
    bar: [0, 0],
    borne: [0, 0],
    dice: [1, 2],
    hasRolled: true,
    ...partial,
  };
}

describe('Backgammon setup', () => {
  it('uses the standard 15-checker starting positions', () => {
    const client = startClient();
    const g = G(client);
    expect(g.points[24]).toBe(2);
    expect(g.points[13]).toBe(5);
    expect(g.points[8]).toBe(3);
    expect(g.points[6]).toBe(5);
    expect(g.points[1]).toBe(-2);
    expect(g.points[12]).toBe(-5);
    expect(g.points[17]).toBe(-3);
    expect(g.points[19]).toBe(-5);
    expect(g.bar).toEqual([0, 0]);
    expect(g.borne).toEqual([0, 0]);
    expect(g.dice).toEqual([]);
    expect(g.hasRolled).toBe(false);
    expect(g.points.reduce((n, v) => n + (v > 0 ? v : 0), 0) + g.bar[0] + g.borne[0]).toBe(15);
    expect(g.points.reduce((n, v) => n + (v < 0 ? -v : 0), 0) + g.bar[1] + g.borne[1]).toBe(15);
  });
});

describe('Backgammon roll', () => {
  it('rolls two dice and marks the turn as rolled', () => {
    const client = startClient();
    client.moves.roll();
    const g = G(client);
    expect(g.hasRolled).toBe(true);
    expect(g.dice.length === 2 || g.dice.length === 4).toBe(true);
    for (const d of g.dice) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }
  });

  it('rejects a second roll in the same turn', () => {
    const client = startClient();
    client.moves.roll();
    const before = structuredClone(G(client));
    client.moves.roll();
    expect(G(client)).toEqual(before);
  });

  it('expands doubles to four equal dice', () => {
    let found: number[] | null = null;
    for (let i = 0; i < 40; i++) {
      const c = startClient(undefined, `bg-doubles-${i}`);
      c.moves.roll();
      const dice = G(c).dice;
      if (dice.length === 4 && dice.every((d) => d === dice[0])) {
        found = dice;
        break;
      }
    }
    expect(found).not.toBeNull();
    expect(found).toHaveLength(4);
    expect(new Set(found ?? []).size).toBe(1);
  });
});

describe('Backgammon play', () => {
  it('moves a checker by the chosen die and consumes that die', () => {
    const points = emptyPoints();
    points[8] = 2;
    points[1] = -2;
    const client = startClient(() => midTurn({ points, dice: [3, 1] }));
    client.moves.play(8, 0); // 8 - 3 = 5
    const g = G(client);
    expect(g.points[8]).toBe(1);
    expect(g.points[5]).toBe(1);
    expect(g.dice).toEqual([1]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('hits a blot and sends the opponent to the bar', () => {
    const points = emptyPoints();
    points[8] = 1;
    points[5] = -1;
    const client = startClient(() => midTurn({ points, dice: [3] }));
    client.moves.play(8, 0);
    const g = G(client);
    expect(g.points[8]).toBe(0);
    expect(g.points[5]).toBe(1);
    expect(g.bar[1]).toBe(1);
  });

  it('rejects landing on a point with two or more opponents', () => {
    const points = emptyPoints();
    points[8] = 1;
    points[5] = -2;
    const client = startClient(() => midTurn({ points, dice: [3] }));
    const before = structuredClone(G(client));
    client.moves.play(8, 0);
    expect(G(client)).toEqual(before);
  });

  it('requires entering from the bar before other moves', () => {
    const points = emptyPoints();
    points[8] = 1;
    const client = startClient(() => midTurn({ points, bar: [1, 0], dice: [5, 2] }));
    const before = structuredClone(G(client));
    client.moves.play(8, 1);
    expect(G(client)).toEqual(before);
    client.moves.play(BAR, 0); // enter on 25-5 = 20
    const g = G(client);
    expect(g.bar[0]).toBe(0);
    expect(g.points[20]).toBe(1);
    expect(g.dice).toEqual([2]);
  });

  it('lists player 1 bar entry onto the die point', () => {
    const points = emptyPoints();
    points[24] = 1;
    const state = midTurn({ points, bar: [0, 1], dice: [4] });
    expect(legalPlays(state, '1')).toEqual([{ from: BAR, dieIndex: 0, to: 4 }]);
  });

  it('player 1 moves low to high', () => {
    const points = emptyPoints();
    points[4] = -1;
    expect(legalPlays(midTurn({ points, dice: [3] }), '1')).toEqual([
      { from: 4, dieIndex: 0, to: 7 },
    ]);
  });

  it('player 1 can complete a move after player 0 passes', () => {
    const points = emptyPoints();
    points[8] = 1;
    for (let p = 2; p <= 7; p++) points[p] = -2;
    points[10] = -1;
    const client = startClient(() => midTurn({ points, dice: [1] }));
    client.moves.pass();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.roll();
    // Force a known die by playing from a crafted mid-turn as P1 via pass-then-setup:
    // After pass, onBegin cleared dice — roll then find a legal play for P1.
    const g = G(client);
    expect(g.hasRolled).toBe(true);
    const plays = legalPlays(g, '1');
    expect(plays.length).toBeGreaterThan(0);
    const first = plays[0];
    client.moves.play(first.from, first.dieIndex);
    expect(
      pointOwner(G(client).points[first.to === 0 ? 10 : first.to]) !== null || first.to === 0,
    ).toBe(true);
  });

  it('bears off when all checkers are in the home board', () => {
    const points = emptyPoints();
    points[3] = 2;
    points[2] = 1;
    const client = startClient(() => midTurn({ points, borne: [12, 0], dice: [3] }));
    client.moves.play(3, 0);
    const g = G(client);
    expect(g.points[3]).toBe(1);
    expect(g.borne[0]).toBe(13);
  });

  it('rejects bear-off while checkers remain outside home', () => {
    const points = emptyPoints();
    points[3] = 1;
    points[8] = 1;
    const client = startClient(() => midTurn({ points, borne: [13, 0], dice: [3] }));
    const before = structuredClone(G(client));
    client.moves.play(3, 0);
    expect(G(client)).toEqual(before);
  });

  it('allows overshoot bear-off only from the highest home point', () => {
    const points = emptyPoints();
    points[2] = 1;
    points[1] = 1;
    const client = startClient(() => midTurn({ points, borne: [13, 0], dice: [5] }));
    const before = structuredClone(G(client));
    client.moves.play(1, 0);
    expect(G(client)).toEqual(before);
    client.moves.play(2, 0);
    expect(G(client).borne[0]).toBe(14);
    expect(G(client).points[2]).toBe(0);
  });

  it('ends the turn when the last die is spent', () => {
    const points = emptyPoints();
    points[8] = 1;
    points[1] = -1;
    const client = startClient(() => midTurn({ points, dice: [2] }));
    client.moves.play(8, 0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    expect(G(client).hasRolled).toBe(false);
    expect(G(client).dice).toEqual([]);
  });

  it('pass ends the turn when no legal plays remain', () => {
    const points = emptyPoints();
    points[8] = 1;
    points[7] = -2;
    points[6] = -2;
    points[5] = -2;
    points[4] = -2;
    points[3] = -2;
    points[2] = -2;
    const client = startClient(() => midTurn({ points, dice: [1, 2] }));
    expect(legalPlays(G(client), '0')).toEqual([]);
    client.moves.pass();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects pass when a legal play exists', () => {
    const points = emptyPoints();
    points[8] = 1;
    const client = startClient(() => midTurn({ points, dice: [1] }));
    const before = structuredClone(G(client));
    client.moves.pass();
    expect(G(client)).toEqual(before);
  });

  it('wins when all 15 checkers are borne off', () => {
    const points = emptyPoints();
    points[1] = 1;
    const client = startClient(() => midTurn({ points, borne: [14, 0], dice: [1] }));
    client.moves.play(1, 0);
    const over = client.getState()?.ctx.gameover as { winner: string };
    expect(over.winner).toBe('0');
    expect(G(client).borne[0]).toBe(15);
  });

  it('rejects play before rolling, bad args, and stacks on own point', () => {
    const points = emptyPoints();
    points[8] = 1;
    points[6] = 2;
    const unrolled = startClient(() => midTurn({ points, dice: [], hasRolled: false }));
    const before = structuredClone(G(unrolled));
    unrolled.moves.play(8, 0);
    expect(G(unrolled)).toEqual(before);

    const client = startClient(() => midTurn({ points, dice: [2] }));
    const prior = structuredClone(G(client));
    client.moves.play(8, 3);
    client.moves.play(8, -1);
    client.moves.play(8, 1.5);
    client.moves.play(25, 0);
    client.moves.play(-1, 0);
    expect(G(client)).toEqual(prior);

    client.moves.play(8, 0); // 8 -> 6 onto own stack
    expect(G(client).points[6]).toBe(3);
    expect(G(client).points[8]).toBe(0);
  });

  it('rejects entering onto a closed point from the bar', () => {
    const points = emptyPoints();
    points[20] = -2; // closes P0 entry for die 5
    const state = midTurn({ points, bar: [1, 0], dice: [5] });
    expect(legalPlays(state, '0')).toEqual([]);
  });

  it('player 1 hits, bears off with overshoot, and can win', () => {
    const points = emptyPoints();
    points[10] = 1; // blot
    points[7] = -1;
    const client = startP1Client(() => midTurn({ points, dice: [3] }));
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.play(7, 0); // 7+3=10 hit
    expect(G(client).points[10]).toBe(-1);
    expect(G(client).bar[0]).toBe(1);

    const home = emptyPoints();
    home[22] = -1;
    home[20] = -1;
    const bear = startP1Client(() => midTurn({ points: home, borne: [0, 13], dice: [6] }));
    // P1 furthest-from-off is lowest home point (20, dist 5); die 6 overshoots from 20 only
    const prior = structuredClone(G(bear));
    bear.moves.play(22, 0);
    expect(G(bear)).toEqual(prior);
    bear.moves.play(20, 0);
    expect(G(bear).borne[1]).toBe(14);

    const winPts = emptyPoints();
    winPts[24] = -1;
    const win = startP1Client(() => midTurn({ points: winPts, borne: [0, 14], dice: [1] }));
    win.moves.play(24, 0);
    const over = win.getState()?.ctx.gameover as { winner: string } | undefined;
    expect(over?.winner).toBe('1');
  });

  it('rejects pass before rolling', () => {
    const client = startClient();
    const before = structuredClone(G(client));
    client.moves.pass();
    expect(G(client)).toEqual(before);
  });
});

describe('Backgammon helpers', () => {
  it('reads owners and counts from signed points', () => {
    expect(pointOwner(3)).toBe('0');
    expect(checkerCount(3)).toBe(3);
    expect(pointOwner(-2)).toBe('1');
    expect(checkerCount(-2)).toBe(2);
    expect(pointOwner(0)).toBe(null);
    expect(checkerCount(0)).toBe(0);
  });

  it('classifies open points and home-board readiness', () => {
    const points = emptyPoints();
    points[5] = 2;
    points[6] = -1;
    points[7] = -2;
    expect(isOpenPoint(points, '0', 5)).toBe(true);
    expect(isOpenPoint(points, '0', 6)).toBe(true);
    expect(isOpenPoint(points, '0', 7)).toBe(false);
    expect(isOpenPoint(points, '0', 0)).toBe(false);
    expect(isOpenPoint(points, '0', 25)).toBe(false);

    const g = midTurn({ points: emptyPoints(), bar: [1, 0], dice: [1] });
    g.points[3] = 1;
    expect(allInHome(g, '0')).toBe(false);
    g.bar[0] = 0;
    g.points[8] = 1;
    expect(allInHome(g, '0')).toBe(false);
    g.points[8] = 0;
    expect(allInHome(g, '0')).toBe(true);
  });

  it('returns no legal plays before roll or with empty dice', () => {
    const points = emptyPoints();
    points[8] = 1;
    expect(legalPlays(midTurn({ points, dice: [2], hasRolled: false }), '0')).toEqual([]);
    expect(legalPlays(midTurn({ points, dice: [], hasRolled: true }), '0')).toEqual([]);
  });
});

describe('Backgammon ai.enumerate', () => {
  it('offers roll before dice are rolled', () => {
    const client = startClient();
    const moves = Backgammon.ai?.enumerate?.(G(client), client.getState()!.ctx, '0');
    expect(moves).toEqual([{ move: 'roll' }]);
  });

  it('offers play moves after rolling', () => {
    const points = emptyPoints();
    points[8] = 1;
    const state = midTurn({ points, dice: [2, 1] });
    const moves = Backgammon.ai?.enumerate?.(
      state,
      { currentPlayer: '0', numPlayers: 2 } as never,
      '0',
    );
    const moveNames = (moves ?? []).flatMap((m) => ('move' in m ? [m.move] : []));
    expect(moveNames).toContain('play');
    expect(moveNames).not.toContain('roll');
  });

  it('offers pass when stuck after rolling', () => {
    const points = emptyPoints();
    points[8] = 1;
    for (let p = 2; p <= 7; p++) points[p] = -2;
    const state = midTurn({ points, dice: [1, 2] });
    const moves = Backgammon.ai?.enumerate?.(
      state,
      { currentPlayer: '0', numPlayers: 2 } as never,
      '0',
    );
    expect(moves).toEqual([{ move: 'pass' }]);
  });
});
