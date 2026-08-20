import { describe, expect, it } from 'vitest';
import {
  boardCounts,
  cellAt,
  cellEdges,
  cellPoints,
  emptyBoard,
  filledSlots,
  HEIGHT,
  isConnected,
  keptCells,
  longestMaterialRun,
  placeError,
  placeTile,
  reachableFromStart,
  rightmostConnectedColumn,
  START_ROW,
  WIDTH,
} from './grid';
import type { Tile } from './tiles';

let seq = 0;
function tile(kind: Tile['kind'], variant?: Tile['variant']): Tile {
  seq += 1;
  return { id: `t${seq}`, kind, variant };
}

const own = { foreign: false };
const foreign = { foreign: true };

/** A straight horizontal run from the start slot across `cols` columns. */
function runBoard(cols: number) {
  const board = emptyBoard();
  for (let c = 0; c < cols; c++) placeTile(board, tile('straight'), START_ROW, c, 1);
  return board;
}

describe('placement legality', () => {
  it('rejects off-grid slots and foreign end columns', () => {
    const board = emptyBoard();
    expect(placeError(board, tile('town'), -1, 0, 0, own)).toBe('off-grid');
    expect(placeError(board, tile('town'), HEIGHT, 0, 0, own)).toBe('off-grid');
    expect(placeError(board, tile('town'), 0, WIDTH, 0, own)).toBe('off-grid');
    expect(placeError(board, tile('town'), 0, 0, 0, foreign)).toBe('foreign-end-column');
    expect(placeError(board, tile('town'), 0, WIDTH - 1, 0, foreign)).toBe('foreign-end-column');
  });

  it('rejects stacking on non-overlay tiles', () => {
    const board = runBoard(1);
    expect(placeError(board, tile('curve'), START_ROW, 0, 0, own)).toBe('occupied');
  });

  it('enforces overlay targets for junctions, whistlestops, and middles', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), START_ROW, 3, 0);
    expect(placeError(board, tile('whistlestop'), START_ROW, 3, 0, own)).toBeNull();
    expect(placeError(board, tile('junction'), START_ROW, 3, 0, own)).toBe('bad-overlay');
    placeTile(board, tile('obstacle', 'mountain'), 2, 4, 0);
    expect(placeError(board, tile('tunnel-mid'), 2, 4, 0, own)).toBe('not-connected');
    expect(placeError(board, tile('junction'), 2, 4, 0, own)).toBe('bad-overlay');
    expect(placeError(board, tile('whistlestop'), 2, 4, 0, own)).toBe('bad-overlay');
    expect(placeError(board, tile('tunnel-mid'), 0, 0, 0, own)).toBe('bad-overlay');
  });

  it('applies the off-grid rule to whistlestop overlays on border towns', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), 0, 3, 0);
    expect(placeError(board, tile('whistlestop'), 0, 3, 0, own)).toBe('off-grid-connection');
  });

  it('allows a whistlestop on a start-slot town (terminal edge)', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), START_ROW, 0, 0);
    expect(placeError(board, tile('whistlestop'), START_ROW, 0, 0, own)).toBeNull();
  });

  it('allows a whistlestop on a destination-slot town', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), START_ROW, WIDTH - 1, 0);
    expect(placeError(board, tile('whistlestop'), START_ROW, WIDTH - 1, 0, own)).toBeNull();
  });

  it('rejects overlays whose new edges clash with a neighbour (rule 5)', () => {
    const board = emptyBoard();
    placeTile(board, tile('straight'), START_ROW, 0, 1);
    // Bridge-start rot 1 opens a bridge edge south, facing the junction's rail.
    placeTile(board, tile('bridge-start'), 0, 0, 1);
    expect(placeError(board, tile('junction'), START_ROW, 0, 0, own)).toBe('material-mismatch');
  });

  it('rejects a second overlay on a stacked cell', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), 0, 3, 0);
    placeTile(board, tile('whistlestop'), 0, 3, 0);
    expect(placeError(board, tile('junction'), 0, 3, 0, own)).toBe('bad-overlay');
  });

  it('lets towns land anywhere empty (rule 1 applies to track cards only)', () => {
    const board = emptyBoard();
    expect(placeError(board, tile('town'), 0, 4, 0, own)).toBeNull();
    expect(placeError(board, tile('town'), 0, 0, 0, foreign)).toBe('foreign-end-column');
  });

  it('requires track cards to connect to the rail or a terminal (rule 1)', () => {
    const board = emptyBoard();
    expect(placeError(board, tile('straight'), 0, 4, 1, own)).toBe('not-connected');
    expect(placeError(board, tile('straight'), START_ROW, 0, 1, own)).toBeNull();
    expect(placeError(board, tile('straight'), START_ROW, WIDTH - 1, 1, own)).toBeNull();
  });

  it('forbids off-grid connections away from the terminals (rule 2)', () => {
    const board = emptyBoard();
    expect(placeError(board, tile('straight'), 0, 0, 1, own)).toBe('off-grid-connection');
    const reached = runBoard(3);
    placeTile(reached, tile('curve'), START_ROW, 3, 3); // opens N,W - extends the run
    expect(placeError(reached, tile('straight'), 0, 3, 0, own)).toBe('off-grid-connection');
  });

  it('matches materials at shared edges (rule 5)', () => {
    const board = runBoard(2);
    placeTile(board, tile('bridge-start'), START_ROW, 2, 0); // bridge edge east
    expect(placeError(board, tile('straight'), START_ROW, 3, 1, own)).toBe('material-mismatch');
    placeTile(board, tile('obstacle', 'river'), START_ROW, 3, 0);
    expect(placeError(board, tile('bridge-mid'), START_ROW, 3, 0, own)).toBeNull();
  });

  it('requires middles to join an existing bridge or tunnel', () => {
    const board = emptyBoard();
    placeTile(board, tile('obstacle', 'river'), 0, 3, 0);
    expect(placeError(board, tile('bridge-mid'), 0, 3, 0, own)).toBe('not-connected');
    placeTile(board, tile('bridge-start'), 0, 2, 0);
    expect(placeError(board, tile('bridge-mid'), 0, 3, 0, own)).toBeNull();
  });

  it('allows track edges to face empty slots and blank edges', () => {
    const board = runBoard(1);
    expect(placeError(board, tile('curve'), START_ROW, 1, 2, own)).toBeNull();
    placeTile(board, tile('town'), 0, 1, 0);
    expect(placeError(board, tile('curve'), START_ROW, 1, 3, own)).toBeNull();
    expect(cellAt(board, START_ROW, 1)).toBeNull();
  });

  it('blocks river before a middle tunnel and mountain before a middle bridge', () => {
    const board = emptyBoard();
    placeTile(board, tile('obstacle', 'mountain'), START_ROW, 4, 0);
    placeTile(board, tile('tunnel-mid'), START_ROW, 4, 0);
    expect(placeError(board, tile('obstacle', 'river'), START_ROW, 5, 0, foreign)).toBe(
      'river-before-tunnel',
    );
    expect(placeError(board, tile('obstacle', 'mountain'), START_ROW, 5, 0, foreign)).toBeNull();
    expect(placeError(board, tile('obstacle', 'river'), START_ROW, 5, 0, own)).toBeNull();
    const bridge = emptyBoard();
    placeTile(bridge, tile('obstacle', 'river'), START_ROW, 4, 0);
    placeTile(bridge, tile('bridge-mid'), START_ROW, 4, 0);
    expect(placeError(bridge, tile('obstacle', 'mountain'), START_ROW, 5, 0, foreign)).toBe(
      'mountain-before-bridge',
    );
  });
});

