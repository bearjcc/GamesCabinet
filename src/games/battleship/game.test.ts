import { Client } from 'boardgame.io/client';
import { describe, expect, it } from 'vitest';
import { INVALID_MOVE } from '../invalidMove';
import {
  Battleship,
  type BattleshipState,
  cellsForShip,
  isLegalPlacement,
  legalFires,
  legalPlacements,
  nextShipId,
  SHIP_LENGTHS,
  SIZE,
} from './game';

function startClient(setup?: () => BattleshipState) {
  const client = Client({
    game: setup ? { ...Battleship, setup } : Battleship,
    numPlayers: 2,
  });
  client.start();
  return client;
}

/** Place classic fleet for one player as horizontal rows 0..4 starting at col 0. */
function placeClassicFleet(client: ReturnType<typeof startClient>, playerID: string) {
  client.updatePlayerID(playerID);
  for (let shipId = 0; shipId < SHIP_LENGTHS.length; shipId++) {
    const origin = shipId * SIZE; // row shipId, col 0
    client.moves.placeShip(shipId, origin, 'H');
  }
  client.moves.confirmSetup();
}

describe('Battleship setup', () => {
  it('starts in setup phase with empty boards', () => {
    const client = startClient();
    const state = client.getState();
    expect(state?.ctx.phase).toBe('setup');
    const G = state?.G as BattleshipState;
    expect(G.boards['0'].ships).toEqual([]);
    expect(G.boards['1'].ships).toEqual([]);
    expect(G.boards['0'].ready).toBe(false);
    expect(G.boards['1'].ready).toBe(false);
    expect(G.boards['0'].shots).toHaveLength(SIZE * SIZE);
  });

  it('places a ship orthogonally in bounds', () => {
    const client = startClient();
    client.moves.placeShip(0, 0, 'H');
    const G = client.getState()?.G as BattleshipState;
    expect(G.boards['0'].ships).toEqual([{ id: 0, cells: cellsForShip(0, 0, 'H'), sunk: false }]);
  });

  it('rejects overlapping ships', () => {
    const client = startClient();
    client.moves.placeShip(0, 0, 'H');
    const before = structuredClone(client.getState()?.G) as BattleshipState;
    client.moves.placeShip(1, 0, 'H');
    expect(client.getState()?.G).toEqual(before);
  });

  it('rejects out-of-bounds placement', () => {
    const client = startClient();
    const before = structuredClone(client.getState()?.G) as BattleshipState;
    client.moves.placeShip(0, 8, 'H'); // length 5 from col 8 overflows
    expect(client.getState()?.G).toEqual(before);
    expect(isLegalPlacement([], 0, 8, 'H')).toBe(false);
  });

  it('advances to battle when both players confirm setup', () => {
    const client = startClient();
    placeClassicFleet(client, '0');
    expect(client.getState()?.ctx.phase).toBe('setup');
    placeClassicFleet(client, '1');
    expect(client.getState()?.ctx.phase).toBe('battle');
    expect(client.getState()?.ctx.currentPlayer).toBe('0');
  });
});

describe('Battleship battle', () => {
  function readyBattle() {
    const client = startClient();
    placeClassicFleet(client, '0');
    placeClassicFleet(client, '1');
    client.updatePlayerID('0');
    return client;
  }

  it('records a miss on an empty cell', () => {
    const client = readyBattle();
    // Player 1 ships occupy rows 0-4; fire at row 9
    client.moves.fire(SIZE * SIZE - 1);
    const G = client.getState()?.G as BattleshipState;
    expect(G.boards['1'].shots[SIZE * SIZE - 1]).toBe('miss');
    expect(client.getState()?.ctx.currentPlayer).toBe('1');
  });

  it('records a hit on a ship cell', () => {
    const client = readyBattle();
    client.moves.fire(0); // player 1 carrier at 0..4
    const G = client.getState()?.G as BattleshipState;
    expect(G.boards['1'].shots[0]).toBe('hit');
  });

  it('sinks a ship when all its cells are hit', () => {
    const client = readyBattle();
    // Sink player 1 destroyer (id 4, length 2) at row 4 cols 0-1
    const cells = cellsForShip(4, 4 * SIZE, 'H');
    for (const c of cells) {
      client.updatePlayerID('0');
      client.moves.fire(c);
      if (client.getState()?.ctx.currentPlayer === '1') {
        // opponent must fire somewhere harmless
        client.updatePlayerID('1');
        client.moves.fire(SIZE * 9);
      }
    }
    // Client.getState applies playerView; null seat returns master G.
    client.updatePlayerID(null);
    const G = client.getState()?.G as BattleshipState;
    const ship = G.boards['1'].ships.find((s) => s.id === 4);
    expect(ship?.sunk).toBe(true);
    for (const c of cells) {
      expect(G.boards['1'].shots[c]).toBe('sunk');
    }
  });

  it('ends with a winner when all opponent ships are sunk', () => {
    const client = readyBattle();
    // Classic fleet for player 1: rows 0..4 at col 0.
    const targets = SHIP_LENGTHS.flatMap((_, shipId) => cellsForShip(shipId, shipId * SIZE, 'H'));
    let guard = 0;
    while (!client.getState()?.ctx.gameover && guard++ < 200) {
      const state = client.getState();
      const shooter = state?.ctx.currentPlayer as string;
      client.updatePlayerID(shooter);
      const G = client.getState()?.G as BattleshipState | undefined;
      if (!G) break;
      if (shooter === '0') {
        const next = targets.find((i) => G.boards['1'].shots[i] === null);
        if (next === undefined) break;
        client.moves.fire(next);
      } else {
        // player 1 wastes shots on empty water (rows 5+)
        const miss = G.boards['0'].shots.findIndex((s, i) => s === null && i >= SIZE * 5);
        client.moves.fire(miss >= 0 ? miss : 0);
      }
    }
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '0' });
  });
});

