import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  canMove,
  canUndo,
  Game2048,
  type Game2048State,
  HISTORY_LIMIT,
  pushUndoSnapshot,
  type SwipeDir,
  spawn,
} from './game';

function startClient(seed = '2048-test') {
  const client = Client({ game: { ...Game2048, seed }, numPlayers: 1 });
  client.start();
  return client;
}

function cellsOf(client: ReturnType<typeof startClient>): (number | null)[] {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return (state.G as Game2048State).cells;
}

function GOf(client: ReturnType<typeof startClient>): Game2048State {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as Game2048State;
}

function clientWithSetup(setup: () => Game2048State, seed = 'setup') {
  const client = Client({
    game: { ...Game2048, seed, setup },
    numPlayers: 1,
  });
  client.start();
  return client;
}

const emptyBoard = (): (number | null)[] => Array(16).fill(null);

describe('Game2048', () => {
  it('starts with exactly two tiles on the board', () => {
    const client = startClient();
    const filled = cellsOf(client).filter((c) => c !== null);
    expect(filled).toHaveLength(2);
    for (const v of filled) {
      expect(v === 2 || v === 4).toBe(true);
    }
  });

  it('rejects a swipe that does not change the board', () => {
    const cells = emptyBoard();
    cells[3] = 2;
    const client = clientWithSetup(
      () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
      'noop',
    );
    const before = cellsOf(client);
    expect(canMove(before, 'right')).toBe(false);
    client.moves.swipe('right' satisfies SwipeDir);
    expect(cellsOf(client)).toEqual(before);
    expect(GOf(client).score).toBe(0);
    expect(GOf(client).history).toEqual([]);
  });

  it('merges equal tiles and increases score', () => {
    const cells = emptyBoard();
    cells[0] = 2;
    cells[1] = 2;
    const client = clientWithSetup(
      () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
      'merge',
    );
    client.moves.swipe('left');
    const G = GOf(client);
    expect(G.cells[0]).toBe(4);
    expect(G.score).toBe(4);
    expect(G.cells.filter((c) => c !== null).length).toBeGreaterThanOrEqual(2);
  });

  it('ends when no moves remain', () => {
    const client = clientWithSetup(
      () => ({
        cells: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2],
        score: 99,
        won: false,
        history: [],
      }),
      'dead',
    );
    expect(client.getState()?.ctx.gameover).toEqual({ score: 99, won: false });
  });

  it('marks won when a 2048 tile appears', () => {
    const cells = emptyBoard();
    cells[0] = 1024;
    cells[1] = 1024;
    const client = clientWithSetup(
      () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
      'win',
    );
    client.moves.swipe('left');
    const G = GOf(client);
    expect(G.cells).toContain(2048);
    expect(G.won).toBe(true);
  });

  it('rejects an invalid swipe direction', () => {
    const client = startClient();
    const before = cellsOf(client);
    client.moves.swipe('sideways' as SwipeDir);
    expect(cellsOf(client)).toEqual(before);
  });

  it('does not spawn on a full board', () => {
    const cells = Array(16).fill(2) as (number | null)[];
    spawn(cells, { Shuffle: (arr) => arr, Number: () => 0.5 });
    expect(cells.every((value) => value === 2)).toBe(true);
  });

  it('can spawn a four tile when the random draw is high', () => {
    const cells = Array(16).fill(null) as (number | null)[];
    spawn(cells, { Shuffle: (arr) => arr, Number: () => 0.95 });
    expect(cells[0]).toBe(4);
  });

  describe('undo', () => {
    it('rejects undo when history is empty', () => {
      const client = startClient();
      const before = GOf(client);
      expect(before.history).toEqual([]);
      client.moves.undo();
      expect(GOf(client).cells).toEqual(before.cells);
      expect(GOf(client).score).toBe(before.score);
    });

    it('restores board and score after a successful swipe', () => {
      const cells = emptyBoard();
      cells[0] = 2;
      cells[1] = 2;
      const client = clientWithSetup(
        () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
        'undo-merge',
      );
      const beforeCells = cellsOf(client).slice();
      client.moves.swipe('left');
      const afterSwipe = GOf(client);
      expect(afterSwipe.score).toBe(4);
      expect(afterSwipe.history).toHaveLength(1);
      expect(afterSwipe.cells).not.toEqual(beforeCells);

      client.moves.undo();
      const restored = GOf(client);
      expect(restored.cells).toEqual(beforeCells);
      expect(restored.score).toBe(0);
      expect(restored.won).toBe(false);
      expect(restored.history).toEqual([]);
    });

    it('does not record history for a rejected swipe', () => {
      const cells = emptyBoard();
      cells[3] = 2;
      const client = clientWithSetup(
        () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
        'undo-noop',
      );
      client.moves.swipe('right');
      expect(GOf(client).history).toEqual([]);
      client.moves.undo();
      expect(GOf(client).cells[3]).toBe(2);
    });

    it('undoes the most recent swipe when history has multiple entries', () => {
      const cells = emptyBoard();
      cells[0] = 2;
      const client = clientWithSetup(
        () => ({ cells: cells.slice(), score: 0, won: false, history: [] }),
        'undo-stack',
      );
      client.moves.swipe('right');
      const afterFirst = {
        cells: cellsOf(client).slice(),
        score: GOf(client).score,
        won: GOf(client).won,
      };
      client.moves.swipe('left');
      expect(GOf(client).history.length).toBe(2);

      client.moves.undo();
      const mid = GOf(client);
      expect(mid.cells).toEqual(afterFirst.cells);
      expect(mid.score).toBe(afterFirst.score);
      expect(mid.won).toBe(afterFirst.won);
      expect(mid.history).toHaveLength(1);
    });

    it('caps history length via pushUndoSnapshot', () => {
      const G: Game2048State = {
        cells: emptyBoard(),
        score: 0,
        won: false,
        history: [],
      };
      for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
        G.score = i;
        pushUndoSnapshot(G);
      }
      expect(G.history).toHaveLength(HISTORY_LIMIT);
      expect(G.history[0]?.score).toBe(3);
      expect(G.history[HISTORY_LIMIT - 1]?.score).toBe(HISTORY_LIMIT + 2);
    });

    it('rejects undo after game over', () => {
      const client = clientWithSetup(
        () => ({
          cells: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2],
          score: 99,
          won: false,
          history: [
            {
              cells: emptyBoard(),
              score: 0,
              won: false,
            },
          ],
        }),
        'undo-over',
      );
      expect(client.getState()?.ctx.gameover).toBeTruthy();
      const before = GOf(client);
      client.moves.undo();
      expect(GOf(client).cells).toEqual(before.cells);
      expect(GOf(client).history).toHaveLength(1);
    });

    it('reports canUndo from history and gameover', () => {
      const empty: Game2048State = {
        cells: emptyBoard(),
        score: 0,
        won: false,
        history: [],
      };
      expect(canUndo(empty, undefined)).toBe(false);
      empty.history.push({ cells: emptyBoard(), score: 1, won: false });
      expect(canUndo(empty, undefined)).toBe(true);
      expect(canUndo(empty, { score: 1, won: false })).toBe(false);
    });
  });
});
