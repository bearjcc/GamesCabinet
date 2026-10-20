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
import { boardMetrics, type ObjectiveId, scoreObjective } from './objectives';
import type { TurnTelemetry } from './telemetry';
import { allowedRotations, type Tile, type TileKind } from './tiles';

const TRACK_KINDS = new Set<TileKind>([
  'straight',
  'curve',
  'junction',
  'bridge-start',
  'bridge-mid',
  'tunnel-arch',
  'tunnel-mid',
  'whistlestop',
]);

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

export function legalSpots(G: TracksState, player: number, card: Tile): BotPlacement[] {
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

export function placementExtendsRoute(
  board: Board,
  tile: Tile,
  row: number,
  col: number,
  rot: number,
  foreign = false,
): boolean {
  if (placeError(board, tile, row, col, rot, { foreign }) !== null) return false;
  const before = rightmostConnectedColumn(reachableFromStart(board));
  const trial = cloneBoard(board);
  placeTile(trial, tile, row, col, rot);
  const reach = reachableFromStart(trial);
  if (isConnected(trial, reach)) return true;
  return rightmostConnectedColumn(reach) > before;
}

function cloneBoard(board: Board): Board {
  return board.map((cell) => {
    if (!cell) return null;
    const copy: Cell = { base: { tile: cell.base.tile, rot: cell.base.rot } };
    if (cell.top) copy.top = { tile: cell.top.tile, rot: cell.top.rot };
    return copy;
  });
}

function objectivePlacementBonus(
  g: TracksState,
  me: number,
  boardBefore: Board,
  boardAfter: Board,
): number {
  const beforeMetrics = g.players.map((p, i) => boardMetrics(i === me ? boardBefore : p.board));
  const afterMetrics = g.players.map((p, i) => boardMetrics(i === me ? boardAfter : p.board));
  let bonus = 0;
  for (const obj of g.players[me]?.objectives ?? []) {
    const before = scoreObjective(obj, me, beforeMetrics, { races: g.objectiveRaces });
    const after = scoreObjective(obj, me, afterMetrics, { races: g.objectiveRaces });
    if (after > before) bonus += (after - before) * 250_000;
  }
  const beforeRm = rightmostConnectedColumn(reachableFromStart(boardBefore));
  const afterRm = rightmostConnectedColumn(reachableFromStart(boardAfter));
  bonus += (afterRm - beforeRm) * 10_000;
  return bonus;
}

/** Higher is better: connect first, then extend the eastward route and objectives. */
export function placementScore(
  board: Board,
  tile: Tile,
  row: number,
  col: number,
  rot: number,
  g?: TracksState,
  me?: number,
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
  if (g !== undefined && me !== undefined) {
    score += objectivePlacementBonus(g, me, board, trial);
    if (TRACK_KINDS.has(tile.kind) && advancesRoute(board, tile, row, col, rot)) {
      score += 800_000;
    }
  }
  return score;
}

function allowsDestination(spot: BotPlacement, g: TracksState, tile: Tile): boolean {
  if (!isDestinationSlot(spot.row, spot.col)) return true;
  const board = g.players[spot.target].board;
  const trial = cloneBoard(board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

function bestScoredSpot(
  pool: BotPlacement[],
  g: TracksState,
  tile: Tile,
  me: number,
): BotPlacement {
  let best = pool[0];
  let bestScore = -Infinity;
  for (const spot of pool) {
    const board = g.players[spot.target].board;
    const score = placementScore(board, tile, spot.row, spot.col, spot.rot, g, me);
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

function advancesRoute(board: Board, tile: Tile, row: number, col: number, rot: number): boolean {
  const before = rightmostConnectedColumn(reachableFromStart(board));
  const trial = cloneBoard(board);
  placeTile(trial, tile, row, col, rot);
  const reach = reachableFromStart(trial);
  return isConnected(trial, reach) || rightmostConnectedColumn(reach) > before;
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

  if (tile.kind === 'straight' || tile.kind === 'curve' || tile.kind === 'junction') {
    const onMain = pool.filter((s) => s.target === me && s.row === START_ROW);
    if (onMain.length > 0) pool = onMain;
  }

  const connecting = pool.filter((spot) => {
    const board = g.players[spot.target].board;
    const trial = cloneBoard(board);
    placeTile(trial, tile, spot.row, spot.col, spot.rot);
    return isConnected(trial, reachableFromStart(trial));
  });
  if (connecting.length > 0) return bestScoredSpot(connecting, g, tile, me);

  const extending = pool.filter((spot) =>
    placementExtendsRoute(
      g.players[spot.target].board,
      tile,
      spot.row,
      spot.col,
      spot.rot,
      spot.target !== me,
    ),
  );
  if (extending.length > 0) return bestScoredSpot(extending, g, tile, me);

  const board = g.players[me].board;
  const extendCols = extensionCols(board);
  const extendSpots = pool.filter(
    (s) => s.target === me && s.row === START_ROW && extendCols.includes(s.col),
  );
  if (extendSpots.length > 0) return bestScoredSpot(extendSpots, g, tile, me);

  for (const kind of PLACE_PRIORITY) {
    if (tile.kind !== kind) continue;
    const mainRow = pool.filter((s) => s.row === START_ROW);
    const tier = mainRow.length > 0 ? mainRow : pool;
    return bestScoredSpot(tier, g, tile, me);
  }
  return bestScoredSpot(pool, g, tile, me);
}

function pickDraftChoice(draft: ObjectiveId[]): ObjectiveId {
  const prefer: ObjectiveId[] = ['mayor', 'mountain-express', 'non-stop', 'longest-track'];
  for (const id of prefer) {
    if (draft.includes(id)) return id;
  }
  return draft[0];
}

export function finishDraft(client: TracksClient) {
  for (let guard = 0; guard < 32; guard++) {
    const state = client.getState();
    if (state?.ctx.phase !== 'draft') return;
    const g = state.G;
    const me = Number(state.ctx.currentPlayer);
    const options = g.players[me]?.draft ?? [];
    if (options.length === 0) return;
    client.moves.chooseObjective(pickDraftChoice(options));
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

function placementConnects(board: Board, tile: Tile, spot: BotPlacement, foreign = false): boolean {
  if (placeError(board, tile, spot.row, spot.col, spot.rot, { foreign }) !== null) return false;
  const trial = cloneBoard(board);
  placeTile(trial, tile, spot.row, spot.col, spot.rot);
  return isConnected(trial, reachableFromStart(trial));
}

/** One cabinet turn: draft pick, draw, then play or discard. */
export function playBotTurn(
  client: TracksClient,
  numPlayers: number,
  tel?: TurnTelemetry,
): 'ok' | 'stuck' | 'over' {
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

    if (g.deck.length > 0) {
      client.moves.drawTile('deck');
      if (drawnTile(client.getState()?.G ?? g, me)) {
        if (tel) tel.draws++;
        return 'ok';
      }
      return 'stuck';
    }
    if (discardPlayable) {
      client.moves.drawTile('discard');
      return drawnTile(client.getState()?.G ?? g, me) ? 'ok' : 'stuck';
    }
    if (g.deck.length === 0 && g.discard.length > 0) {
      client.moves.drawTile('deck');
      const after = client.getState()?.G ?? g;
      if (drawnTile(after, me)) return 'ok';
      if (!g.drewFromDiscard && after.drawnId) {
        const drawn = drawnTile(after, me);
        if (drawn && legalSpots(after, me, drawn).length === 0) {
          client.moves.discardTile(drawn.id);
          return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
        }
      }
      return drawnTile(after, me) ? 'ok' : 'stuck';
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
  const progressSpots = spots.filter((s) => {
    const foreign = s.target !== me;
    const board = g.players[s.target].board;
    return (
      placementConnects(board, tile, s, foreign) ||
      placementExtendsRoute(board, tile, s.row, s.col, s.rot, foreign)
    );
  });
  const playable =
    progressSpots.length > 0
      ? progressSpots
      : tile.kind === 'obstacle'
        ? spots
        : g.drewFromDiscard && spots.length > 0
          ? spots
          : spots;

  if (playable.length > 0) {
    const primary = pickPlacement(playable, g, me, tile);
    const boardForScore = (s: BotPlacement) => g.players[s.target].board;
    const scored = [...playable].sort(
      (a, b) =>
        placementScore(boardForScore(b), tile, b.row, b.col, b.rot, g, me) -
        placementScore(boardForScore(a), tile, a.row, a.col, a.rot, g, me),
    );
    const ranked = [primary, ...scored.filter((s) => s !== primary)].slice(0, 16);
    for (const spot of ranked) {
      client.moves.playTile(spot.cardId, spot.target, spot.row, spot.col, spot.rot);
      if (turnAdvanced(state, client.getState())) {
        if (tel) {
          tel.playTurns++;
          const board = g.players[spot.target].board;
          const foreign = spot.target !== me;
          if (placementConnects(board, tile, spot, foreign)) tel.connects++;
          else if (placementExtendsRoute(board, tile, spot.row, spot.col, spot.rot, foreign))
            tel.placeExtend++;
          else tel.placeStall++;
        }
        return 'ok';
      }
      if (tel) tel.illegalAttempts++;
    }
    if (!g.drewFromDiscard) {
      client.moves.discardTile(tile.id);
      if (tel) {
        tel.playTurns++;
        tel.discards++;
      }
      return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
    }
    return 'stuck';
  }
  if (!g.drewFromDiscard) {
    client.moves.discardTile(tile.id);
    if (tel) {
      tel.playTurns++;
      tel.discards++;
    }
    return turnAdvanced(state, client.getState()) ? 'ok' : 'stuck';
  }
  /* v8 ignore next */
  return 'stuck';
}
