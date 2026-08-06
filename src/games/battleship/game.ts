import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import { idx, rowCol } from '../shared/grid';

export const SIZE = 10;
export const SHIP_LENGTHS = [5, 4, 3, 3, 2] as const;
export type Orientation = 'H' | 'V';
export type Shot = null | 'hit' | 'miss' | 'sunk';

export type Ship = {
  id: number;
  cells: number[];
  sunk: boolean;
};

export type PlayerBoard = {
  ships: Ship[];
  /** Shots received on this board (public). */
  shots: Shot[];
  ready: boolean;
};

export type BattleshipState = {
  boards: Record<string, PlayerBoard>;
};

function emptyBoard(): PlayerBoard {
  return {
    ships: [],
    shots: Array(SIZE * SIZE).fill(null) as Shot[],
    ready: false,
  };
}

export function cellsForShip(shipId: number, origin: number, dir: Orientation): number[] {
  const length = SHIP_LENGTHS[shipId];
  if (length === undefined) return [];
  const { row, col } = rowCol(origin, SIZE);
  const cells: number[] = [];
  for (let i = 0; i < length; i++) {
    const r = dir === 'V' ? row + i : row;
    const c = dir === 'H' ? col + i : col;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return [];
    cells.push(idx(r, c, SIZE));
  }
  return cells;
}

export function isLegalPlacement(
  ships: Ship[],
  shipId: number,
  origin: number,
  dir: Orientation,
): boolean {
  if (!Number.isInteger(shipId) || shipId < 0 || shipId >= SHIP_LENGTHS.length) return false;
  if (!Number.isInteger(origin) || origin < 0 || origin >= SIZE * SIZE) return false;
  if (dir !== 'H' && dir !== 'V') return false;
  if (ships.some((s) => s.id === shipId)) return false;
  const cells = cellsForShip(shipId, origin, dir);
  if (cells.length === 0) return false;
  const occupied = new Set(ships.flatMap((s) => s.cells));
  return cells.every((c) => !occupied.has(c));
}

function opponent(player: string): string {
  return player === '0' ? '1' : '0';
}

function allShipsPlaced(board: PlayerBoard): boolean {
  return SHIP_LENGTHS.every((_, id) => board.ships.some((s) => s.id === id));
}

export function nextShipId(board: PlayerBoard): number | null {
  for (let id = 0; id < SHIP_LENGTHS.length; id++) {
    if (!board.ships.some((s) => s.id === id)) return id;
  }
  return null;
}

export function legalFires(G: BattleshipState, player: string): number[] {
  const opp = opponent(player);
  const shots = G.boards[opp]?.shots;
  if (!shots) return [];
  const open: number[] = [];
  for (let i = 0; i < shots.length; i++) {
    if (shots[i] === null) open.push(i);
  }
  return open;
}

/** All valid (origin, dir) placements for a ship against current ships. */
export function legalPlacements(
  ships: Ship[],
  shipId: number,
): Array<{ origin: number; dir: Orientation }> {
  const out: Array<{ origin: number; dir: Orientation }> = [];
  for (let origin = 0; origin < SIZE * SIZE; origin++) {
    for (const dir of ['H', 'V'] as const) {
      if (isLegalPlacement(ships, shipId, origin, dir)) {
        out.push({ origin, dir });
      }
    }
  }
  return out;
}

function bothReady(G: BattleshipState): boolean {
  return G.boards['0'].ready && G.boards['1'].ready;
}

function allOpponentSunk(G: BattleshipState, player: string): boolean {
  const opp = G.boards[opponent(player)];
  if (!opp || opp.ships.length < SHIP_LENGTHS.length) return false;
  return opp.ships.every((s) => s.sunk);
}

/**
 * Phases: boardgame.io `setup` then `battle` (not a G.phase field).
 * Setup uses sequential turns so local hotseat stays coherent; each seat
 * places its full fleet and confirmSetup, then the other seat; phase ends
 * when both boards are ready.
 */
