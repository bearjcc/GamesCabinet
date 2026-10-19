/**
 * Greedy TRACKS bot for headless sims and tests. Uses real placement rules only.
 */
import type { Client } from 'boardgame.io/client';
import type { TracksState } from './game';

type TracksClient = ReturnType<typeof Client<TracksState>>;

import type { Board, Cell } from './grid';
import {
  cellAt,
  cellEdges,
  isConnected,
  isDestinationSlot,
  placeError,
  placeTile,
  reachableFromStart,
  rightmostConnectedColumn,
  START_ROW,
  WIDTH,
} from './grid';
import type { ObjectiveId } from './objectives';
import { allowedRotations, type Tile, type TileKind } from './tiles';

const PLACE_PRIORITY: TileKind[] = [
  'straight',
  'bridge-start',
  'tunnel-arch',
  'bridge-mid',
  'tunnel-mid',
  'curve',
  'junction',
  'whistlestop',
  'obstacle',
];

export type BotPlacement = {
  target: number;
  row: number;
  col: number;
  rot: number;
  cardId: string;
};

export function legalPlacements(
  G: TracksState,
  player: number,
  card: Tile,
  onlyTarget?: number,
): BotPlacement[] {
  const out: BotPlacement[] = [];
  const targets = onlyTarget === undefined ? G.players.map((_, i) => i) : [onlyTarget];
  targets.forEach((target) => {
    const p = G.players[target];
    if (!p) return;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < WIDTH; col++) {
        for (const rot of allowedRotations(card.kind)) {
          if (placeError(p.board, card, row, col, rot, { foreign: target !== player }) === null) {
            out.push({ target, row, col, rot, cardId: card.id });
          }
        }
      }
    }
  });
  return out;
}

function legalSpots(G: TracksState, player: number, card: Tile): BotPlacement[] {
  if (card.kind === 'obstacle') return legalPlacements(G, player, card);
  return legalPlacements(G, player, card, player);
}

const cellKey = (row: number, col: number) => row * WIDTH + col;

export function mainRowFrontierCol(board: Board): number {
  const reach = reachableFromStart(board);
  let best = -1;
  for (const k of reach) {
    const row = Math.floor(k / WIDTH);
    if (row !== START_ROW) continue;
    best = Math.max(best, k % WIDTH);
  }
  return best;
}

/** Main-row slots that extend the route eastward (empty or obstacle awaiting a middle). */
export function extensionCols(board: Board): number[] {
  const reach = reachableFromStart(board);
  const cols: number[] = [];
  for (let col = 0; col < WIDTH; col++) {
    const cell = cellAt(board, START_ROW, col);
    if (!cell) {
      if (col === 0) cols.push(col);
      else if (reach.has(cellKey(START_ROW, col - 1))) {
        const west = cellEdges(cellAt(board, START_ROW, col - 1));
        if (west?.[1]) cols.push(col);
      }
    }
  }
  return cols;
}

function cloneBoard(board: Board): Board {
  return board.map((cell) => {
    if (!cell) return null;
    const copy: Cell = { base: { tile: cell.base.tile, rot: cell.base.rot } };
    if (cell.top) copy.top = { tile: cell.top.tile, rot: cell.top.rot };
    return copy;
  });
}

/** Higher is better: connect first, then extend the eastward route. */
export function placementScore(
  board: Board,
  tile: Tile,
  row: number,
  col: number,
  rot: number,
): number {
  const beforeRm = rightmostConnectedColumn(reachableFromStart(board));
  const trial = cloneBoard(board);
  placeTile(trial, tile, row, col, rot);
  const reach = reachableFromStart(trial);
  const afterRm = rightmostConnectedColumn(reach);
  if (isConnected(trial, reach)) return 10_000_000 + afterRm;
  if (isDestinationSlot(row, col)) return -10_000_000;
  if (tile.kind === 'obstacle' && row === START_ROW) return -5_000_000;
  const delta = afterRm - beforeRm;
  let score = afterRm * 100_000 + delta * 500_000;
  if (delta < 0) score -= 2_000_000;
  if (row === START_ROW) score += 2_000;
  score += col;
  return score;
}

