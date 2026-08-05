import { Client } from 'boardgame.io/client';
import { describe, expect, it, vi } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import {
  canDraw,
  canPass,
  Dominoes,
  type DominoesState,
  type OpenEnd,
  playableEndIndexes,
  type Tile,
} from './game';

function dominoClient(setup: () => DominoesState, numPlayers = 2) {
  const client = Client({
    game: { ...Dominoes, setup },
    numPlayers,
  });
  client.start();
  return client;
}

function G(client: ReturnType<typeof dominoClient>): DominoesState {
  const state = client.getState();
  if (!state) throw new Error('missing state');
  return state.G as DominoesState;
}

describe('playableEndIndexes', () => {
  it('allows any first tile on an empty board', () => {
    const G: DominoesState = {
      hands: [],
      boneyard: [],
      ends: [],
      board: [],
      spinnerId: null,
    };
    expect(playableEndIndexes(G, { a: 3, b: 5, id: '3-5' })).toEqual([-1]);
  });

  it('returns matching open ends only', () => {
    const ends: OpenEnd[] = [
      { id: 'e0', value: 6, x: 1, y: 0, dir: 'E' },
      { id: 'e1', value: 2, x: -1, y: 0, dir: 'W' },
    ];
    const G: DominoesState = {
      hands: [],
      boneyard: [],
      ends,
      board: [{ tile: { a: 6, b: 2, id: '6-2' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    const tile: Tile = { a: 6, b: 4, id: '4-6' };
    expect(playableEndIndexes(G, tile)).toEqual([0]);
  });
});

describe('canDraw and canPass', () => {
  const blockedEnd: OpenEnd = { id: 'e0', value: 5, x: 1, y: 0, dir: 'E' };
  const boardTile = { tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 as const };

  it('disallows draw and pass while a legal play exists', () => {
    const G: DominoesState = {
      hands: [[{ a: 5, b: 1, id: '5-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [blockedEnd],
      board: [boardTile],
      spinnerId: null,
    };
    expect(canDraw(G, 0)).toBe(false);
    expect(canPass(G, 0)).toBe(false);
  });

  it('allows draw only when the boneyard has tiles and nothing matches', () => {
    const G: DominoesState = {
      hands: [[{ a: 1, b: 2, id: '1-2' }], [{ a: 3, b: 4, id: '3-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [blockedEnd],
      board: [boardTile],
      spinnerId: null,
    };
    expect(canDraw(G, 0)).toBe(true);
    expect(canPass(G, 0)).toBe(false);
  });

  it('allows pass only when the boneyard is empty and nothing matches', () => {
    const G: DominoesState = {
      hands: [[{ a: 1, b: 2, id: '1-2' }], [{ a: 3, b: 4, id: '3-4' }]],
      boneyard: [],
      ends: [blockedEnd],
      board: [boardTile],
      spinnerId: null,
    };
    expect(canDraw(G, 0)).toBe(false);
    expect(canPass(G, 0)).toBe(true);
  });
});

describe('Dominoes game', () => {
  it('rejects playing a non-matching tile onto an open end', () => {
    const client = Client({
      game: {
        ...Dominoes,
        setup: () => {
          const tile: Tile = { a: 6, b: 6, id: '6-6' };
          const bad: Tile = { a: 1, b: 2, id: '1-2' };
          return {
            hands: [[bad], [{ a: 3, b: 4, id: '3-4' }]],
            boneyard: [],
            ends: [
              { id: '6-6-N', value: 6, x: 0, y: -1, dir: 'N' as const },
              { id: '6-6-E', value: 6, x: 1, y: 0, dir: 'E' as const },
              { id: '6-6-S', value: 6, x: 0, y: 1, dir: 'S' as const },
              { id: '6-6-W', value: 6, x: -1, y: 0, dir: 'W' as const },
            ],
            board: [{ tile, x: 0, y: 0, rot: 90 as const }],
            spinnerId: tile.id,
          };
        },
      },
    });
    client.start();
    const before = structuredClone(client.getState()?.G) as DominoesState;
    client.moves.playTile(0, 0);
    const after = client.getState()?.G as DominoesState;
    expect(after.hands[0]).toEqual(before.hands[0]);
    expect(after.board).toEqual(before.board);
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });

  it('plays the first tile on an empty board', () => {
    const tile: Tile = { a: 3, b: 5, id: '3-5' };
    const keep: Tile = { a: 1, b: 1, id: '1-1' };
    const client = dominoClient(() => ({
      hands: [[tile, keep], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [],
      board: [],
      spinnerId: null,
    }));
    client.moves.playTile(0, -1);
    const g = G(client);
    expect(g.board).toHaveLength(1);
    expect(g.hands[0]).toHaveLength(1);
    expect(g.ends).toHaveLength(2);
  });

  it('opens four arms when the first tile is a double', () => {
    const tile: Tile = { a: 6, b: 6, id: '6-6' };
    const client = dominoClient(() => ({
      hands: [[tile], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [],
      board: [],
      spinnerId: null,
    }));
    client.moves.playTile(0, -1);
    const g = G(client);
    expect(g.spinnerId).toBe('6-6');
    expect(g.ends).toHaveLength(4);
  });

  it('plays a matching tile onto an open end', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 6, b: 2, id: '6-2' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 6, x: -1, y: 0, dir: 'W' }],
      board: [{ tile: { a: 6, b: 4, id: '6-4' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    expect(G(client).board).toHaveLength(2);
    expect(G(client).hands[0]).toHaveLength(0);
  });

  it('ends when a player empties their hand', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 5, b: 2, id: '5-2' }], [{ a: 3, b: 4, id: '3-4' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: -1, y: 0, dir: 'W' }],
      board: [{ tile: { a: 5, b: 5, id: '5-5' }, x: 0, y: 0, rot: 90 }],
      spinnerId: '5-5',
    }));
    client.moves.playTile(0, 0);
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });

  it('draws from the boneyard when nothing matches', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 0, b: 1, id: '0-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.drawTile();
    expect(G(client).hands[0]).toHaveLength(2);
    expect(G(client).boneyard).toHaveLength(0);
  });

  it('passes when the boneyard is empty and nothing matches', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 0, b: 1, id: '0-1' }], [{ a: 5, b: 1, id: '5-1' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.pass();
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('ends blocked with the lowest pip count', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 0, b: 1, id: '0-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0', blocked: true });
  });

  it('rejects draw and pass while a legal play exists', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 5, b: 1, id: '5-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    const before = structuredClone(G(client));
    client.moves.drawTile();
    client.moves.pass();
    expect(G(client)).toEqual(before);
  });

  it('deals five tiles per player in a three-player game', () => {
    const client = Client({ game: { ...Dominoes, seed: 'domino-deal' }, numPlayers: 3 });
    client.start();
    const g = G(client);
    expect(g.hands).toHaveLength(3);
    expect(g.hands.every((h) => h.length === 5)).toBe(true);
  });

  it('deals seven tiles per player in a two-player game', () => {
    const client = Client({ game: { ...Dominoes, seed: 'domino-deal-2' }, numPlayers: 2 });
    client.start();
    expect(G(client).hands.every((h) => h.length === 7)).toBe(true);
  });

  it('rejects invalid first-play and hand indexes', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 3, b: 5, id: '3-5' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [],
      board: [],
      spinnerId: null,
    }));
    const before = structuredClone(G(client));
    client.moves.playTile(9, -1);
    client.moves.playTile(0, 0);
    expect(G(client)).toEqual(before);
  });

  it('adds spinner arms when a double joins the chain', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 4, b: 4, id: '4-4' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 4, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 4, b: 2, id: '4-2' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    expect(G(client).spinnerId).toBe('4-4');
    expect(G(client).ends.length).toBeGreaterThan(1);
  });

  it('plays onto the west end with correct rotation', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 6, b: 2, id: '6-2' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [
        { id: 'w', value: 6, x: -1, y: 0, dir: 'W' },
        { id: 'e', value: 2, x: 1, y: 0, dir: 'E' },
      ],
      board: [{ tile: { a: 6, b: 2, id: '6-2' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    expect(G(client).board.at(-1)?.rot).toBe(180);
  });

  it('plays onto the south end with correct rotation', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 3, b: 5, id: '3-5' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 's', value: 3, x: 0, y: 1, dir: 'S' }],
      board: [{ tile: { a: 3, b: 1, id: '3-1' }, x: 0, y: 0, rot: 90 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    expect(G(client).board.at(-1)?.rot).toBe(90);
  });

  it('plays onto the north end with correct rotation', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 4, b: 6, id: '4-6' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'n', value: 4, x: 0, y: -1, dir: 'N' }],
      board: [{ tile: { a: 4, b: 2, id: '4-2' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    expect(G(client).board.at(-1)?.rot).toBe(270);
  });

  it('rejects a missing end index and empty boneyard draws', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 0, b: 1, id: '0-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    const before = structuredClone(G(client));
    client.moves.playTile(0, 3);
    client.moves.drawTile();
    expect(G(client)).toEqual(before);
  });

  it('rejects drawing while a legal play exists', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 5, b: 1, id: '5-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    const before = structuredClone(G(client));
    client.moves.drawTile();
    expect(G(client)).toEqual(before);
  });

  it('adds east-west arms when a double joins on a vertical end', () => {
    const client = dominoClient(() => ({
      hands: [[{ a: 3, b: 3, id: '3-3' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 's', value: 3, x: 0, y: 1, dir: 'S' }],
      board: [{ tile: { a: 3, b: 1, id: '3-1' }, x: 0, y: 0, rot: 90 }],
      spinnerId: null,
    }));
    client.moves.playTile(0, 0);
    const g = G(client);
    expect(g.spinnerId).toBe('3-3');
    expect(g.ends.some((end) => end.dir === 'E')).toBe(true);
    expect(g.ends.some((end) => end.dir === 'W')).toBe(true);
  });

  it('rejects invalid end indexes and draws while a play exists', () => {
    const badEnd: DominoesState = {
      hands: [[{ a: 5, b: 1, id: '5-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.moves!.playTile as any)(
        { G: badEnd, ctx: { currentPlayer: '0' }, events: { endTurn: vi.fn() } } as never,
        0,
        3,
      ),
    ).toBe(INVALID_MOVE);

    const badMatch: DominoesState = {
      hands: [[{ a: 1, b: 2, id: '1-2' }], [{ a: 3, b: 4, id: '3-4' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.moves!.playTile as any)(
        { G: badMatch, ctx: { currentPlayer: '0' }, events: { endTurn: vi.fn() } } as never,
        0,
        0,
      ),
    ).toBe(INVALID_MOVE);

    const drawG: DominoesState = {
      hands: [[{ a: 5, b: 1, id: '5-1' }], [{ a: 2, b: 4, id: '2-4' }]],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.moves!.drawTile as any)({ G: drawG, ctx: { currentPlayer: '0' } } as never),
    ).toBe(INVALID_MOVE);

    const emptyPit: DominoesState = {
      hands: [[{ a: 1, b: 2, id: '1-2' }], [{ a: 3, b: 4, id: '3-4' }]],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.moves!.drawTile as any)({ G: emptyPit, ctx: { currentPlayer: '0' } } as never),
    ).toBe(INVALID_MOVE);
  });

  it('rotates tiles for every open direction', () => {
    const eastMatch = dominoClient(() => ({
      hands: [[{ a: 6, b: 2, id: '6-2' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'e', value: 6, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 6, b: 4, id: '6-4' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    eastMatch.moves.playTile(0, 0);
    expect(G(eastMatch).board.at(-1)?.rot).toBe(0);

    const eastFlip = dominoClient(() => ({
      hands: [[{ a: 2, b: 6, id: '2-6' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'e', value: 6, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 6, b: 4, id: '6-4' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    eastFlip.moves.playTile(0, 0);
    expect(G(eastFlip).board.at(-1)?.rot).toBe(180);

    const southFlip = dominoClient(() => ({
      hands: [[{ a: 1, b: 3, id: '1-3' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 's', value: 3, x: 0, y: 1, dir: 'S' }],
      board: [{ tile: { a: 3, b: 1, id: '3-1' }, x: 0, y: 0, rot: 90 }],
      spinnerId: null,
    }));
    southFlip.moves.playTile(0, 0);
    expect(G(southFlip).board.at(-1)?.rot).toBe(270);

    const northFlip = dominoClient(() => ({
      hands: [[{ a: 2, b: 4, id: '2-4' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'n', value: 4, x: 0, y: -1, dir: 'N' }],
      board: [{ tile: { a: 4, b: 2, id: '4-2' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    northFlip.moves.playTile(0, 0);
    expect(G(northFlip).board.at(-1)?.rot).toBe(90);

    const westFlip = dominoClient(() => ({
      hands: [[{ a: 2, b: 6, id: '2-6' }], [{ a: 1, b: 2, id: '1-2' }]],
      boneyard: [],
      ends: [{ id: 'w', value: 6, x: -1, y: 0, dir: 'W' }],
      board: [{ tile: { a: 6, b: 4, id: '6-4' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    }));
    westFlip.moves.playTile(0, 0);
    expect(G(westFlip).board.at(-1)?.rot).toBe(0);
  });
});

describe('Dominoes ai', () => {
  it('enumerates play, draw, and pass moves', () => {
    const playG: DominoesState = {
      hands: [[{ a: 6, b: 2, id: '6-2' }], []],
      boneyard: [],
      ends: [{ id: 'e0', value: 6, x: -1, y: 0, dir: 'W' }],
      board: [{ tile: { a: 6, b: 4, id: '6-4' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.ai!.enumerate as (G: any, ctx: any) => any[])(playG, {
        currentPlayer: '0',
      } as never),
    ).toEqual([{ move: 'playTile', args: [0, 0] }]);

    const drawG: DominoesState = {
      hands: [[{ a: 0, b: 1, id: '0-1' }], []],
      boneyard: [{ a: 2, b: 2, id: '2-2' }],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.ai!.enumerate as (G: any, ctx: any) => any[])(drawG, {
        currentPlayer: '0',
      } as never),
    ).toEqual([{ move: 'drawTile', args: [] }]);

    const passG: DominoesState = {
      hands: [[{ a: 0, b: 1, id: '0-1' }], []],
      boneyard: [],
      ends: [{ id: 'e0', value: 5, x: 1, y: 0, dir: 'E' }],
      board: [{ tile: { a: 5, b: 3, id: '5-3' }, x: 0, y: 0, rot: 0 }],
      spinnerId: null,
    };
    expect(
      (Dominoes.ai!.enumerate as (G: any, ctx: any) => any[])(passG, {
        currentPlayer: '0',
      } as never),
    ).toEqual([{ move: 'pass', args: [] }]);
  });
});