describe('Battleship playerView', () => {
  it('does not leak unhit opponent ship cells', () => {
    const client = startClient();
    placeClassicFleet(client, '0');
    placeClassicFleet(client, '1');
    // Master state (playerView with null keeps fleets).
    client.updatePlayerID(null);
    const state = client.getState();
    const G = state?.G as BattleshipState;
    const ctx = state?.ctx;
    expect(ctx).toBeTruthy();
    expect(G.boards['0'].ships.length).toBe(SHIP_LENGTHS.length);
    expect(G.boards['1'].ships.length).toBe(SHIP_LENGTHS.length);

    const view = Battleship.playerView!({ G, ctx: ctx!, playerID: '0' }) as BattleshipState;
    expect(view.boards['0'].ships.length).toBe(SHIP_LENGTHS.length);
    expect(view.boards['1'].ships).toEqual([]);
    expect(view.boards['1'].shots).toHaveLength(SIZE * SIZE);

    const full = Battleship.playerView!({ G, ctx: ctx!, playerID: null }) as BattleshipState;
    expect(full.boards['1'].ships.length).toBe(SHIP_LENGTHS.length);

    client.updatePlayerID('0');
    client.moves.fire(0);
    const fog = client.getState()?.G as BattleshipState;
    expect(fog.boards['1'].ships).toEqual([]);
    expect(fog.boards['1'].shots[0]).toBe('hit');
    expect(fog.boards['0'].ships.length).toBe(SHIP_LENGTHS.length);
  });
});

