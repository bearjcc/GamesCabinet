/**
 * Near-optimal solo route bot for diagnosis: full deck visibility + lookahead.
 */
import type { Client } from 'boardgame.io/client';
import {
  type BotPlacement,
  drawnTile,
  finishDraft,
  legalSpots,
  placementExtendsRoute,
} from './bot';
import type { TracksState } from './game';
import type { Board, Cell } from './grid';
import {
  isConnected,
  isDestinationSlot,
  placeError,
  placeTile,
  reachableFromStart,
  START_ROW,
} from './grid';
import type { Tile } from './tiles';
import { allowedRotations } from './tiles';

type TracksClient = ReturnType<typeof Client<TracksState>>;

function cloneBoard(board: Board): Board {
  return board.map((cell) => {
    if (!cell) return null;
    const copy: Cell = { base: { tile: cell.base.tile, rot: cell.base.rot } };
    if (cell.top) copy.top = { tile: cell.top.tile, rot: cell.top.rot };
    return copy;
  });
}

function cloneState(g: TracksState): TracksState {
  return {
    ...g,
    deck: [...g.deck],
    discard: [...g.discard],
    players: g.players.map((p) => ({
      ...p,
      board: cloneBoard(p.board),
      hand: [...p.hand],
      objectives: [...p.objectives],
      draft: [...p.draft],
    })),
    scores: [...g.scores],
    connectedOrder: [...g.connectedOrder],
    publicObjectives: [...g.publicObjectives],
    objectiveRaces: { ...g.objectiveRaces },
  };
}

function allowsDestination(spot: BotPlacement, g: TracksState, tile: Tile): boolean {
  if (!isDestinationSlot(spot.row, spot.col)) return true;
  const board = g.players[spot.target].board;
  const trial = cloneBoard(board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

function applyPlay(g: TracksState, me: number, spot: BotPlacement, tile: Tile): void {
  const p = g.players[me];
  const idx = p.hand.findIndex((t) => t.id === tile.id);
  if (idx >= 0) p.hand.splice(idx, 1);
  placeTile(g.players[spot.target].board, tile, spot.row, spot.col, spot.rot);
  g.drawnId = null;
  g.drewFromDiscard = false;
}

function applyDiscard(g: TracksState, me: number, tile: Tile): void {
  const p = g.players[me];
  const idx = p.hand.findIndex((t) => t.id === tile.id);
  if (idx >= 0) {
    g.discard.push(p.hand.splice(idx, 1)[0]);
  }
  g.drawnId = null;
  g.drewFromDiscard = false;
  if (g.players.length === 1) g.soloDiscards = (g.soloDiscards ?? 0) + 1;
}

/** Greedy forward sim with known deck order; returns turns until connect or null. */
export function simulateTurnsToConnect(g: TracksState, me: number, cap = 150): number | null {
  const sim = cloneState(g);
  let turns = 0;
  while (turns < cap) {
    const board = sim.players[me].board;
    if (isConnected(board, reachableFromStart(board))) return turns;

    if (sim.drawnId === null) {
      if (sim.deck.length === 0) return null;
      const card = sim.deck.shift()!;
      sim.players[me].hand.push(card);
      sim.drawnId = card.id;
    }

    const tile = drawnTile(sim, me);
    if (!tile) return null;

    const spots = legalSpots(sim, me, tile).filter((s) => allowsDestination(s, sim, tile));
    const pick =
      pickGreedyPlacement(sim, me, tile, spots) ??
      (tile.kind === 'obstacle' && spots.length > 0 ? spots[0] : null);

    if (pick) {
      applyPlay(sim, me, pick, tile);
    } else if (!sim.drewFromDiscard) {
      applyDiscard(sim, me, tile);
      if ((sim.soloDiscards ?? 0) >= 5 && sim.players.length === 1) return null;
    } else {
      return null;
    }
    turns++;
  }
  return null;
}

function pickGreedyPlacement(
  g: TracksState,
  me: number,
  tile: Tile,
  spots: BotPlacement[],
): BotPlacement | null {
  const extending = spots.filter((s) => {
    const foreign = s.target !== me;
    return placementExtendsRoute(g.players[s.target].board, tile, s.row, s.col, s.rot, foreign);
  });
  const pool =
    extending.length > 0
      ? extending
      : spots.filter((s) => {
          const trial = cloneBoard(g.players[s.target].board);
          placeTile(trial, tile, s.row, s.col, s.rot);
          return isConnected(trial, reachableFromStart(trial));
        });
  if (pool.length === 0) return null;
  const main = pool.filter((s) => s.row === START_ROW);
  return (main.length > 0 ? main : pool)[0];
}

/** Pick placement minimizing simulated turns-to-connect (1-ply lookahead). */
export function pickOraclePlacement(g: TracksState, me: number, tile: Tile): BotPlacement | null {
  const spots = legalSpots(g, me, tile).filter((s) => allowsDestination(s, g, tile));
  if (spots.length === 0) return null;

  let best: BotPlacement | null = null;
  let bestTurns = Infinity;

  for (const spot of spots) {
    const sim = cloneState(g);
    applyPlay(sim, me, spot, tile);
    const turns = simulateTurnsToConnect(sim, me);
    const total = turns === null ? Infinity : 1 + turns;
    if (total < bestTurns) {
      bestTurns = total;
      best = spot;
    }
  }
  return best;
}

function turnAdvanced(
  before: {
    ctx: { currentPlayer: string; phase: string; turn: number };
    G: TracksState;
  },
  after: {
    ctx: { currentPlayer: string; phase: string; turn: number };
    G: TracksState;
  } | null,
): boolean {
  if (!after) return false;
  if (after.ctx.turn !== before.ctx.turn) return true;
  if (before.G.drawnId !== null && after.G.drawnId === null) return true;
  return (
    after.ctx.currentPlayer !== before.ctx.currentPlayer || after.ctx.phase !== before.ctx.phase
  );
}

/** One play-phase turn for solo (or current seat) using oracle placement. */
export function playOracleTurn(client: TracksClient): 'ok' | 'stuck' | 'over' {
  const state = client.getState();
  if (!state) return 'stuck';
  if (state.ctx.gameover) return 'over';
  if (state.ctx.phase === 'draft') {
    finishDraft(client);
    return 'ok';
  }

  const g = state.G;
  const me = Number(state.ctx.currentPlayer);

  if (g.drawnId === null) {
    if (g.deck.length > 0) {
      client.moves.drawTile('deck');
      return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
    }
    return 'stuck';
  }

  const tile = drawnTile(g, me);
  if (!tile) return 'stuck';

  const spot = pickOraclePlacement(g, me, tile);
  if (spot) {
    client.moves.playTile(spot.cardId, spot.target, spot.row, spot.col, spot.rot);
    return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
  }
  if (!g.drewFromDiscard) {
    client.moves.discardTile(tile.id);
    return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
  }
  return 'stuck';
}

/** Ideal main-row straight chain length to reach destination (easy side). */
export function mainRowStraightSlotsToEnd(): number {
  let count = 0;
  const board = Array<Cell | null>(24).fill(null);
  const straight: Tile = { id: 'ideal', kind: 'straight' };
  for (let col = 0; col < 8; col++) {
    for (const rot of allowedRotations('straight')) {
      if (placeError(board as Board, straight, START_ROW, col, rot, { foreign: false }) === null) {
        placeTile(board as Board, straight, START_ROW, col, rot);
        count++;
        break;
      }
    }
    if (isConnected(board as Board, reachableFromStart(board as Board))) break;
  }
  return count;
}
