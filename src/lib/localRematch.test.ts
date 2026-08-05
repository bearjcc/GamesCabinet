import { RandomBot } from 'boardgame.io/ai';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { afterEach, describe, expect, it } from 'vitest';
import { TicTacToe } from '../games/tic-tac-toe/game';
import { localRematchMatchID } from './localRematch';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function startBotClient(matchID: string) {
  const client = Client({
    game: TicTacToe,
    numPlayers: 2,
    playerID: '0',
    matchID,
    multiplayer: Local({ bots: { '1': RandomBot } }),
  });
  client.start();
  return client;
}

describe('localRematchMatchID', () => {
  it('keeps the base id for generation 0', () => {
    expect(localRematchMatchID('bot-tic-tac-toe', 0)).toBe('bot-tic-tac-toe');
  });

  it('suffixes later generations', () => {
    expect(localRematchMatchID('bot-tic-tac-toe', 2)).toBe('bot-tic-tac-toe-r2');
  });
});

describe('vs-bot rematch (Local multiplayer)', () => {
  const clients: Array<ReturnType<typeof Client>> = [];

  afterEach(() => {
    for (const c of clients) c.stop();
    clients.length = 0;
  });

  it('Client.reset desyncs from Local master so seat 0 stays active alone', async () => {
    const local = Local();
    const p0 = Client({
      game: TicTacToe,
      numPlayers: 2,
      playerID: '0',
      matchID: 'reset-probe',
      multiplayer: local,
    });
    const p1 = Client({
      game: TicTacToe,
      numPlayers: 2,
      playerID: '1',
      matchID: 'reset-probe',
      multiplayer: local,
    });
    clients.push(p0, p1);
    p0.start();
    p1.start();
    await sleep(20);

    // Finish on the master: X wins top row.
    p0.moves.clickCell(0);
    p1.moves.clickCell(3);
    p0.moves.clickCell(1);
    p1.moves.clickCell(4);
    p0.moves.clickCell(2);
    await sleep(20);
    expect(p0.getState()?.ctx.gameover).toEqual({ winner: '0' });

    // reset is clientOnly — master stays finished; UI looks fresh but is desynced.
    p0.reset();
    expect(p0.getState()?.G.cells.every((c) => c === null)).toBe(true);
    expect(p0.getState()?.isActive).toBe(true);

    p0.moves.clickCell(0);
    p0.moves.clickCell(1);
    p0.moves.clickCell(2);
    const hijacked = p0.getState();
    expect(hijacked?.G.cells.slice(0, 3)).toEqual(['0', '0', '0']);
    expect(hijacked?.ctx.currentPlayer).toBe('0');
    expect(hijacked?.isActive).toBe(true);
  });

  it('new matchID restores a two-seat match where only seat 0 is active', async () => {
    const first = startBotClient(localRematchMatchID('bot-ttt-rematch', 0));
    clients.push(first);
    await sleep(20);
    first.moves.clickCell(0);
    await sleep(150);
    expect(first.getState()?.G.cells[0]).toBe('0');
    expect(first.getState()?.ctx.currentPlayer).toBe('0');
    expect(first.getState()?.G.cells.includes('1')).toBe(true);

    first.updateMatchID(localRematchMatchID('bot-ttt-rematch', 1));
    await sleep(20);

    const state = first.getState();
    expect(state?.G.cells.every((c) => c === null)).toBe(true);
    expect(state?.ctx.currentPlayer).toBe('0');
    expect(state?.isActive).toBe(true);

    first.moves.clickCell(4);
    await sleep(20);
    expect(first.getState()?.G.cells[4]).toBe('0');
    expect(first.getState()?.isActive).toBe(false);

    await sleep(150);
    expect(first.getState()?.ctx.currentPlayer).toBe('0');
    expect(first.getState()?.isActive).toBe(true);
    expect(first.getState()?.G.cells.filter((c) => c === '1').length).toBeGreaterThanOrEqual(1);
  });
});
