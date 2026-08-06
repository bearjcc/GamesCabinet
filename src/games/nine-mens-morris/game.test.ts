import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import {
  ADJACENT,
  type Cell,
  countOnBoard,
  createInitialState,
  isInMill,
  legalMoves,
  legalPlaces,
  legalRemovals,
  MILLS,
  NineMensMorris,
  type NmmState,
  PIECES_PER_PLAYER,
  POINT_COUNT,
} from './game';

function startClient(setup?: () => NmmState) {
  const client = Client({
    game: setup ? { ...NineMensMorris, setup } : NineMensMorris,
  });
  client.start();
  return client;
}

function stateWith(partial: Partial<NmmState>): NmmState {
  return { ...createInitialState(), ...partial };
}

describe("Nine Men's Morris board graph", () => {
  it('has 24 points, 16 mills, and symmetric adjacency', () => {
    expect(POINT_COUNT).toBe(24);
    expect(MILLS).toHaveLength(16);
    expect(ADJACENT).toHaveLength(24);
    for (let i = 0; i < POINT_COUNT; i++) {
      for (const j of ADJACENT[i]) {
        expect(ADJACENT[j]).toContain(i);
      }
    }
  });
});

describe("Nine Men's Morris", () => {
  it('starts in place phase with empty board and 9 each', () => {
    const client = startClient();
    const G = client.getState()?.G as NmmState;
    expect(G.points).toHaveLength(24);
    expect(G.points.every((c) => c === null)).toBe(true);
    expect(G.piecesRemainingToPlace).toEqual([PIECES_PER_PLAYER, PIECES_PER_PLAYER]);
    expect(G.phase).toBe('place');
    expect(G.pendingRemoval).toBe(false);
    expect(G.selected).toBeNull();
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('places on an empty point and ends the turn', () => {
    const client = startClient();
    client.moves.place(0);
    const G = client.getState()?.G as NmmState;
    expect(G.points[0]).toBe('0');
    expect(G.piecesRemainingToPlace[0]).toBe(8);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('rejects placing on an occupied point', () => {
    const client = startClient(() =>
      stateWith({
        points: Object.assign(Array(24).fill(null), { 0: '1' }) as Cell[],
        piecesRemainingToPlace: [9, 8],
      }),
    );
    client.moves.place(0);
    expect(client.getState()?.G.points[0]).toBe('1');
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('requires removal after forming a mill on place', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    points[8] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [7, 8],
      }),
    );
    client.moves.place(2); // mill 0-1-2
    const G = client.getState()?.G as NmmState;
    expect(G.pendingRemoval).toBe(true);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
    client.moves.remove(8);
    expect(client.getState()?.G.points[8]).toBeNull();
    expect(client.getState()?.G.pendingRemoval).toBe(false);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('cannot remove from a mill when a non-mill piece exists', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    // Opponent mill on middle top + spare piece
    points[8] = '1';
    points[9] = '1';
    points[10] = '1';
    points[4] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [7, 5],
      }),
    );
    client.moves.place(2);
    expect(client.getState()?.G.pendingRemoval).toBe(true);
    expect(legalRemovals(client.getState()?.G as NmmState, '0')).toEqual([4]);
    client.moves.remove(8); // in mill — invalid
    expect(client.getState()?.G.points[8]).toBe('1');
    client.moves.remove(4);
    expect(client.getState()?.G.points[4]).toBeNull();
  });

  it('enters move phase after both players place all pieces', () => {
    const points = Array(24).fill(null) as Cell[];
    // Fill 8 each so one more place each finishes
    let p0 = 0;
    let p1 = 0;
    for (let i = 0; i < 24 && (p0 < 8 || p1 < 8); i++) {
      if (p0 < 8) {
        points[i] = '0';
        p0++;
      } else if (p1 < 8) {
        points[i] = '1';
        p1++;
      }
    }
    // Ensure empties remain for final placements: points 22, 23 empty ideally
    // Rebuild cleanly: 0-7 = P0, 8-15 = P1, rest empty
    const board = Array(24).fill(null) as Cell[];
    for (let i = 0; i < 8; i++) board[i] = '0';
    for (let i = 8; i < 16; i++) board[i] = '1';
    const client = startClient(() =>
      stateWith({
        points: board,
        piecesRemainingToPlace: [1, 1],
        phase: 'place',
      }),
    );
    client.moves.place(16);
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
    client.moves.place(17);
    const G = client.getState()?.G as NmmState;
    expect(G.piecesRemainingToPlace).toEqual([0, 0]);
    expect(G.phase).toBe('move');
  });

  it('slides to an adjacent empty point via move(from, to)', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[4] = '0';
    points[6] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    client.moves.move(0, 7);
    expect(client.getState()?.G.points[0]).toBeNull();
    expect(client.getState()?.G.points[7]).toBe('0');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('select then move(to) relocates the selected piece', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[4] = '0';
    points[6] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    client.moves.select(0);
    expect(client.getState()?.G.selected).toBe(0);
    client.moves.move(1);
    expect(client.getState()?.G.points[1]).toBe('0');
    expect(client.getState()?.G.points[0]).toBeNull();
    expect(client.getState()?.G.selected).toBeNull();
  });

  it('rejects non-adjacent slides when not flying', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[4] = '0';
    points[6] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    client.moves.move(0, 12);
    expect(client.getState()?.G.points[0]).toBe('0');
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('allows flying to any empty point with exactly 3 pieces', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[8] = '0';
    points[16] = '0';
    points[2] = '1';
    points[3] = '1';
    points[4] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    expect(countOnBoard(points, '0')).toBe(3);
    client.moves.move(0, 20); // far empty — fly
    expect(client.getState()?.G.points[20]).toBe('0');
    expect(client.getState()?.G.points[0]).toBeNull();
  });

  it('wins when the opponent is reduced below three pieces', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    // P0 places at 2 → mill → remove one → opponent has 2 left
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [1, 0],
        phase: 'place',
      }),
    );
    client.moves.place(2);
    client.moves.remove(8);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('wins when the opponent has no legal moves', () => {
    // P1's four inner-corner pieces are fully blocked; P0 slides elsewhere so blockers stay.
    const board = Array(24).fill(null) as Cell[];
    board[16] = '1';
    board[18] = '1';
    board[20] = '1';
    board[22] = '1';
    board[17] = '0';
    board[19] = '0';
    board[21] = '0';
    board[23] = '0';
    board[0] = '0';
    const client = startClient(() =>
      stateWith({
        points: board,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    expect(legalMoves(client.getState()?.G as NmmState, '1')).toHaveLength(0);
    client.moves.move(0, 1);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('enumerates AI moves for place, relocate, and remove', () => {
    const enumerate = NineMensMorris.ai!.enumerate as (
      G: NmmState,
      ctx: { currentPlayer: string },
      playerID: string,
    ) => { move: string; args?: number[] }[];

    const placeG = createInitialState();
    const placeMoves = enumerate(placeG, { currentPlayer: '0' }, '0');
    expect(placeMoves.length).toBe(24);
    expect(placeMoves[0]).toEqual({ move: 'place', args: [0] });

    const moveG = stateWith({
      points: Object.assign(Array(24).fill(null), {
        0: '0',
        4: '0',
        6: '0',
        8: '1',
        10: '1',
        12: '1',
      }) as Cell[],
      piecesRemainingToPlace: [0, 0],
      phase: 'move',
    });
    const rel = enumerate(moveG, { currentPlayer: '0' }, '0');
    expect(rel.some((m) => m.move === 'move' && m.args?.[0] === 0 && m.args?.[1] === 1)).toBe(true);

    const remG = stateWith({
      points: Object.assign(Array(24).fill(null), { 0: '0', 1: '0', 2: '0', 8: '1' }) as Cell[],
      piecesRemainingToPlace: [0, 0],
      phase: 'move',
      pendingRemoval: true,
    });
    const rem = enumerate(remG, { currentPlayer: '0' }, '0');
    expect(rem).toEqual([{ move: 'remove', args: [8] }]);
  });

  it('lists legal places only in place phase', () => {
    const G = createInitialState();
    expect(legalPlaces(G, '0')).toHaveLength(24);
    const moved = stateWith({
      phase: 'move',
      piecesRemainingToPlace: [0, 0],
    });
    expect(legalPlaces(moved, '0')).toEqual([]);
  });

  it('covers helper edge cases for places, moves, mills, and removals', () => {
    const empty = createInitialState();
    expect(isInMill(empty.points, 0, '0')).toBe(false);
    expect(legalPlaces({ ...empty, pendingRemoval: true }, '0')).toEqual([]);
    expect(legalPlaces(stateWith({ phase: 'place', piecesRemainingToPlace: [0, 9] }), '0')).toEqual(
      [],
    );
    expect(legalPlaces(stateWith({ phase: 'place', piecesRemainingToPlace: [9, 0] }), '1')).toEqual(
      [],
    );

    const moveG = stateWith({
      phase: 'move',
      piecesRemainingToPlace: [0, 0],
      points: Object.assign(Array(24).fill(null), { 0: '0', 8: '1' }) as Cell[],
      pendingRemoval: true,
    });
    expect(legalMoves(moveG, '0')).toEqual([]);
    expect(legalMoves(createInitialState(), '0')).toEqual([]);
    expect(legalRemovals(createInitialState(), '0')).toEqual([]);

    // All opponent pieces in mills — any may be removed
    const allMill = stateWith({
      pendingRemoval: true,
      points: Object.assign(Array(24).fill(null), {
        0: '0',
        8: '1',
        9: '1',
        10: '1',
      }) as Cell[],
    });
    expect(legalRemovals(allMill, '0')).toEqual([8, 9, 10]);
    expect(legalRemovals(allMill, '1')).toEqual([0]);
  });

  it('rejects illegal place, select, move, and remove arguments', () => {
    const placeClient = startClient();
    placeClient.moves.place(-1);
    placeClient.moves.place(1.5);
    placeClient.moves.place(99);
    placeClient.moves.select(0);
    placeClient.moves.move(0, 1);
    expect(placeClient.getState()?.G.points.every((c) => c === null)).toBe(true);

    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[4] = '0';
    points[6] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';

    const blocked = Array(24).fill(null) as Cell[];
    blocked[0] = '0';
    blocked[1] = '0';
    blocked[7] = '1';
    blocked[3] = '0';
    blocked[5] = '0';
    blocked[8] = '1';
    blocked[10] = '1';
    blocked[12] = '1';
    // 0 adj 1(own) and 7(opp) — no empty → cannot select 0
    const c2 = startClient(() =>
      stateWith({
        points: blocked,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    c2.moves.select(0);
    c2.moves.select(1.5);
    c2.moves.select(8);
    expect(c2.getState()?.G.selected).toBeNull();

    const c3 = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
        pendingRemoval: true,
      }),
    );
    c3.moves.select(0);
    c3.moves.move(0, 1);
    c3.moves.remove(1.5);
    c3.moves.remove(-1);
    expect(c3.getState()?.G.pendingRemoval).toBe(true);

    const c4 = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    c4.moves.move(1);
    c4.moves.move(0.5, 1);
    expect(c4.getState()?.G.points[0]).toBe('0');
    c4.moves.place(1);
    c4.moves.remove(8);
  });

  it('allows removing a mill piece when every opponent piece is in a mill', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    points[8] = '1';
    points[9] = '1';
    points[10] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [7, 6],
      }),
    );
    client.moves.place(2);
    expect(legalRemovals(client.getState()?.G as NmmState, '0')).toEqual([8, 9, 10]);
    client.moves.remove(9);
    expect(client.getState()?.G.points[9]).toBeNull();
  });

  it('ends the game when the current player already has fewer than three pieces', () => {
    const points = Array(24).fill(null) as Cell[];
    points[0] = '0';
    points[1] = '0';
    points[8] = '1';
    points[10] = '1';
    points[12] = '1';
    const client = startClient(() =>
      stateWith({
        points,
        piecesRemainingToPlace: [0, 0],
        phase: 'move',
      }),
    );
    client.moves.select(0);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});
