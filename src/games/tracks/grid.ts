/**
 * TRACKS board: an 8x3 easy-side grid with a start terminal on the left and a
 * destination on the right (middle row). Placement rules follow the numbered
 * list in the 2021-05-18 rules email; route pruning at scoring keeps every card
 * lying on some start-to-terminal route by leaf-trimming dead-end branches.
 */
import { type Edge, edgesAt, isTrackTile, overlayBaseKinds, type Tile, tilePoints } from './tiles';

export const WIDTH = 8;
export const HEIGHT = 3;
/** Easy side: start and destination share the middle row. */
export const START_ROW = 1;

export type PlacedTile = { tile: Tile; rot: number };
export type Cell = { base: PlacedTile; top?: PlacedTile } | null;
export type Board = Cell[];

export function emptyBoard(): Board {
  return Array<Cell>(WIDTH * HEIGHT).fill(null);
}

export function cellAt(board: Board, row: number, col: number): Cell {
  if (row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) return null;
  return board[row * WIDTH + col];
}

/** Effective open edges of a cell: the overlay's edges when stacked. */
export function cellEdges(cell: Cell): [Edge, Edge, Edge, Edge] | null {
  if (!cell) return null;
  const placed = cell.top ?? cell.base;
  return edgesAt(placed.tile.kind, placed.rot);
}

const DIRS = [
  { dr: -1, dc: 0, mine: 0, theirs: 2 }, // north
  { dr: 0, dc: 1, mine: 1, theirs: 3 }, // east
  { dr: 1, dc: 0, mine: 2, theirs: 0 }, // south
  { dr: 0, dc: -1, mine: 3, theirs: 1 }, // west
] as const;

/** West edge of the first start-row slot; anchoring there connects the start. */
export function isStartSlot(row: number, col: number): boolean {
  return row === START_ROW && col === 0;
}

/** East edge of the last start-row slot; anchoring there reaches the destination. */
export function isDestinationSlot(row: number, col: number): boolean {
  return row === START_ROW && col === WIDTH - 1;
}

export type PlaceOptions = {
  /** Playing on someone else's board adds rule-10 restrictions. */
  foreign: boolean;
};

/**
 * Legality for placing `tile` at (row, col) with rotation `rot`.
 * Returns null when legal, else a short reason key.
 */