describe('connectivity', () => {
  it('walks matched edges from the start terminal', () => {
    const board = runBoard(3);
    const seen = reachableFromStart(board);
    expect(seen.size).toBe(3);
    expect(isConnected(board, seen)).toBe(false);
    expect(rightmostConnectedColumn(seen)).toBe(3);
  });

  it('detects a full start-to-destination connection', () => {
    const board = runBoard(WIDTH);
    const seen = reachableFromStart(board);
    expect(isConnected(board, seen)).toBe(true);
  });

  it('does not count a destination-slot card without an east edge as connected', () => {
    const board = runBoard(WIDTH);
    placeTile(board, tile('straight'), START_ROW, WIDTH - 1, 0);
    const seen = reachableFromStart(board);
    expect(isConnected(board, seen)).toBe(false);
  });

  it('stops at unmatched materials and empty boards', () => {
    expect(reachableFromStart(emptyBoard()).size).toBe(0);
    const board = runBoard(2);
    placeTile(board, tile('bridge-start'), START_ROW, 2, 0);
    placeTile(board, tile('obstacle', 'river'), START_ROW, 3, 0);
    placeTile(board, tile('bridge-mid'), START_ROW, 3, 0);
    const seen = reachableFromStart(board);
    expect(seen.size).toBe(4);
    expect(rightmostConnectedColumn(seen)).toBe(4);
  });

  it('routes through whistlestops and junctions', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), START_ROW, 0, 0);
    placeTile(board, tile('whistlestop'), START_ROW, 0, 0);
    placeTile(board, tile('straight'), START_ROW, 1, 1);
    const seen = reachableFromStart(board);
    expect(seen.size).toBe(2);
    expect(cellEdges(cellAt(board, START_ROW, 0))).toEqual(['rail', 'rail', 'rail', 'rail']);
  });
});

