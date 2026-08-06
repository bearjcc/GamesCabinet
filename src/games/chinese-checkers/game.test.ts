import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  ADJACENT,
  ChineseCheckers,
  type ChineseCheckersState,
  GOAL_0,
  GOAL_1,
  HOLE_COUNT,
  HOME_0,
  HOME_1,
  holeIndex,
  legalMoves,
  NODES,
  type Peg,
} from './game';

function emptyBoard(): (Peg | null)[] {
  return Array(HOLE_COUNT).fill(null);
}

function clientWith(board: (Peg | null)[], mustContinueFrom: number | null = null) {
  const client = Client({
    game: {
      ...ChineseCheckers,
      setup: () => ({ board, mustContinueFrom }),
    },
  });
  client.start();
  return client;
}

describe('chinese-checkers board graph', () => {
  it('has the classic 121-hole star', () => {
    expect(HOLE_COUNT).toBe(121);
    expect(NODES).toHaveLength(121);
    expect(HOME_0).toHaveLength(10);
    expect(HOME_1).toHaveLength(10);
    expect(new Set([...HOME_0, ...HOME_1]).size).toBe(20);
  });

  it('gives each hole at most six neighbours on the star', () => {
    for (const nbs of ADJACENT) {
      expect(nbs.length).toBeGreaterThan(0);
      expect(nbs.length).toBeLessThanOrEqual(6);
    }
  });
});