export function placeError(
  board: Board,
  tile: Tile,
  row: number,
  col: number,
  rot: number,
  opts: PlaceOptions,
): string | null {
  if (row < 0 || row >= HEIGHT || col < 0 || col >= WIDTH) return 'off-grid';
  if (opts.foreign && (col === 0 || col === WIDTH - 1)) return 'foreign-end-column';

  const cell = cellAt(board, row, col);
  const overlays = overlayBaseKinds(tile.kind);
  if (overlays) {
    // Overlays per rules 7-8: junction on straight/curve, whistlestop on town,
    // middle bridge/tunnel on an obstacle.
    if (!cell || cell.top || !overlays.includes(cell.base.tile.kind)) return 'bad-overlay';
    const edges = edgesAt(tile.kind, rot);
    let matched = false;
    for (const { dr, dc, mine, theirs } of DIRS) {
      const edge = edges[mine];
      if (!edge) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= HEIGHT || nc < 0 || nc >= WIDTH) {
        // Rule 2 applies to overlays too (whistlestop on a start-slot town).
        const terminal =
          (mine === 3 && isStartSlot(row, col)) || (mine === 1 && isDestinationSlot(row, col));
        if (!terminal) return 'off-grid-connection';
        continue;
      }
      const facing = cellEdges(cellAt(board, nr, nc));
      const facingEdge = facing ? facing[theirs] : null;
      if (edge && facingEdge && edge !== facingEdge) return 'material-mismatch';
      if (edge && facingEdge === edge) matched = true;
    }
    // Middles are track cards: they connect only to bridge/tunnel cards.
    if ((tile.kind === 'bridge-mid' || tile.kind === 'tunnel-mid') && !matched) {
      return 'not-connected';
    }
    return null;
  }
  if (cell) return 'occupied';

  if (tile.kind === 'obstacle') {
    // Rule 10b (foreign boards): no river in front of a middle tunnel, no
    // mountain in front of a middle bridge. "In front of" is direction of
    // travel: east. So the offending middle sits one slot west of the obstacle.
    if (opts.foreign) {
      const west = cellAt(board, row, col - 1);
      const mid = west?.top?.tile.kind;
      if (mid === 'tunnel-mid' && tile.variant === 'river') return 'river-before-tunnel';
      if (mid === 'bridge-mid' && tile.variant === 'mountain') return 'mountain-before-bridge';
    }
    return null;
  }

  if (isTrackTile(tile.kind)) {
    const edges = edgesAt(tile.kind, rot);
    let anchored = false;
    for (const { dr, dc, mine, theirs } of DIRS) {
      const edge = edges[mine];
      const nr = row + dr;
      const nc = col + dc;
      const offBoard = nr < 0 || nr >= HEIGHT || nc < 0 || nc >= WIDTH;
      if (offBoard) {
        // Rule 2: off-grid connections only at the start and destination slots.
        if (!edge) continue;
        const terminal =
          (mine === 3 && isStartSlot(row, col)) || (mine === 1 && isDestinationSlot(row, col));
        if (!terminal) return 'off-grid-connection';
        anchored = true;
        continue;
      }
      const facing = cellEdges(cellAt(board, nr, nc));
      const facingEdge = facing ? facing[theirs] : null;
      // Rule 5: bridge meets bridge, tunnel meets tunnel, rail meets rail.
      if (edge && facingEdge && edge !== facingEdge) return 'material-mismatch';
      if (edge && facingEdge === edge) anchored = true;
    }
    // Rule 1: track cards must connect to existing rail or the start
    // (the destination terminal anchors too - it is the other railhead).
    if (!anchored) return 'not-connected';
  }
  return null;
}

/** Place without validation (moves validate first). */
export function placeTile(board: Board, tile: Tile, row: number, col: number, rot: number): void {
  const i = row * WIDTH + col;
  const cell = board[i];
  if (cell) cell.top = { tile, rot };
  else board[i] = { base: { tile, rot } };
}

type Node = { row: number; col: number };
const key = (row: number, col: number) => row * WIDTH + col;

/** Adjacency over matched open edges. Callers only pass placed cells. */
function neighbours(board: Board, row: number, col: number): Node[] {
  const edges = cellEdges(cellAt(board, row, col))!;
  const out: Node[] = [];
  for (const { dr, dc, mine, theirs } of DIRS) {
    const edge = edges[mine];
    if (!edge) continue;
    const nr = row + dr;
    const nc = col + dc;
    const facing = cellEdges(cellAt(board, nr, nc));
    if (facing && facing[theirs] === edge) out.push({ row: nr, col: nc });
  }
  return out;
}

