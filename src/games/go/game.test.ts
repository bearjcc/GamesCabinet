import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import { idx } from '../shared/grid';
import { Go, type GoState, legalPlaces, SIZE } from './game';

function emptyState(overrides: Partial<GoState> = {}): GoState {
  return {
    cells: Array(SIZE * SIZE).fill(null) as (string | null)[],
    captures: [0, 0],
    koPoint: null,
    lastPass: false,
    consecutivePasses: 0,
    ...overrides,
  };
}

function startClient(setup?: () => GoState) {
  const client = Client({
    game: setup ? { ...Go, setup } : Go,
  });
  client.start();
  return client;
}

/** Classic ko: white alone at (3,5) with liberty (3,4); black takes. */
function koPosition(): (string | null)[] {
  const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
  cells[idx(2, 4, SIZE)] = '1';
  cells[idx(2, 5, SIZE)] = '0';
  cells[idx(3, 3, SIZE)] = '1';
  cells[idx(3, 5, SIZE)] = '1';
  cells[idx(3, 6, SIZE)] = '0';
  cells[idx(4, 4, SIZE)] = '1';
  cells[idx(4, 5, SIZE)] = '0';
  return cells;
}

describe('Go setup', () => {
  it('starts with an empty 9x9 board and black to move', () => {
    const client = startClient();
    const G = client.getState()?.G as GoState;
    expect(G.cells).toHaveLength(81);
    expect(G.cells.every((c) => c === null)).toBe(true);
    expect(G.captures).toEqual([0, 0]);
    expect(G.koPoint).toBeNull();
    expect(G.lastPass).toBe(false);
    expect(G.consecutivePasses).toBe(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });
});

describe('Go place', () => {
  it('places a stone for the current player', () => {
    const client = startClient();
    const at = idx(4, 4, SIZE);
    client.moves.place(at);
    const G = client.getState()?.G as GoState;
    expect(G.cells[at]).toBe('0');
    expect(G.lastPass).toBe(false);
    expect(G.consecutivePasses).toBe(0);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects an occupied cell', () => {
    const client = startClient();
    const at = idx(4, 4, SIZE);
    client.moves.place(at);
    const before = structuredClone(client.getState()?.G) as GoState;
    const player = client.getState()?.ctx.currentPlayer;
    client.moves.place(at);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe(player);
  });

  it('rejects out-of-range and non-integer indices', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as GoState;
    client.moves.place(-1);
    client.moves.place(SIZE * SIZE);
    expect(client.getState()?.G).toEqual(before);

    const G = emptyState();
    const place = Go.moves!.place as (
      ctx: { G: GoState; ctx: { currentPlayer: string } },
      i: unknown,
    ) => unknown;
    expect(place({ G, ctx: { currentPlayer: '0' } }, '3')).toBe(INVALID_MOVE);
    expect(place({ G, ctx: { currentPlayer: '0' } }, 3.5)).toBe(INVALID_MOVE);
  });

  it('captures an opponent group with no liberties', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    const target = idx(4, 4, SIZE);
    cells[target] = '1';
    cells[idx(3, 4, SIZE)] = '0';
    cells[idx(5, 4, SIZE)] = '0';
    cells[idx(4, 5, SIZE)] = '0';
    const captureAt = idx(4, 3, SIZE);
    const client = startClient(() => emptyState({ cells }));
    client.moves.place(captureAt);
    const G = client.getState()?.G as GoState;
    expect(G.cells[target]).toBeNull();
    expect(G.cells[captureAt]).toBe('0');
    expect(G.captures).toEqual([1, 0]);
  });

  it('rejects suicide that leaves own group with zero liberties', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    const hole = idx(4, 4, SIZE);
    cells[idx(3, 4, SIZE)] = '1';
    cells[idx(5, 4, SIZE)] = '1';
    cells[idx(4, 3, SIZE)] = '1';
    cells[idx(4, 5, SIZE)] = '1';
    const client = startClient(() => emptyState({ cells }));
    const before = structuredClone(client.getState()?.G) as GoState;
    client.moves.place(hole);
    expect(client.getState()?.G).toEqual(before);
  });

  it('allows a capturing move that would otherwise be suicide', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    cells[idx(4, 4, SIZE)] = '1';
    cells[idx(3, 4, SIZE)] = '0';
    cells[idx(5, 4, SIZE)] = '0';
    cells[idx(4, 5, SIZE)] = '0';
    const client = startClient(() => emptyState({ cells }));
    client.moves.place(idx(4, 3, SIZE));
    const G = client.getState()?.G as GoState;
    expect(G.cells[idx(4, 4, SIZE)]).toBeNull();
    expect(G.cells[idx(4, 3, SIZE)]).toBe('0');
  });
});

