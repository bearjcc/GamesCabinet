import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { TicTacToe, type TTTState } from './game';

function startClient() {
  const client = Client({ game: TicTacToe });
  client.start();
  return client;
}

describe('TicTacToe', () => {
  it('rejects a click on an occupied cell', () => {
    const client = startClient();
    client.moves.clickCell(0);
    const afterFirst = client.getState()?.G as TTTState;
    expect(afterFirst.cells[0]).toBe('0');

    client.moves.clickCell(0);
    const afterIllegal = client.getState()?.G as TTTState;
    expect(afterIllegal.cells).toEqual(afterFirst.cells);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('ends with a winner on three in a row', () => {
    const client = startClient();
    // X: 0,1,2  O: 3,4
    client.moves.clickCell(0);
    client.moves.clickCell(3);
    client.moves.clickCell(1);
    client.moves.clickCell(4);
    client.moves.clickCell(2);

    const state = client.getState();
    expect(state?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends in a draw when the board is full with no line', () => {
    const client = startClient();
    // 0 1 2
    // 3 4 5
    // 6 7 8
    // X O X
    // X O O
    // O X X
    const order = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const id of order) {
      client.moves.clickCell(id);
    }
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('enumerates only open cells for ai', () => {
    const G: TTTState = { cells: ['0', null, '1', null, '0', null, null, null, null] };
    expect((TicTacToe.ai!.enumerate as (G: any, ctx: any) => any[])(G, {} as never)).toEqual([
      { move: 'clickCell', args: [1] },
      { move: 'clickCell', args: [3] },
      { move: 'clickCell', args: [5] },
      { move: 'clickCell', args: [6] },
      { move: 'clickCell', args: [7] },
      { move: 'clickCell', args: [8] },
    ]);
  });

  it('rejects out-of-range cells', () => {
    const client = startClient();
    const before = client.getState()?.G as TTTState;
    client.moves.clickCell(-1);
    client.moves.clickCell(9);
    expect(client.getState()?.G).toEqual(before);
  });
});
