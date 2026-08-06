import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  allLineKeys,
  BOX_COLS,
  BOX_ROWS,
  boxesTouchingLine,
  DotsAndBoxes,
  type DotsAndBoxesState,
  earlyWinner,
  lineKey,
  parseLineKey,
  TOTAL_LINES,
} from './game';

function startClient(setup?: () => DotsAndBoxesState) {
  const client = Client({
    game: setup ? { ...DotsAndBoxes, setup } : DotsAndBoxes,
  });
  client.start();
  return client;
}

function emptyState(overrides?: Partial<DotsAndBoxesState>): DotsAndBoxesState {
  const lines: Record<string, string | null> = {};
  for (const key of allLineKeys()) lines[key] = null;
  return {
    lines,
    boxes: Array(BOX_ROWS * BOX_COLS).fill(null),
    scores: [0, 0],
    ...overrides,
  };
}

/** Last box (2,2) with three sides claimed; only v-2-3 open among its edges. */
function lastBoxFixture(scores: [number, number], owned: (string | null)[]): DotsAndBoxesState {
  const needed = [lineKey('h', 2, 2), lineKey('h', 3, 2), lineKey('v', 2, 2), lineKey('v', 2, 3)];
  const end = emptyState();
  for (const key of allLineKeys()) end.lines[key] = '1';
  for (const key of needed) end.lines[key] = null;
  end.lines[needed[0]] = '1';
  end.lines[needed[1]] = '1';
  end.lines[needed[2]] = '1';
  end.boxes = owned;
  end.scores = scores;
  return end;
}

describe('Dots and Boxes grid', () => {
  it('uses a 3x3 box grid (4x4 dots) with 24 lines', () => {
    expect(BOX_ROWS).toBe(3);
    expect(BOX_COLS).toBe(3);
    expect(allLineKeys()).toHaveLength(24);
    expect(TOTAL_LINES).toBe(24);
  });
});