describe('Go simple ko', () => {
  it('forbids immediate recapture that recreates the prior board', () => {
    const capturePlay = idx(3, 4, SIZE);
    const captured = idx(3, 5, SIZE);
    const client = startClient(() => emptyState({ cells: koPosition() }));
    client.moves.place(capturePlay);
    let G = client.getState()?.G as GoState;
    expect(G.cells[captured]).toBeNull();
    expect(G.cells[capturePlay]).toBe('0');
    expect(G.captures).toEqual([1, 0]);
    expect(G.koPoint).toBe(captured);

    const before = structuredClone(G);
    client.moves.place(captured);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');

    client.moves.place(idx(0, 0, SIZE));
    G = client.getState()?.G as GoState;
    expect(G.koPoint).toBeNull();
    expect(G.cells[idx(0, 0, SIZE)]).toBe('1');
  });

  it('clears ko after a pass', () => {
    const client = startClient(() => emptyState({ cells: koPosition() }));
    client.moves.place(idx(3, 4, SIZE));
    const afterCapture = client.getState()?.G as GoState;
    expect(afterCapture.koPoint).toBe(idx(3, 5, SIZE));
    client.moves.pass();
    const afterPass = client.getState()?.G as GoState;
    expect(afterPass.koPoint).toBeNull();
  });
});

describe('Go pass', () => {
  it('is always legal and tracks consecutive passes', () => {
    const client = startClient();
    client.moves.pass();
    let G = client.getState()?.G as GoState;
    expect(G.lastPass).toBe(true);
    expect(G.consecutivePasses).toBe(1);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    expect(client.getState()?.ctx.gameover).toBeUndefined();

    client.moves.pass();
    G = client.getState()?.G as GoState;
    expect(G.consecutivePasses).toBe(2);
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('resets consecutive passes after a place', () => {
    const client = startClient();
    client.moves.pass();
    const afterPass = client.getState()?.G as GoState;
    expect(afterPass.consecutivePasses).toBe(1);
    client.moves.place(idx(4, 4, SIZE));
    const G = client.getState()?.G as GoState;
    expect(G.consecutivePasses).toBe(0);
    expect(G.lastPass).toBe(false);
  });
});

describe('Go endIf scoring', () => {
  it('awards majority by stones on board plus captures', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    cells[0] = '0';
    cells[1] = '0';
    cells[2] = '1';
    const client = startClient(() => emptyState({ cells, captures: [0, 0] }));
    client.moves.pass();
    client.moves.pass();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('includes captures in the score', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    cells[0] = '0';
    cells[1] = '1';
    cells[2] = '1';
    const client = startClient(() => emptyState({ cells, captures: [2, 0] }));
    client.moves.pass();
    client.moves.pass();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('awards white when white has the majority', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    cells[0] = '0';
    cells[1] = '1';
    cells[2] = '1';
    const client = startClient(() => emptyState({ cells }));
    client.moves.pass();
    client.moves.pass();
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});

describe('legalPlaces', () => {
  it('excludes occupied, suicide, and ko points', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    const hole = idx(4, 4, SIZE);
    cells[idx(3, 4, SIZE)] = '1';
    cells[idx(5, 4, SIZE)] = '1';
    cells[idx(4, 3, SIZE)] = '1';
    cells[idx(4, 5, SIZE)] = '1';
    cells[0] = '0';
    const G = emptyState({ cells, koPoint: 1 });
    const places = legalPlaces(G, '0');
    expect(places).not.toContain(hole);
    expect(places).not.toContain(0);
    expect(places).not.toContain(1);
    expect(places).toContain(idx(0, 2, SIZE));
  });
});

describe('Go ai', () => {
  it('enumerates legal places plus pass', () => {
    const G = emptyState();
    const moves = (
      Go.ai!.enumerate as (
        G: GoState,
        ctx: { currentPlayer: string },
      ) => { move: string; args?: number[] }[]
    )(G, { currentPlayer: '0' });
    const places = moves.filter((m) => m.move === 'place').map((m) => m.args![0]);
    expect(places.sort((a, b) => a - b)).toEqual(legalPlaces(G, '0').sort((a, b) => a - b));
    expect(moves.some((m) => m.move === 'pass')).toBe(true);
  });
});
