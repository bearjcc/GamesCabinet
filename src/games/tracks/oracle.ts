/**
 * Near-optimal solo route bot for diagnosis: full deck visibility + lookahead.
 */
import type { Client } from 'boardgame.io/client';
import {
  type BotPlacement,
  drawnTile,
  finishDraft,
  legalSpots,
  pickPlacement,
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
  rightmostConnectedColumn,
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

export function cloneState(g: TracksState): TracksState {
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

export function applyPlay(g: TracksState, me: number, spot: BotPlacement, tile: Tile): void {
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
      const opponents = Math.max(0, sim.players.length - 1);
      for (let o = 0; o < opponents; o++) {
        if (sim.deck.length === 0) return null;
        sim.deck.shift();
      }
      if (sim.deck.length === 0) return null;
      const card = sim.deck.shift()!;
      sim.players[me].hand.push(card);
      sim.drawnId = card.id;
    }

    let chosen: { tile: Tile; pick: BotPlacement } | null = null;
    let bestPri = -Infinity;
    for (const tile of [...sim.players[me].hand]) {
      const spots = legalSpots(sim, me, tile).filter((s) => allowsDestination(s, sim, tile));
      const progress = spots.filter((s) => {
        const foreign = s.target !== me;
        return (
          placementExtendsRoute(sim.players[s.target].board, tile, s.row, s.col, s.rot, foreign) ||
          spotConnects(sim, me, tile, s)
        );
      });
      const pool = tile.kind === 'obstacle' ? spots : progress.length > 0 ? progress : [];
      const pick =
        pickGreedyPlacement(sim, me, tile, pool) ??
        (tile.kind === 'obstacle' && spots.length > 0 ? spots[0] : null);
      if (!pick) continue;
      const trial = cloneBoard(sim.players[pick.target].board);
      placeTile(trial, tile, pick.row, pick.col, pick.rot);
      const reach = reachableFromStart(trial);
      let pri = rightmostConnectedColumn(reach);
      if (isConnected(trial, reach)) pri += 10_000;
      if (pri > bestPri) {
        bestPri = pri;
        chosen = { tile, pick };
      }
    }

    if (chosen) {
      applyPlay(sim, me, chosen.pick, chosen.tile);
    } else {
      const tile = drawnTile(sim, me);
      if (!tile) return null;
      if (!sim.drewFromDiscard) {
        applyDiscard(sim, me, tile);
        if ((sim.soloDiscards ?? 0) >= 5 && sim.players.length === 1) return null;
      } else {
        return null;
      }
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

function spotConnects(g: TracksState, _me: number, tile: Tile, spot: BotPlacement): boolean {
  const trial = cloneBoard(g.players[spot.target].board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

function rankRouteCandidates(
  g: TracksState,
  me: number,
  tile: Tile,
  spots: BotPlacement[],
): BotPlacement[] {
  const scored = spots.map((spot) => {
    const board = g.players[spot.target].board;
    const before = rightmostConnectedColumn(reachableFromStart(board));
    const trial = cloneBoard(board);
    placeTile(trial, tile, spot.row, spot.col, spot.rot);
    const after = rightmostConnectedColumn(reachableFromStart(trial));
    const connects = spotConnects(g, me, tile, spot);
    const main = spot.target === me && spot.row === START_ROW ? 1 : 0;
    const delta = after - before;
    const priority = connects
      ? 1_000_000
      : delta > 0
        ? 100_000 + after * 1000 + delta * 500
        : main * 100 + after;
    return { spot, priority };
  });
  scored.sort((a, b) => b.priority - a.priority);
  return scored.map((s) => s.spot);
}

/** 1-ply deck-order lookahead among a small candidate set (sim bot). */
export function pickAmongRoutePlacements(
  g: TracksState,
  me: number,
  tile: Tile,
  spots: BotPlacement[],
  maxCandidates = 12,
  simCap = 120,
): BotPlacement | null {
  if (spots.length === 0) return null;
  if (spots.length === 1) return spots[0];

  const ranked = rankRouteCandidates(g, me, tile, spots).slice(0, maxCandidates);
  let best: BotPlacement | null = null;
  let bestTurns = Infinity;

  for (const spot of ranked) {
    const sim = cloneState(g);
    applyPlay(sim, me, spot, tile);
    const turns = simulateTurnsToConnect(sim, me, simCap);
    const total = turns === null ? 10_000 + spot.row : 1 + turns;
    if (total < bestTurns) {
      bestTurns = total;
      best = spot;
    }
  }
  return best;
}

/** Pick placement minimizing simulated turns-to-connect (1-ply lookahead). */
export function pickOraclePlacement(g: TracksState, me: number, tile: Tile): BotPlacement | null {
  const spots = legalSpots(g, me, tile).filter((s) => allowsDestination(s, g, tile));
  return pickAmongRoutePlacements(g, me, tile, spots, 16, 150);
}

function simCapForPlayers(numPlayers: number): number {
  if (numPlayers <= 2) return 280;
  if (numPlayers <= 4) return 180;
  return 160;
}

function lookaheadCandidatesForPlayers(numPlayers: number): number {
  if (numPlayers <= 2) return 16;
  if (numPlayers <= 4) return 12;
  return 14;
}

/**
 * Best progressing play from the current hand (respecting discard-draw tile lock).
 * Minimizes simulated turns-to-connect with deck-order lookahead.
 */
export function pickBestRoutePlay(
  g: TracksState,
  me: number,
  numPlayers: number,
): { tile: Tile; spot: BotPlacement } | null {
  const drewFromDiscard = g.drewFromDiscard;
  const drawnId = g.drawnId;
  const simCap = simCapForPlayers(numPlayers);
  const maxCand = lookaheadCandidatesForPlayers(numPlayers);

  let chosen: { tile: Tile; spot: BotPlacement } | null = null;
  let bestTurns = Infinity;

  const tiles: Tile[] = [];
  if (drewFromDiscard && drawnId) {
    const top = g.discard[g.discard.length - 1];
    if (top?.id === drawnId) tiles.push(top);
  }
  for (const tile of g.players[me].hand) {
    if (drewFromDiscard && tile.id !== drawnId) continue;
    if (!tiles.some((t) => t.id === tile.id)) tiles.push(tile);
  }

  for (const tile of tiles) {
    const spots = legalSpots(g, me, tile).filter((s) => allowsDestination(s, g, tile));
    if (spots.length === 0) continue;

    const progress = spots.filter((s) => {
      const foreign = s.target !== me;
      return (
        placementExtendsRoute(g.players[s.target].board, tile, s.row, s.col, s.rot, foreign) ||
        spotConnects(g, me, tile, s)
      );
    });

    let spot: BotPlacement | null = null;
    if (tile.kind === 'obstacle') {
      spot = pickPlacement(spots, g, me, tile);
    } else if (progress.length > 0) {
      spot =
        pickAmongRoutePlacements(g, me, tile, progress, maxCand, simCap) ??
        pickGreedyPlacement(g, me, tile, progress);
    }
    if (!spot) continue;

    const sim = cloneState(g);
    applyPlay(sim, me, spot, tile);
    const turns = simulateTurnsToConnect(sim, me, simCap);
    const total = turns === null ? 20_000 + spot.col : 1 + turns;
    if (total < bestTurns) {
      bestTurns = total;
      chosen = { tile, spot };
    }
  }

  return chosen;
}

/** Ranked progressing plays for the current seat (lower `turns` is better). */
export function rankRoutePlays(
  g: TracksState,
  me: number,
  numPlayers: number,
  limit = 16,
): { tile: Tile; spot: BotPlacement; turns: number }[] {
  const drewFromDiscard = g.drewFromDiscard;
  const drawnId = g.drawnId;
  const simCap = simCapForPlayers(numPlayers);
  const maxCand = lookaheadCandidatesForPlayers(numPlayers);

  const tiles: Tile[] = [];
  if (drewFromDiscard && drawnId) {
    const top = g.discard[g.discard.length - 1];
    if (top?.id === drawnId) tiles.push(top);
  }
  for (const tile of g.players[me].hand) {
    if (drewFromDiscard && tile.id !== drawnId) continue;
    if (!tiles.some((t) => t.id === tile.id)) tiles.push(tile);
  }

  const ranked: { tile: Tile; spot: BotPlacement; turns: number }[] = [];
  for (const tile of tiles) {
    const spots = legalSpots(g, me, tile).filter((s) => allowsDestination(s, g, tile));
    if (spots.length === 0) continue;

    const progress = spots.filter((s) => {
      const foreign = s.target !== me;
      return (
        placementExtendsRoute(g.players[s.target].board, tile, s.row, s.col, s.rot, foreign) ||
        spotConnects(g, me, tile, s)
      );
    });

    let spot: BotPlacement | null = null;
    if (tile.kind === 'obstacle') {
      spot = pickPlacement(spots, g, me, tile);
    } else if (progress.length > 0) {
      spot =
        pickAmongRoutePlacements(g, me, tile, progress, maxCand, simCap) ??
        pickGreedyPlacement(g, me, tile, progress);
    }
    if (!spot) continue;

    const sim = cloneState(g);
    applyPlay(sim, me, spot, tile);
    const turns = simulateTurnsToConnect(sim, me, simCap);
    ranked.push({ tile, spot, turns: turns === null ? 20_000 + spot.col : 1 + turns });
  }

  ranked.sort((a, b) => a.turns - b.turns);
  return ranked.slice(0, limit);
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

function spotConnectsBoard(
  board: Board,
  tile: Tile,
  spot: BotPlacement,
  foreign: boolean,
): boolean {
  if (placeError(board, tile, spot.row, spot.col, spot.rot, { foreign }) !== null) return false;
  const trial = cloneBoard(board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

/** One turn with deck-order lookahead (draft, draw, play/discard). */
export function playOracleTurn(client: TracksClient, numPlayers = 1): 'ok' | 'stuck' | 'over' {
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
    const top = g.discard[g.discard.length - 1];
    const discardPlayable =
      numPlayers > 1 &&
      top &&
      g.discardDrawRule === '2023' &&
      legalSpots(g, me, top).some((s) => allowsDestination(s, g, top));

    if (discardPlayable && top) {
      const topSpots = legalSpots(g, me, top).filter((s) => allowsDestination(s, g, top));
      const topProgress = topSpots.some((s) => {
        const foreign = s.target !== me;
        const board = g.players[s.target].board;
        return (
          spotConnectsBoard(board, top, s, foreign) ||
          placementExtendsRoute(board, top, s.row, s.col, s.rot, foreign)
        );
      });
      if (topProgress) {
        client.moves.drawTile('discard');
        return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
      }
    }

    if (g.deck.length > 0) {
      client.moves.drawTile('deck');
      return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
    }
    if (discardPlayable) {
      client.moves.drawTile('discard');
      return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
    }
    if (g.deck.length === 0 && g.discard.length > 0) {
      client.moves.drawTile('deck');
      const after = client.getState()?.G ?? g;
      return drawnTile(after, me) ? 'ok' : 'stuck';
    }
    return 'stuck';
  }

  const tile = drawnTile(g, me);
  if (!tile) return 'stuck';

  const spot = pickOraclePlacement(g, me, tile);
  if (spot) {
    client.moves.playTile(tile.id, spot.target, spot.row, spot.col, spot.rot);
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