describe('keptCells pruning', () => {
  it('keeps junction loops but trims dead-end branches', () => {
    // Main route across row 1; a branch north at col 2 must be trimmed.
    const branch = emptyBoard();
    for (let c = 0; c < 5; c++) placeTile(branch, tile('straight'), START_ROW, c, 1);
    placeTile(branch, tile('junction'), START_ROW, 2, 0); // opens N,E,W
    placeTile(branch, tile('curve'), 0, 2, 1); // opens E,S - dead end
    const seen = reachableFromStart(branch);
    const kept = keptCells(branch, seen);
    expect(kept.has(0 * WIDTH + 2)).toBe(false);
    expect(kept.has(START_ROW * WIDTH + 4)).toBe(true);
    expect(kept.size).toBe(5);
  });

  it('keeps alternative junction routes when connected', () => {
    const board = emptyBoard();
    // Row 1: straight run 0..7 with junctions at 2 and 4 opening north,
    // plus a parallel row-0 detour 2..4.
    for (let c = 0; c < WIDTH; c++) placeTile(board, tile('straight'), START_ROW, c, 1);
    placeTile(board, tile('junction'), START_ROW, 2, 0); // opens N,E,W
    placeTile(board, tile('junction'), START_ROW, 4, 0);
    placeTile(board, tile('curve'), 0, 2, 1); // opens E,S
    placeTile(board, tile('straight'), 0, 3, 1); // opens E,W
    placeTile(board, tile('curve'), 0, 4, 2); // opens S,W
    const seen = reachableFromStart(board);
    expect(isConnected(board, seen)).toBe(true);
    const kept = keptCells(board, seen);
    expect(kept.size).toBe(WIDTH + 3);
  });

  it('uses the rightmost column as end point when unconnected', () => {
    const board = runBoard(3);
    placeTile(board, tile('junction'), START_ROW, 1, 0); // opens N,E,W - branch north
    placeTile(board, tile('curve'), 0, 1, 1); // opens E,S - dead end branch
    const seen = reachableFromStart(board);
    expect(isConnected(board, seen)).toBe(false);
    const kept = keptCells(board, seen);
    expect(kept.has(1)).toBe(false); // (0,1) branch trimmed
    expect(kept.size).toBe(3);
  });
});

