import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import { type C4State, COLS, ConnectFour, ROWS } from './game';

function startClient() {
  const client = Client({ game: ConnectFour });
  client.start();
  return client;
}

describe('ConnectFour', () => {
  it('rejects a drop into a full column after six discs', () => {
    const client = startClient();
    for (let i = 0; i < ROWS; i++) {
      client.moves.drop(0);
      if (i < ROWS - 1) client.moves.drop(COLS - 1);
    }
    const before = structuredClone(client.getState()?.G) as C4State;
    const player = client.getState()?.ctx.currentPlayer;
    client.moves.drop(0);
    const after = client.getState()?.G as C4State;
    expect(after.cells).toEqual(before.cells);
    expect(client.getState()?.ctx.currentPlayer).toBe(player);
  });

  it('ends with a vertical win of four', () => {
    const client = startClient();
    client.moves.drop(0);
    client.moves.drop(1);
    client.moves.drop(0);
    client.moves.drop(1);
    client.moves.drop(0);
    client.moves.drop(1);
    client.moves.drop(0);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends with a horizontal win of four', () => {
    const client = startClient();
    client.moves.drop(0);
    client.moves.drop(6);
    client.moves.drop(1);
    client.moves.drop(6);
    client.moves.drop(2);
    client.moves.drop(6);
    client.moves.drop(3);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends with a diagonal win of four', () => {
    const cells = Array(ROWS * COLS).fill(null) as (string | null)[];
    cells[5 * COLS + 0] = '0';
    cells[4 * COLS + 1] = '0';
    cells[3 * COLS + 2] = '0';
    cells[5 * COLS + 3] = '1';
    cells[4 * COLS + 3] = '1';
    cells[3 * COLS + 3] = '1';
    const client = Client({
      game: {
        ...ConnectFour,
        setup: () => ({ cells }),
      },
    });
    client.start();
    client.moves.drop(3);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends in a draw when the board is full', () => {
    const cells = [
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '1',
      '0',
      '0',
      '1',
      '1',
      '1',
      '0',
      '1',
      '1',
      '1',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
    ];
    expect((ConnectFour.endIf as (ctx: any) => any)({ G: { cells }, ctx: {} as never })).toEqual({
      draw: true,
    });
  });

  it('rejects a full-column drop as invalid', () => {
    const cells = Array(ROWS * COLS).fill(null) as (string | null)[];
    for (let row = 0; row < ROWS; row++) cells[row * COLS] = '0';
    const G = { cells };
    expect((ConnectFour.moves!.drop as any)({ G, ctx: { currentPlayer: '0' } } as never, 0)).toBe(
      INVALID_MOVE,
    );
  });

  it('rejects an out-of-range column', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as C4State;
    client.moves.drop(-1);
    client.moves.drop(COLS);
    expect(client.getState()?.G).toEqual(before);
  });

  it('returns no ai moves on a full board', () => {
    const cells = [
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '1',
      '0',
      '0',
      '1',
      '1',
      '1',
      '0',
      '1',
      '1',
      '1',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
      '0',
      '0',
      '0',
      '1',
      '0',
      '0',
      '0',
    ];
    expect(
      (ConnectFour.ai!.enumerate as (G: any, ctx: any) => any[])({ cells }, {} as never),
    ).toEqual([]);
  });
});

describe('ConnectFour ai', () => {
  it('enumerates open columns', () => {
    const G: C4State = { cells: Array(ROWS * COLS).fill(null) };
    const moves = (ConnectFour.ai!.enumerate as (G: any, ctx: any) => any[])(G, {} as never);
    expect(moves).toHaveLength(COLS);
    expect(moves[0]).toEqual({ move: 'drop', args: [0] });
  });
});