/** Cells reachable from the start terminal via matched connections. */
export function reachableFromStart(board: Board): Set<number> {
  const seen = new Set<number>();
  const start = cellEdges(cellAt(board, START_ROW, 0));
  // Any open west edge anchors to the start railhead (generous reading of rule 1).
  if (!start || start[3] == null) return seen;
  const queue: Node[] = [{ row: START_ROW, col: 0 }];
  seen.add(key(START_ROW, 0));
  while (queue.length) {
    const { row, col } = queue.shift()!;
    for (const n of neighbours(board, row, col)) {
      const k = key(n.row, n.col);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return seen;
}

/** Start connected through to the destination terminal. */
export function isConnected(board: Board, reachable?: Set<number>): boolean {
  const seen = reachable ?? reachableFromStart(board);
  if (!seen.has(key(START_ROW, WIDTH - 1))) return false;
  return cellEdges(cellAt(board, START_ROW, WIDTH - 1))?.[1] != null;
}

/** Rightmost reachable column, 1-indexed for scoring; 0 when nothing connects. */
export function rightmostConnectedColumn(reachable: Set<number>): number {
  let best = 0;
  for (const k of reachable) {
    best = Math.max(best, (k % WIDTH) + 1);
  }
  return best;
}

/**
 * Cards that score: those on some route from the start to the destination (or,
 * when unconnected, to the rightmost connected column). Dead-end branches are
 * leaf-trimmed; junction loops survive.
 */
export function keptCells(board: Board, reachable: Set<number>): Set<number> {
  const terminals = new Set<number>();
  const startKey = key(START_ROW, 0);
  if (reachable.has(startKey)) terminals.add(startKey);
  if (isConnected(board, reachable)) {
    terminals.add(key(START_ROW, WIDTH - 1));
  } else {
    const endCol = rightmostConnectedColumn(reachable);
    for (const k of reachable) {
      if (k % WIDTH === endCol - 1) terminals.add(k);
    }
  }
  const kept = new Set(reachable);
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of kept) {
      if (terminals.has(k)) continue;
      const row = Math.floor(k / WIDTH);
      const col = k % WIDTH;
      const links = neighbours(board, row, col).filter((n) => kept.has(key(n.row, n.col))).length;
      if (links <= 1) {
        kept.delete(k);
        changed = true;
      }
    }
  }
  return kept;
}

/** Points for one kept cell, base card plus any overlay. */
export function cellPoints(cell: Cell): number {
  if (!cell) return 0;
  let pts = tilePoints(cell.base.tile);
  if (cell.top) pts += tilePoints(cell.top.tile, cell.base.tile.kind);
  return pts;
}

/** Counts used by objective scoring, over kept cells only. */
export function boardCounts(board: Board, kept: Set<number>) {
  let whistlestops = 0;
  let towns = 0;
  let tunnelCards = 0;
  let bridgeCards = 0;
  let trackCards = 0;
  for (const k of kept) {
    const cell = board[k];
    if (!cell) continue;
    const placed = cell.top ? [cell.base, cell.top] : [cell.base];
    for (const p of placed) {
      if (isTrackTile(p.tile.kind)) trackCards++;
      if (p.tile.kind === 'whistlestop') whistlestops++;
      if (p.tile.kind === 'town') towns++;
      if (p.tile.kind === 'tunnel-arch' || p.tile.kind === 'tunnel-mid') tunnelCards++;
      if (p.tile.kind === 'bridge-start' || p.tile.kind === 'bridge-mid') bridgeCards++;
    }
  }
  return { whistlestops, towns, tunnelCards, bridgeCards, trackCards };
}

/**
 * Longest run of a single material measured in cards, walking matched edges of
 * that material through kept cells (a chain is arch/start -> middles).
 */
export function longestMaterialRun(
  board: Board,
  kept: Set<number>,
  mat: 'bridge' | 'tunnel',
): number {
  let best = 0;
  for (const k of kept) {
    const row = Math.floor(k / WIDTH);
    const col = k % WIDTH;
    const edges = cellEdges(cellAt(board, row, col));
    if (!edges?.includes(mat)) continue;
    const seen = new Set<number>([k]);
    const queue: Node[] = [{ row, col }];
    while (queue.length) {
      const cur = queue.shift()!;
      // Queued cells were enqueued via a matched material edge, so placed.
      const curEdges = cellEdges(cellAt(board, cur.row, cur.col))!;
      for (const { dr, dc, mine, theirs } of DIRS) {
        if (curEdges[mine] !== mat) continue;
        const nk = key(cur.row + dr, cur.col + dc);
        if (seen.has(nk) || !kept.has(nk)) continue;
        const facing = cellEdges(cellAt(board, cur.row + dr, cur.col + dc));
        if (facing?.[theirs] !== mat) continue;
        seen.add(nk);
        queue.push({ row: cur.row + dr, col: cur.col + dc });
      }
    }
    best = Math.max(best, seen.size);
  }
  return best;
}

/** Filled grid slots (overlays count once), for Land Baron. */
export function filledSlots(board: Board): number {
  return board.filter(Boolean).length;
}