describe('scoring helpers', () => {
  it('scores kept cells with overlay values and junction-on-curve', () => {
    const town = cellAt(buildTown(), 0, 0);
    expect(cellPoints(town)).toBe(2);
    const board = emptyBoard();
    placeTile(board, tile('curve'), 0, 0, 0);
    placeTile(board, tile('junction'), 0, 0, 0);
    expect(cellPoints(cellAt(board, 0, 0))).toBe(2); // curve 1 + junction-on-curve 1
    const straightJ = emptyBoard();
    placeTile(straightJ, tile('straight'), 0, 0, 0);
    placeTile(straightJ, tile('junction'), 0, 0, 0);
    expect(cellPoints(cellAt(straightJ, 0, 0))).toBe(2); // straight 0 + junction 2
    expect(cellPoints(null)).toBe(0);
  });

  it('counts whistlestops, towns, tunnels, bridges, and track cards over kept cells', () => {
    const board = emptyBoard();
    placeTile(board, tile('town'), START_ROW, 0, 0);
    placeTile(board, tile('whistlestop'), START_ROW, 0, 0);
    placeTile(board, tile('bridge-start'), START_ROW, 1, 0);
    placeTile(board, tile('obstacle', 'river'), START_ROW, 2, 0);
    placeTile(board, tile('bridge-mid'), START_ROW, 2, 0);
    const kept = new Set([START_ROW * WIDTH, START_ROW * WIDTH + 1, START_ROW * WIDTH + 2]);
    const counts = boardCounts(board, kept);
    expect(counts).toEqual({
      whistlestops: 1,
      towns: 1,
      tunnelCards: 0,
      bridgeCards: 2,
      trackCards: 3,
    });
  });

  it('measures the longest bridge or tunnel chain in cards', () => {
    const board = emptyBoard();
    placeTile(board, tile('bridge-start'), START_ROW, 0, 0);
    placeTile(board, tile('obstacle', 'river'), START_ROW, 1, 0);
    placeTile(board, tile('bridge-mid'), START_ROW, 1, 0);
    placeTile(board, tile('bridge-start'), START_ROW, 2, 2); // reversed start: rail E, bridge W
    const kept = new Set([START_ROW * WIDTH, START_ROW * WIDTH + 1, START_ROW * WIDTH + 2]);
    expect(longestMaterialRun(board, kept, 'bridge')).toBe(3);
    expect(longestMaterialRun(board, kept, 'tunnel')).toBe(0);
  });

  it('counts filled slots for Land Baron', () => {
    const board = emptyBoard();
    expect(filledSlots(board)).toBe(0);
    placeTile(board, tile('town'), 0, 0, 0);
    placeTile(board, tile('whistlestop'), 0, 0, 0);
    expect(filledSlots(board)).toBe(1);
  });

  it('tolerates empty slots inside a kept set (defensive)', () => {
    const board = emptyBoard();
    placeTile(board, tile('straight'), START_ROW, 0, 1);
    const counts = boardCounts(board, new Set([START_ROW * WIDTH, 5]));
    expect(counts.trackCards).toBe(1);
  });

  it('stops a material run where the facing card lacks the material', () => {
    const board = emptyBoard();
    placeTile(board, tile('bridge-start'), START_ROW, 0, 0); // bridge edge east
    // rot 1 opens the bridge south instead: the east edge pair mismatches.
    placeTile(board, tile('bridge-start'), START_ROW, 1, 1);
    const kept = new Set([START_ROW * WIDTH, START_ROW * WIDTH + 1]);
    expect(longestMaterialRun(board, kept, 'bridge')).toBe(1);
  });
});

function buildTown() {
  const board = emptyBoard();
  placeTile(board, tile('town'), 0, 0, 0);
  placeTile(board, tile('whistlestop'), 0, 0, 0);
  return board;
}