function allowsDestination(spot: BotPlacement, g: TracksState, tile: Tile): boolean {
  if (!isDestinationSlot(spot.row, spot.col)) return true;
  const board = g.players[spot.target].board;
  const trial = cloneBoard(board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

function bestScoredSpot(pool: BotPlacement[], g: TracksState, tile: Tile): BotPlacement {
  let best = pool[0];
  let bestScore = -Infinity;
  for (const spot of pool) {
    const board = g.players[spot.target].board;
    const score = placementScore(board, tile, spot.row, spot.col, spot.rot);
    if (score > bestScore) {
      bestScore = score;
      best = spot;
    }
  }
  return best;
}

function straightExtensionSpot(board: Board, tile: Tile, me: number): BotPlacement | null {
  if (tile.kind !== 'straight') return null;
  const before = mainRowFrontierCol(board);
  let best: BotPlacement | null = null;
  let bestCol = WIDTH;
  for (let col = 0; col < WIDTH; col++) {
    for (const rot of [1, 0] as const) {
      if (placeError(board, tile, START_ROW, col, rot, { foreign: false }) !== null) continue;
      const trial = cloneBoard(board);
      placeTile(trial, tile, START_ROW, col, rot);
      const after = mainRowFrontierCol(trial);
      if (after <= before) continue;
      if (col < bestCol) {
        bestCol = col;
        best = { target: me, row: START_ROW, col, rot, cardId: tile.id };
      }
    }
  }
  return best;
}

export function pickPlacement(
  spots: BotPlacement[],
  g: TracksState,
  me: number,
  tile: Tile,
): BotPlacement {
  const own = spots.filter((s) => s.target === me);
  let pool = own.length > 0 ? own : spots;
  if (tile.kind === 'obstacle') {
    const foreign = spots.filter((s) => s.target !== me);
    if (foreign.length > 0) pool = foreign;
    else pool = pool.filter((s) => s.row !== START_ROW);
  }
  if (pool.length === 0) return spots[0];

  const straight = straightExtensionSpot(g.players[me].board, tile, me);
  if (
    straight &&
    pool.some((s) => s.row === straight.row && s.col === straight.col && s.rot === straight.rot)
  ) {
    return straight;
  }

  const connecting = pool.filter((spot) => {
    const board = g.players[spot.target].board;
    const trial = cloneBoard(board);
    placeTile(trial, tile, spot.row, spot.col, spot.rot);
    return isConnected(trial, reachableFromStart(trial));
  });
  if (connecting.length > 0) return bestScoredSpot(connecting, g, tile);

  const board = g.players[me].board;
  const extendCols = extensionCols(board);
  const extendSpots = pool.filter(
    (s) => s.target === me && s.row === START_ROW && extendCols.includes(s.col),
  );
  if (extendSpots.length > 0) return bestScoredSpot(extendSpots, g, tile);

  for (const kind of PLACE_PRIORITY) {
    if (tile.kind !== kind) continue;
    const mainRow = pool.filter((s) => s.row === START_ROW);
    const tier = mainRow.length > 0 ? mainRow : pool;
    return bestScoredSpot(tier, g, tile);
  }
  return bestScoredSpot(pool, g, tile);
}

export function finishDraft(client: TracksClient) {
  for (let guard = 0; guard < 32; guard++) {
    const state = client.getState();
    if (state?.ctx.phase !== 'draft') return;
    const g = state.G;
    const me = Number(state.ctx.currentPlayer);
    const choice = g.players[me]?.draft[0] as ObjectiveId | undefined;
    if (!choice) return;
    client.moves.chooseObjective(choice);
  }
}

export function drawnTile(g: TracksState, me: number): Tile | null {
  if (g.drawnId === null) return null;
  const hand = g.players[me]?.hand ?? [];
  if (g.drewFromDiscard && g.discard[g.discard.length - 1]?.id === g.drawnId) {
    return g.discard[g.discard.length - 1];
  }
  return hand.find((t) => t.id === g.drawnId) ?? hand[0] ?? null;
}

function turnAdvanced(
  before: { ctx: { currentPlayer: string; phase: string } },
  after: { ctx: { currentPlayer: string; phase: string } } | null,
): boolean {
  if (!after) return false;
  return (
    after.ctx.currentPlayer !== before.ctx.currentPlayer || after.ctx.phase !== before.ctx.phase
  );
}

/** One cabinet turn: draft pick, draw, then play or discard. */
export function playBotTurn(client: TracksClient, numPlayers: number): 'ok' | 'stuck' | 'over' {
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
    if (numPlayers > 1 && g.discard.length > 0) {
      const top = g.discard[g.discard.length - 1];
      if (top && legalSpots(g, me, top).length > 0) {
        client.moves.drawTile('discard');
        return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
      }
    }
    if (g.discard.length > 0) {
      client.moves.drawTile('deck');
      return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
    }
    return 'stuck';
  }

  const tile = drawnTile(g, me);
  if (!tile) return 'stuck';

  const allSpots = legalSpots(g, me, tile);
  let spots = allSpots.filter((s) => allowsDestination(s, g, tile));
  if (spots.length === 0 && g.drewFromDiscard && allSpots.length > 0) {
    spots = allSpots;
  }
  if (spots.length > 0) {
    const primary = pickPlacement(spots, g, me, tile);
    const boardForScore = (s: BotPlacement) => g.players[s.target].board;
    const scored = [...spots].sort(
      (a, b) =>
        placementScore(boardForScore(b), tile, b.row, b.col, b.rot) -
        placementScore(boardForScore(a), tile, a.row, a.col, a.rot),
    );
    const ranked = [primary, ...scored.filter((s) => s !== primary)].slice(0, 16);
    for (const spot of ranked) {
      client.moves.playTile(spot.cardId, spot.target, spot.row, spot.col, spot.rot);
      if (turnAdvanced(state, client.getState())) return 'ok';
    }
    return 'stuck';
  }
  if (!g.drewFromDiscard) {
    client.moves.discardTile(tile.id);
    return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
  }
  /* v8 ignore next */
  return 'stuck';
}
