import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import { idx } from '../shared/grid';
import { legalPlaces, Reversi, type ReversiState, SIZE } from './game';

function startClient(setup?: () => ReversiState) {
  const client = Client({
    game: setup ? { ...Reversi, setup } : Reversi,
  });
  client.start();
  return client;
}

/** Standard centre: d4/e5 light, e4/d5 dark (a1 bottom-left). */
function centreFour(): (string | null)[] {
  const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
  cells[idx(3, 3, SIZE)] = '0'; // d5 dark
  cells[idx(3, 4, SIZE)] = '1'; // e5 light
  cells[idx(4, 3, SIZE)] = '1'; // d4 light
  cells[idx(4, 4, SIZE)] = '0'; // e4 dark
  return cells;
}

describe('Reversi setup', () => {
  it('places the four centre discs with dark to move', () => {
    const client = startClient();
    const G = client.getState()?.G as ReversiState;
    expect(G.cells).toEqual(centreFour());
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });
});

describe('Reversi place', () => {
  it('flips outflanked discs on a legal place', () => {
    const client = startClient();
    // Black c4 (row 4, col 2) flips d4 light
    client.moves.place(idx(4, 2, SIZE));
    const G = client.getState()?.G as ReversiState;
    expect(G.cells[idx(4, 2, SIZE)]).toBe('0');
    expect(G.cells[idx(4, 3, SIZE)]).toBe('0');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects an empty cell that does not outflank', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as ReversiState;
    const player = client.getState()?.ctx.currentPlayer;
    client.moves.place(0);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe(player);
  });

  it('rejects an occupied cell', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as ReversiState;
    client.moves.place(idx(4, 3, SIZE));
    expect(client.getState()?.G).toEqual(before);
  });

  it('rejects out-of-range index', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as ReversiState;
    client.moves.place(-1);
    client.moves.place(SIZE * SIZE);
    expect(client.getState()?.G).toEqual(before);
  });

  it('rejects non-integer place arguments', () => {
    const G: ReversiState = { cells: centreFour() };
    const place = Reversi.moves!.place as (
      ctx: {
        G: ReversiState;
        ctx: { currentPlayer: string };
      },
      i: unknown,
    ) => unknown;
    expect(place({ G, ctx: { currentPlayer: '0' } }, '3')).toBe(INVALID_MOVE);
    expect(place({ G, ctx: { currentPlayer: '0' } }, 3.5)).toBe(INVALID_MOVE);
  });
});

describe('legalPlaces', () => {
  it('lists the four opening moves for dark', () => {
    const G: ReversiState = { cells: centreFour() };
    expect(legalPlaces(G, '0').sort((a, b) => a - b)).toEqual(
      [idx(2, 4, SIZE), idx(3, 5, SIZE), idx(4, 2, SIZE), idx(5, 3, SIZE)].sort((a, b) => a - b),
    );
  });
});

describe('Reversi pass', () => {
  it('is illegal when the current player has a place', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as ReversiState;
    const player = client.getState()?.ctx.currentPlayer;
    client.moves.pass();
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe(player);
  });

  it('is legal and ends the turn when no places exist', () => {
    // Nearly full of light; one empty at 0 and one dark at 1.
    // Dark cannot outflank into 0; light can (opp then own).
    const cells = Array(SIZE * SIZE).fill('1') as (string | null)[];
    cells[0] = null;
    cells[1] = '0';
    const client = startClient(() => ({ cells }));
    expect(legalPlaces(client.getState()?.G as ReversiState, '0')).toEqual([]);
    expect(legalPlaces(client.getState()?.G as ReversiState, '1')).toEqual([0]);
    client.moves.pass();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });
});

describe('Reversi endIf', () => {
  it('awards majority to dark when neither player can place', () => {
    const cells = Array(SIZE * SIZE).fill('0') as (string | null)[];
    cells[0] = '1';
    cells[1] = '1';
    const client = startClient(() => ({ cells }));
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('awards majority to light when neither player can place', () => {
    const cells = Array(SIZE * SIZE).fill('1') as (string | null)[];
    cells[0] = '0';
    cells[1] = '0';
    const client = startClient(() => ({ cells }));
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('draws when disc counts are equal and neither can move', () => {
    const cells = Array(SIZE * SIZE).fill(null) as (string | null)[];
    for (let i = 0; i < 32; i++) cells[i] = '0';
    for (let i = 32; i < 64; i++) cells[i] = '1';
    const client = startClient(() => ({ cells }));
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('continues when only the opponent has places', () => {
    const cells = Array(SIZE * SIZE).fill('1') as (string | null)[];
    cells[0] = null;
    cells[1] = '0';
    const client = startClient(() => ({ cells }));
    expect(client.getState()?.ctx.gameover).toBeUndefined();
  });
});

describe('Reversi ai', () => {
  it('enumerates legal places from the opening', () => {
    const G: ReversiState = { cells: centreFour() };
    const moves = (
      Reversi.ai!.enumerate as (
        G: ReversiState,
        ctx: { currentPlayer: string },
      ) => { move: string; args?: number[] }[]
    )(G, { currentPlayer: '0' });
    expect(moves.map((m) => m.args![0]).sort((a, b) => a - b)).toEqual(
      legalPlaces(G, '0').sort((a, b) => a - b),
    );
    expect(moves.every((m) => m.move === 'place')).toBe(true);
  });

  it('enumerates pass when there are no places', () => {
    const cells = Array(SIZE * SIZE).fill('1') as (string | null)[];
    cells[0] = null;
    cells[1] = '0';
    const G: ReversiState = { cells };
    expect(
      (
        Reversi.ai!.enumerate as (
          G: ReversiState,
          ctx: { currentPlayer: string },
        ) => { move: string }[]
      )(G, { currentPlayer: '0' }),
    ).toEqual([{ move: 'pass' }]);
  });
});