describe('Battleship helpers and AI', () => {
  it('lists legal placements and fires', () => {
    expect(legalPlacements([], 0).length).toBeGreaterThan(0);
    expect(cellsForShip(99, 0, 'H')).toEqual([]);
    expect(isLegalPlacement([], 0, 0, 'X' as 'H')).toBe(false);
    expect(nextShipId({ ships: [], shots: [], ready: false })).toBe(0);

    const emptyShots = Array(SIZE * SIZE).fill(null);
    emptyShots[0] = 'miss';
    const G: BattleshipState = {
      boards: {
        '0': { ships: [], shots: emptyShots, ready: true },
        '1': { ships: [], shots: emptyShots.slice(), ready: true },
      },
    };
    expect(legalFires(G, '0')).not.toContain(0);
    expect(legalFires(G, '0').length).toBe(SIZE * SIZE - 1);
    expect(legalFires({ boards: {} }, '0')).toEqual([]);
    expect(
      nextShipId({
        ships: [0, 1, 2, 3, 4].map((id) => ({ id, cells: [id], sunk: false })),
        shots: [],
        ready: false,
      }),
    ).toBeNull();
    expect(isLegalPlacement([], -1, 0, 'H')).toBe(false);
    expect(isLegalPlacement([], 0, -1, 'H')).toBe(false);
    expect(isLegalPlacement([{ id: 0, cells: [0, 1, 2, 3, 4], sunk: false }], 0, 10, 'H')).toBe(
      false,
    );
  });

  it('enumerates setup placements, confirm, and battle fires', () => {
    const client = startClient();
    const enumerate = Battleship.ai!.enumerate!;

    let state = client.getState()!;
    const setupMoves = enumerate(state.G as BattleshipState, state.ctx, '0');
    expect(setupMoves.length).toBeGreaterThan(0);
    expect(setupMoves[0]).toMatchObject({ move: 'placeShip' });

    placeClassicFleet(client, '0');
    // Player 0 ready: enumerate empty for that seat
    client.updatePlayerID(null);
    state = client.getState()!;
    const GReady = state.G as BattleshipState;
    expect(enumerate(GReady, state.ctx, '0')).toEqual([]);

    // Player 1 almost ready: all ships placed, confirm next
    client.updatePlayerID('1');
    for (let shipId = 0; shipId < SHIP_LENGTHS.length; shipId++) {
      client.moves.placeShip(shipId, shipId * SIZE, 'H');
    }
    state = client.getState()!;
    expect(enumerate(state.G as BattleshipState, state.ctx, '1')).toEqual([
      { move: 'confirmSetup' },
    ]);
    client.moves.confirmSetup();

    state = client.getState()!;
    expect(state.ctx.phase).toBe('battle');
    const fires = enumerate(state.G as BattleshipState, state.ctx, '0');
    expect(fires.every((m) => 'move' in m && m.move === 'fire')).toBe(true);
    expect(fires.length).toBe(SIZE * SIZE);

    // Missing board / fallback playerID
    expect(enumerate(state.G as BattleshipState, state.ctx, '9')).toEqual([]);
    const viaCurrent = enumerate(
      state.G as BattleshipState,
      { ...state.ctx, phase: 'setup', currentPlayer: '0' },
      undefined as unknown as string,
    );
    // phase setup with undefined playerID uses currentPlayer (already ready -> [])
    expect(viaCurrent).toEqual([]);
  });

  it('rejects illegal fire and confirmSetup', () => {
    const client = startClient();
    client.moves.confirmSetup();
    const early = client.getState()?.G as BattleshipState | undefined;
    expect(early?.boards['0'].ready).toBe(false);

    placeClassicFleet(client, '0');
    placeClassicFleet(client, '1');
    client.updatePlayerID('0');
    client.moves.fire(0);
    client.updatePlayerID('1');
    client.moves.fire(99);
    client.updatePlayerID('0');
    const before = structuredClone(client.getState()?.G);
    client.moves.fire(0); // repeat shot on opponent
    client.moves.fire(-1);
    client.moves.fire(1.5);
    expect(client.getState()?.G).toEqual(before);
  });

  it('covers edge move guards and player 1 win', () => {
    type MoveFn = (ctx: Record<string, unknown>, ...args: unknown[]) => unknown;
    const setupMoves = Battleship.phases!.setup!.moves!;
    const placeShip = setupMoves.placeShip as MoveFn;
    const confirmSetup = setupMoves.confirmSetup as MoveFn;
    const fire = Battleship.phases!.battle!.moves!.fire as MoveFn;
    const endTurn = () => {};

    const empty: BattleshipState = {
      boards: {
        '0': { ships: [], shots: Array(SIZE * SIZE).fill(null), ready: false },
        '1': { ships: [], shots: Array(SIZE * SIZE).fill(null), ready: false },
      },
    };
    expect(
      placeShip({ G: { boards: {} }, ctx: { currentPlayer: '0' }, playerID: '0' }, 0, 0, 'H'),
    ).toBe(INVALID_MOVE);
    expect(
      confirmSetup({
        G: { boards: {} },
        ctx: { currentPlayer: '0' },
        playerID: undefined,
        events: { endTurn },
      }),
    ).toBe(INVALID_MOVE);
    empty.boards['0'].ready = true;
    expect(placeShip({ G: empty, ctx: { currentPlayer: '0' }, playerID: '0' }, 0, 0, 'H')).toBe(
      INVALID_MOVE,
    );
    expect(
      confirmSetup({
        G: empty,
        ctx: { currentPlayer: '0' },
        playerID: '0',
        events: { endTurn },
      }),
    ).toBe(INVALID_MOVE);
    expect(
      fire(
        { G: { boards: { '0': empty.boards['0'] } }, ctx: { currentPlayer: '0' }, playerID: '0' },
        0,
      ),
    ).toBe(INVALID_MOVE);
    expect(fire({ G: empty, ctx: { currentPlayer: '0' }, playerID: undefined }, 'x')).toBe(
      INVALID_MOVE,
    );

    empty.boards['0'].ready = false;
    expect(
      placeShip({ G: empty, ctx: { currentPlayer: '0' }, playerID: undefined }, 0, 0, 'H'),
    ).toBeUndefined();

    const endIf = Battleship.endIf as (ctx: {
      G: BattleshipState;
      ctx: { phase: string };
    }) => unknown;
    expect(
      endIf({
        G: {
          boards: {
            '0': empty.boards['0'],
            '1': { ships: [], shots: [], ready: true },
          },
        },
        ctx: { phase: 'battle' },
      }),
    ).toBeUndefined();
    expect(endIf({ G: empty, ctx: { phase: 'setup' } })).toBeUndefined();

    const client = startClient();
    placeClassicFleet(client, '0');
    placeClassicFleet(client, '1');
    const targets = SHIP_LENGTHS.flatMap((_, shipId) => cellsForShip(shipId, shipId * SIZE, 'H'));
    let guard = 0;
    while (!client.getState()?.ctx.gameover && guard++ < 200) {
      const shooter = client.getState()?.ctx.currentPlayer as string;
      client.updatePlayerID(shooter);
      const G = client.getState()?.G as BattleshipState | undefined;
      if (!G) break;
      if (shooter === '1') {
        const next = targets.find((i) => G.boards['0'].shots[i] === null);
        if (next === undefined) break;
        client.moves.fire(next);
      } else {
        const miss = G.boards['1'].shots.findIndex((s, i) => s === null && i >= SIZE * 5);
        client.moves.fire(miss >= 0 ? miss : 99);
      }
    }
    expect(client.getState()?.ctx.gameover).toEqual({ winner: '1' });
  });
});