describe('ChineseCheckers game', () => {
  it('sets up ten pegs per player in opposite homes', () => {
    const client = Client({ game: ChineseCheckers });
    client.start();
    const G = client.getState()?.G as ChineseCheckersState;
    expect(HOME_0.every((i) => G.board[i] === '0')).toBe(true);
    expect(HOME_1.every((i) => G.board[i] === '1')).toBe(true);
    expect(G.board.filter((p) => p === '0')).toHaveLength(10);
    expect(G.board.filter((p) => p === '1')).toHaveLength(10);
  });

  it('allows a step into an adjacent empty hole', () => {
    const board = emptyBoard();
    // South-tip cell (-4,5) steps north into the hexagon rim (-4,4).
    const from = holeIndex(-4, 5)!;
    const to = holeIndex(-4, 4)!;
    board[from] = '0';
    board[HOME_1[0]] = '1';

    const client = clientWith(board);
    client.moves.movePeg(from, to);
    const G = client.getState()?.G as ChineseCheckersState;
    expect(G.board[from]).toBeNull();
    expect(G.board[to]).toBe('0');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('allows a hop over an adjacent peg into an empty hole', () => {
    const board = emptyBoard();
    const from = holeIndex(0, 4)!;
    const over = holeIndex(0, 3)!;
    const to = holeIndex(0, 2)!;
    board[from] = '0';
    board[over] = '1';
    board[HOME_1[0]] = '1';

    const client = clientWith(board);
    const before = legalMoves(client.getState()!.G as ChineseCheckersState, '0');
    expect(before).toContainEqual({ kind: 'hop', from, to });

    client.moves.movePeg(from, to);
    const G = client.getState()?.G as ChineseCheckersState;
    expect(G.board[from]).toBeNull();
    expect(G.board[over]).toBe('1'); // hops do not capture
    expect(G.board[to]).toBe('0');
    expect(G.mustContinueFrom).toBe(to);
    client.moves.endHop();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects an illegal non-adjacent relocate', () => {
    const board = emptyBoard();
    const from = holeIndex(-4, 5)!;
    const far = holeIndex(0, 0)!;
    board[from] = '0';
    board[HOME_1[0]] = '1';

    const client = clientWith(board);
    client.moves.movePeg(from, far);
    const G = client.getState()?.G as ChineseCheckersState;
    expect(G.board[from]).toBe('0');
    expect(G.board[far]).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('allows chain hops in one turn and endHop to stop early', () => {
    const board = emptyBoard();
    // Vertical chain: 0 hops over A to mid, then over B to end.
    const from = holeIndex(0, 4)!;
    const a = holeIndex(0, 3)!;
    const mid = holeIndex(0, 2)!;
    const b = holeIndex(0, 1)!;
    const end = holeIndex(0, 0)!;
    board[from] = '0';
    board[a] = '1';
    board[b] = '1';

    const client = clientWith(board);
    client.moves.movePeg(from, mid);
    let G = client.getState()?.G as ChineseCheckersState;
    expect(G.board[mid]).toBe('0');
    expect(G.mustContinueFrom).toBe(mid);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');

    // Can stop early.
    client.moves.endHop();
    G = client.getState()?.G as ChineseCheckersState;
    expect(G.mustContinueFrom).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');

    // Fresh chain: continue the second hop, then end (reverse hop may remain legal).
    const board2 = emptyBoard();
    board2[from] = '0';
    board2[a] = '1';
    board2[b] = '1';
    const client2 = clientWith(board2);
    client2.moves.movePeg(from, mid);
    client2.moves.movePeg(mid, end);
    G = client2.getState()?.G as ChineseCheckersState;
    expect(G.board[end]).toBe('0');
    expect(G.mustContinueFrom).toBe(end);
    client2.moves.endHop();
    expect(client2.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('wins when all ten destination holes are occupied', () => {
    const board = emptyBoard();
    // Choose a goal-rim hole that borders the hexagon so a step-in is legal.
    const last = GOAL_0.find((i) => ADJACENT[i].some((n) => !GOAL_0.includes(n)))!;
    const neighbour = ADJACENT[last].find((i) => !GOAL_0.includes(i))!;
    for (const i of GOAL_0) {
      if (i !== last) board[i] = '0';
    }
    board[neighbour] = '0';
    // Opposing peg outside both the goal tip and the step path.
    board[HOME_0[0]] = '1';

    const client = clientWith(board);
    expect(client.getState()?.ctx.gameover).toBeUndefined();
    client.moves.movePeg(neighbour, last);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('enumerates a non-empty bot move list from the opening', () => {
    const client = Client({ game: ChineseCheckers });
    client.start();
    const state = client.getState()!;
    const moves = ChineseCheckers.ai!.enumerate!(state.G, state.ctx, undefined!);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => 'move' in m && (m.move === 'movePeg' || m.move === 'endHop'))).toBe(
      true,
    );
    expect(moves.some((m) => 'move' in m && m.move === 'movePeg')).toBe(true);
  });

  it('enumerates endHop while a hop chain can continue', () => {
    const board = emptyBoard();
    const from = holeIndex(0, 4)!;
    const a = holeIndex(0, 3)!;
    const mid = holeIndex(0, 2)!;
    board[from] = '0';
    board[a] = '1';
    board[holeIndex(0, 1)!] = '1';
    const client = clientWith(board);
    client.moves.movePeg(from, mid);
    const state = client.getState()!;
    const moves = ChineseCheckers.ai!.enumerate!(state.G, state.ctx, undefined!);
    expect(moves.some((m) => 'move' in m && m.move === 'endHop')).toBe(true);
  });

  it('rejects endHop when not mid-chain', () => {
    const client = Client({ game: ChineseCheckers });
    client.start();
    client.moves.endHop();
    const state = client.getState()!;
    expect(state.ctx.currentPlayer).toBe('0');
    expect((state.G as ChineseCheckersState).mustContinueFrom).toBeNull();
  });

  it('wins for player 1 when their destination tip is full', () => {
    const board = emptyBoard();
    const last = GOAL_1.find((i) => ADJACENT[i].some((n) => !GOAL_1.includes(n)))!;
    const neighbour = ADJACENT[last].find((i) => !GOAL_1.includes(i))!;
    for (const i of GOAL_1) {
      if (i !== last) board[i] = '1';
    }
    board[neighbour] = '1';
    board[HOME_1[0]] = '0';

    const client = Client({
      game: {
        ...ChineseCheckers,
        setup: () => ({ board, mustContinueFrom: null }),
      },
    });
    client.start();
    const p0From = HOME_1[0];
    const p0To = ADJACENT[p0From].find((i) => board[i] === null && i !== neighbour && i !== last)!;
    client.moves.movePeg(p0From, p0To);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.movePeg(neighbour, last);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});
