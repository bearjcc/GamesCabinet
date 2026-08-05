import { Client } from 'boardgame.io/client';
import { afterEach, describe, expect, it } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import { clearLetterWalkerDictionary, setLetterWalkerDictionary } from './dictionary';
import {
  applyShiftCol,
  applyShiftRow,
  applySubmitWord,
  buildGrid,
  createPuzzleState,
  getDailySeed,
  LetterWalker,
  type LetterWalkerState,
  scoreWord,
} from './game';

afterEach(() => {
  clearLetterWalkerDictionary();
});

function startClient(setup?: () => LetterWalkerState) {
  const client = Client({
    game: setup ? { ...LetterWalker, setup } : LetterWalker,
    numPlayers: 1,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof startClient>): LetterWalkerState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as LetterWalkerState;
}

describe('LetterWalker seeding', () => {
  it('builds a deterministic 8x8 grid for a seed', () => {
    const a = buildGrid(20260805, 1);
    const b = buildGrid(20260805, 1);
    expect(a).toEqual(b);
    expect(a).toHaveLength(8);
    expect(a[0]).toHaveLength(8);
    expect(buildGrid(20260805, 2)).not.toEqual(a);
  });
});

describe('shift coalesce', () => {
  it('counts repeated shifts on the same row as one move', () => {
    let state = createPuzzleState(20260805, 1);
    const before = state.grid[0].join('');
    state = applyShiftRow(state, 0, 'left');
    expect(state.moves).toBe(1);
    state = applyShiftRow(state, 0, 'left');
    expect(state.moves).toBe(1);
    state = applyShiftRow(state, 0, 'right');
    expect(state.moves).toBe(1);
    expect(state.grid[0].join('')).not.toBe(before);

    state = applyShiftCol(state, 1, 'up');
    expect(state.moves).toBe(2);
    state = applyShiftCol(state, 1, 'down');
    expect(state.moves).toBe(2);
  });

  it('wraps row and column letters', () => {
    let state = createPuzzleState(1, 1);
    state = {
      ...state,
      grid: [
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        ...Array.from({ length: 7 }, () => Array(8).fill('X') as string[]),
      ],
    };
    state = applyShiftRow(state, 0, 'left');
    expect(state.grid[0].join('')).toBe('BCDEFGHA');
    state = applyShiftRow(state, 0, 'right');
    expect(state.grid[0].join('')).toBe('ABCDEFGH');

    state = {
      ...state,
      grid: Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => (c === 0 ? String(r) : 'Z')),
      ),
      lastMoveType: null,
      moves: 0,
    };
    // digits 0-7 in col 0; after up, top gets former row1
    state.grid = [
      ['0', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['1', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['2', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['3', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['4', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['5', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['6', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
      ['7', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
    ];
    state = applyShiftCol(state, 0, 'up');
    expect(state.grid.map((row) => row[0]).join('')).toBe('12345670');
    state = applyShiftCol(state, 0, 'down');
    expect(state.grid.map((row) => row[0]).join('')).toBe('01234567');
  });
});

describe('applySubmitWord', () => {
  it('rejects completed runs and malformed submissions', () => {
    setLetterWalkerDictionary(['cat']);
    const base = createPuzzleState(1, 1);
    base.grid[0] = ['C', 'A', 'T', 'X', 'X', 'X', 'X', 'X'];

    expect(applySubmitWord({ ...base, completed: true }, [{ row: 0, col: 0 }])).toBe(INVALID_MOVE);
    expect(applySubmitWord(base, null as never)).toBe(INVALID_MOVE);
    expect(applySubmitWord(base, [{ row: 0, col: 0 }])).toBe(INVALID_MOVE);
    expect(
      applySubmitWord(base, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toBe(INVALID_MOVE);
    expect(
      applySubmitWord(base, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 0, col: 6 },
        { row: 0, col: 7 },
        { row: 0, col: 7 },
      ]),
    ).toBe(INVALID_MOVE);
    expect(
      applySubmitWord(base, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 8, col: 2 },
      ]),
    ).toBe(INVALID_MOVE);

    const sparse = createPuzzleState(1, 1);
    sparse.grid[0] = ['C', 'A', '', 'X', 'X', 'X', 'X', 'X'];
    expect(
      applySubmitWord(sparse, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toBe(INVALID_MOVE);
  });
});

describe('scoring', () => {
  it('scores letters times 10 minus moves, with 8-letter multiplier', () => {
    expect(scoreWord('cat', 5)).toBe(25);
    expect(scoreWord('abcdefgh', 10)).toBe(140);
    expect(scoreWord('hi', 100)).toBe(0);
  });
});

describe('LetterWalker Client moves', () => {
  it('shifts via moves and coalesces move count', () => {
    const client = startClient(() => createPuzzleState(20260805, 1));
    client.moves.shiftRow(0, 'left');
    expect(G(client).moves).toBe(1);
    client.moves.shiftRow(0, 'right');
    expect(G(client).moves).toBe(1);
    client.moves.shiftCol(3, 'up');
    expect(G(client).moves).toBe(2);
  });

  it('submits a dictionary word and completes the run', () => {
    setLetterWalkerDictionary(['cat']);
    const client = startClient(() => {
      const state = createPuzzleState(1, 1);
      state.grid[0] = ['C', 'A', 'T', 'X', 'X', 'X', 'X', 'X'];
      return state;
    });
    client.moves.submitWord([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    const g = G(client);
    expect(g.foundWords).toEqual(['CAT']);
    expect(g.score).toBe(30);
    expect(g.completed).toBe(true);
  });

  it('rejects unknown words and bad paths', () => {
    setLetterWalkerDictionary(['cat']);
    const client = startClient(() => {
      const state = createPuzzleState(1, 1);
      state.grid[0] = ['D', 'O', 'G', 'X', 'X', 'X', 'X', 'X'];
      return state;
    });
    const before = G(client).grid.map((r) => r.join(''));
    client.moves.submitWord([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(G(client).completed).toBe(false);
    expect(G(client).grid.map((r) => r.join(''))).toEqual(before);

    client.moves.submitWord([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(G(client).completed).toBe(false);
  });

  it('newPuzzle increments puzzle number and refreshes the grid', () => {
    const client = startClient(() => createPuzzleState(20260805, 1));
    const first = G(client)
      .grid.map((r) => r.join(''))
      .join('|');
    client.moves.shiftRow(0, 'left');
    client.moves.newPuzzle();
    const g = G(client);
    expect(g.puzzleNumber).toBe(2);
    expect(g.moves).toBe(0);
    expect(g.completed).toBe(false);
    expect(g.grid.map((r) => r.join('')).join('|')).not.toBe(first);
  });

  it('uses the daily seed helper and default setup', () => {
    expect(getDailySeed(new Date(2026, 7, 5))).toBe(20260805);
    const client = Client({ game: LetterWalker, numPlayers: 1 });
    client.start();
    expect(G(client).puzzleNumber).toBe(1);
  });

  it('rejects invalid shifts and moves after completion', () => {
    setLetterWalkerDictionary(['cat']);
    const client = startClient(() => {
      const state = createPuzzleState(1, 1);
      state.grid[0] = ['C', 'A', 'T', 'X', 'X', 'X', 'X', 'X'];
      return state;
    });
    client.moves.submitWord([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    const before = G(client)
      .grid.map((r) => r.join(''))
      .join('|');
    client.moves.shiftRow(0, 'left');
    client.moves.shiftCol(0, 'up');
    expect(
      G(client)
        .grid.map((r) => r.join(''))
        .join('|'),
    ).toBe(before);

    const fresh = startClient(() => createPuzzleState(1, 1));
    fresh.moves.shiftRow(-1, 'left');
    fresh.moves.shiftRow(0, 'sideways' as never);
    fresh.moves.shiftCol(8, 'up');
    fresh.moves.shiftCol(0, 'sideways' as never);
    expect(G(fresh).moves).toBe(0);
  });

  it('rejects a bad path length and completed runs', () => {
    setLetterWalkerDictionary(['cat']);
    const client = startClient(() => createPuzzleState(1, 1));
    client.moves.submitWord([{ row: 0, col: 0 }]);
    client.moves.submitWord([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 0, col: 5 },
      { row: 0, col: 6 },
      { row: 0, col: 7 },
      { row: 0, col: 7 },
    ]);
    expect(G(client).completed).toBe(false);
  });
});