describe('DotsAndBoxes', () => {
  it('starts with all lines open, empty boxes, and zero scores', () => {
    const client = startClient();
    const G = client.getState()?.G as DotsAndBoxesState;
    expect(Object.keys(G.lines)).toHaveLength(24);
    expect(Object.values(G.lines).every((owner) => owner === null)).toBe(true);
    expect(G.boxes).toEqual(Array(9).fill(null));
    expect(G.scores).toEqual([0, 0]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('claims an open line and ends the turn when no box completes', () => {
    const client = startClient();
    const key = lineKey('h', 0, 0);
    client.moves.claimLine(key);
    const state = client.getState();
    const G = state?.G as DotsAndBoxesState;
    expect(G.lines[key]).toBe('0');
    expect(G.scores).toEqual([0, 0]);
    expect(state?.ctx.currentPlayer).toBe('1');
  });

  it('rejects claiming an already claimed line', () => {
    const client = startClient();
    const key = lineKey('h', 0, 0);
    client.moves.claimLine(key);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    const before = structuredClone(client.getState()?.G) as DotsAndBoxesState;
    client.moves.claimLine(key);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects an unknown line id', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as DotsAndBoxesState;
    client.moves.claimLine('h-9-9');
    client.moves.claimLine('v-9-9');
    client.moves.claimLine(1 as unknown as string);
    expect(client.getState()?.G).toEqual(before);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('parses line keys and ignores invalid ones for box lookup', () => {
    expect(parseLineKey('v-0-0')).toEqual({ orient: 'v', row: 0, col: 0 });
    expect(parseLineKey('v-9-0')).toBeNull();
    expect(parseLineKey('nope')).toBeNull();
    expect(boxesTouchingLine('nope')).toEqual([]);
    expect(boxesTouchingLine(lineKey('h', 0, 0))).toEqual([0]);
    expect(boxesTouchingLine(lineKey('v', 0, 0))).toEqual([0]);
  });

  it('scores a completed box and grants an extra turn', () => {
    const base = emptyState();
    base.lines[lineKey('h', 0, 0)] = '1';
    base.lines[lineKey('v', 0, 0)] = '1';
    base.lines[lineKey('v', 0, 1)] = '1';
    const client = startClient(() => structuredClone(base));
    client.moves.claimLine(lineKey('h', 1, 0));
    const state = client.getState();
    const G = state?.G as DotsAndBoxesState;
    expect(G.boxes[0]).toBe('0');
    expect(G.scores).toEqual([1, 0]);
    expect(state?.ctx.currentPlayer).toBe('0');
  });

  it('can complete two boxes with one line and score both', () => {
    const base = emptyState();
    base.lines[lineKey('h', 0, 0)] = '1';
    base.lines[lineKey('v', 0, 0)] = '1';
    base.lines[lineKey('v', 0, 1)] = '1';
    base.lines[lineKey('h', 2, 0)] = '1';
    base.lines[lineKey('v', 1, 0)] = '1';
    base.lines[lineKey('v', 1, 1)] = '1';
    const client = startClient(() => structuredClone(base));
    client.moves.claimLine(lineKey('h', 1, 0));
    const G = client.getState()?.G as DotsAndBoxesState;
    expect(G.boxes[0]).toBe('0');
    expect(G.boxes[3]).toBe('0');
    expect(G.scores).toEqual([2, 0]);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('ends when the last box is claimed with the higher score winning', () => {
    const end = lastBoxFixture([4, 4], ['0', '0', '0', '0', '1', '1', '1', '1', null]);
    const client = startClient(() => structuredClone(end));
    client.moves.claimLine(lineKey('v', 2, 3));
    const state = client.getState();
    expect(state?.G.boxes[8]).toBe('0');
    expect(state?.G.scores).toEqual([5, 4]);
    expect(state?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('ends with player 1 winning on the last box', () => {
    // Leave a decoy open line on an already-owned box so P0 passes the turn.
    const end = lastBoxFixture([4, 4], ['0', '0', '0', '0', '1', '1', '1', '1', null]);
    end.lines[lineKey('h', 0, 0)] = null;
    const client = startClient(() => structuredClone(end));
    client.moves.claimLine(lineKey('h', 0, 0));
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.claimLine(lineKey('v', 2, 3));
    expect(client.getState()?.G.scores).toEqual([4, 5]);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });

  it('ends in a draw when scores are equal after the last box', () => {
    // scores are authoritative; 4-5 before last claim -> 5-5 draw
    const end = lastBoxFixture([4, 5], ['0', '0', '0', '0', '1', '1', '1', '1', null]);
    const client = startClient(() => structuredClone(end));
    client.moves.claimLine(lineKey('v', 2, 3));
    expect(client.getState()?.G.scores).toEqual([5, 5]);
    expect(client.getState()?.ctx.gameover).toEqual({ draw: true });
  });

  it('ends early when the leader cannot be caught', () => {
    // Before: 4-2 with 3 open boxes (4 <= 2+3). Completing one -> 5-2 with 2 open (5 > 2+2).
    const mid = emptyState({
      boxes: ['0', '0', '0', '0', '1', '1', null, null, null],
      scores: [4, 2],
    });
    mid.lines[lineKey('h', 2, 0)] = '1';
    mid.lines[lineKey('v', 2, 0)] = '1';
    mid.lines[lineKey('v', 2, 1)] = '1';
    const client = startClient(() => structuredClone(mid));
    expect(client.getState()?.ctx.gameover).toBeUndefined();
    client.moves.claimLine(lineKey('h', 3, 0));
    expect(client.getState()?.G.scores).toEqual([5, 2]);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('detects early wins for either seat and ignores a full board', () => {
    expect(
      earlyWinner({
        lines: {},
        boxes: ['0', '0', '0', '0', '1', '1', null, null, null],
        scores: [2, 4],
      }),
    ).toBeNull();
    expect(
      earlyWinner({
        lines: {},
        boxes: ['0', '0', '0', '0', '1', '1', '1', null, null],
        scores: [2, 5],
      }),
    ).toBe('1');
    expect(
      earlyWinner({
        lines: {},
        boxes: Array(9).fill('0'),
        scores: [5, 4],
      }),
    ).toBeNull();
  });

  it('enumerates only open lines for ai', () => {
    const G = emptyState();
    G.lines[lineKey('h', 0, 0)] = '0';
    G.lines[lineKey('v', 1, 2)] = '1';
    const moves = (
      DotsAndBoxes.ai!.enumerate as (
        G: DotsAndBoxesState,
        ctx: { currentPlayer: string },
      ) => { move: string; args: string[] }[]
    )(G, { currentPlayer: '0' });
    expect(moves).toHaveLength(22);
    expect(moves.every((m) => m.move === 'claimLine')).toBe(true);
    expect(moves.some((m) => m.args[0] === lineKey('h', 0, 0))).toBe(false);
    expect(moves.some((m) => m.args[0] === lineKey('v', 1, 2))).toBe(false);
  });
});