export const Battleship: Game<BattleshipState> = {
  name: 'battleship',
  setup: () => ({
    boards: {
      '0': emptyBoard(),
      '1': emptyBoard(),
    },
  }),
  phases: {
    setup: {
      start: true,
      next: 'battle',
      endIf: ({ G }) => bothReady(G),
      turn: { minMoves: 1, maxMoves: 40 },
      moves: {
        placeShip: ({ G, ctx, playerID }, shipId: number, origin: number, dir: Orientation) => {
          const pid = playerID ?? ctx.currentPlayer;
          const board = G.boards[pid];
          if (!board || board.ready) return INVALID_MOVE;
          if (!isLegalPlacement(board.ships, shipId, origin, dir)) return INVALID_MOVE;
          board.ships.push({
            id: shipId,
            cells: cellsForShip(shipId, origin, dir),
            sunk: false,
          });
        },
        confirmSetup: ({ G, ctx, playerID, events }) => {
          const pid = playerID ?? ctx.currentPlayer;
          const board = G.boards[pid];
          if (!board || board.ready) return INVALID_MOVE;
          if (!allShipsPlaced(board)) return INVALID_MOVE;
          board.ready = true;
          events.endTurn();
        },
      },
    },
    battle: {
      turn: { minMoves: 1, maxMoves: 1 },
      moves: {
        fire: ({ G, ctx, playerID }, index: number) => {
          const pid = playerID ?? ctx.currentPlayer;
          if (typeof index !== 'number' || !Number.isInteger(index)) return INVALID_MOVE;
          if (index < 0 || index >= SIZE * SIZE) return INVALID_MOVE;
          const opp = opponent(pid);
          const board = G.boards[opp];
          if (!board || board.shots[index] !== null) return INVALID_MOVE;

          const ship = board.ships.find((s) => s.cells.includes(index));
          if (!ship) {
            board.shots[index] = 'miss';
            return;
          }

          board.shots[index] = 'hit';
          const allHit = ship.cells.every(
            (c) => board.shots[c] === 'hit' || board.shots[c] === 'sunk',
          );
          if (allHit) {
            ship.sunk = true;
            for (const c of ship.cells) board.shots[c] = 'sunk';
          }
        },
      },
    },
  },
  endIf: ({ G, ctx }) => {
    if (ctx.phase !== 'battle') return;
    // After a fire, currentPlayer has already advanced; check both seats.
    if (allOpponentSunk(G, '0')) return { winner: '0' };
    if (allOpponentSunk(G, '1')) return { winner: '1' };
  },
  playerView: ({ G, playerID }) => {
    if (playerID == null) {
      // Spectator / local full state: still strip nothing for pass-and-play clarity.
      return G;
    }
    const view: BattleshipState = {
      boards: {
        '0': {
          ...G.boards['0'],
          ships: [...G.boards['0'].ships],
          shots: [...G.boards['0'].shots],
        },
        '1': {
          ...G.boards['1'],
          ships: [...G.boards['1'].ships],
          shots: [...G.boards['1'].shots],
        },
      },
    };
    const opp = opponent(playerID);
    view.boards[opp] = {
      ...view.boards[opp],
      ships: [],
    };
    return view;
  },
  ai: {
    enumerate: (G, ctx, playerID) => {
      const pid = playerID ?? ctx.currentPlayer;
      if (ctx.phase === 'setup') {
        const board = G.boards[pid];
        if (!board || board.ready) return [];
        const next = nextShipId(board);
        if (next === null) return [{ move: 'confirmSetup' }];
        const placements = legalPlacements(board.ships, next);
        // Medium-deterministic: return a small sample of valid placements.
        const step = Math.max(1, Math.floor(placements.length / 8));
        const sample = placements.filter((_, i) => i % step === 0).slice(0, 8);
        return sample.map((p) => ({
          move: 'placeShip',
          args: [next, p.origin, p.dir],
        }));
      }
      if (!G.boards[pid]) return [];
      return legalFires(G, pid).map((i) => ({ move: 'fire', args: [i] }));
    },
  },
};
