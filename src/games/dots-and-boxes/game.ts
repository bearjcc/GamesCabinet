/**
 * Dots and Boxes
 *
 * Default grid: 3x3 boxes (4x4 dots) — small for phone play.
 * Horizontal lines: row 0..3, col 0..2  (keys h-r-c)
 * Vertical lines:   row 0..2, col 0..3  (keys v-r-c)
 * Total lines: 24. Boxes: 9.
 *
 * Move `claimLine(lineId)`: claim an open line. Completing one or more boxes
 * scores those boxes for the current player and grants an extra turn.
 * Otherwise the turn ends.
 *
 * End: when all boxes are owned, higher score wins (draw if equal).
 * Early win: if a player's lead exceeds the number of unclaimed boxes,
 * the trailer cannot catch up — game ends immediately.
 */

import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

export const BOX_ROWS = 3;
export const BOX_COLS = 3;
export const DOT_ROWS = BOX_ROWS + 1;
export const DOT_COLS = BOX_COLS + 1;

export type LineOrient = 'h' | 'v';

export type DotsAndBoxesState = {
  lines: Record<string, string | null>;
  boxes: (string | null)[];
  scores: [number, number];
};

export function lineKey(orient: LineOrient, row: number, col: number): string {
  return `${orient}-${row}-${col}`;
}

export function allLineKeys(): string[] {
  const keys: string[] = [];
  for (let r = 0; r < DOT_ROWS; r++) {
    for (let c = 0; c < BOX_COLS; c++) {
      keys.push(lineKey('h', r, c));
    }
  }
  for (let r = 0; r < BOX_ROWS; r++) {
    for (let c = 0; c < DOT_COLS; c++) {
      keys.push(lineKey('v', r, c));
    }
  }
  return keys;
}

export const TOTAL_LINES = allLineKeys().length;
export const TOTAL_BOXES = BOX_ROWS * BOX_COLS;

export function parseLineKey(key: string): { orient: LineOrient; row: number; col: number } | null {
  const match = /^([hv])-(\d+)-(\d+)$/.exec(key);
  if (!match) return null;
  const orient = match[1] as LineOrient;
  const row = Number(match[2]);
  const col = Number(match[3]);
  if (orient === 'h') {
    if (row < 0 || row >= DOT_ROWS || col < 0 || col >= BOX_COLS) return null;
  } else if (row < 0 || row >= BOX_ROWS || col < 0 || col >= DOT_COLS) {
    return null;
  }
  return { orient, row, col };
}

function boxIndex(br: number, bc: number): number {
  return br * BOX_COLS + bc;
}

export function linesForBox(br: number, bc: number): string[] {
  return [
    lineKey('h', br, bc),
    lineKey('h', br + 1, bc),
    lineKey('v', br, bc),
    lineKey('v', br, bc + 1),
  ];
}

/** Box indices that include the given line. */
export function boxesTouchingLine(key: string): number[] {
  const parsed = parseLineKey(key);
  if (!parsed) return [];
  const { orient, row, col } = parsed;
  const boxes: number[] = [];
  if (orient === 'h') {
    if (row > 0) boxes.push(boxIndex(row - 1, col));
    if (row < BOX_ROWS) boxes.push(boxIndex(row, col));
  } else {
    if (col > 0) boxes.push(boxIndex(row, col - 1));
    if (col < BOX_COLS) boxes.push(boxIndex(row, col));
  }
  return boxes;
}

function isBoxComplete(G: DotsAndBoxesState, boxIdx: number): boolean {
  const br = Math.floor(boxIdx / BOX_COLS);
  const bc = boxIdx % BOX_COLS;
  return linesForBox(br, bc).every((k) => G.lines[k] !== null);
}

function unclaimedBoxes(G: DotsAndBoxesState): number {
  return G.boxes.filter((b) => b === null).length;
}

/** Leader wins early when the trailer cannot catch up with remaining boxes. */
export function earlyWinner(G: DotsAndBoxesState): string | null {
  const rem = unclaimedBoxes(G);
  if (rem === 0) return null;
  if (G.scores[0] > G.scores[1] + rem) return '0';
  if (G.scores[1] > G.scores[0] + rem) return '1';
  return null;
}

function resultFromScores(scores: [number, number]): { winner: string } | { draw: true } {
  if (scores[0] > scores[1]) return { winner: '0' };
  if (scores[1] > scores[0]) return { winner: '1' };
  return { draw: true };
}

export function createInitialState(): DotsAndBoxesState {
  const lines: Record<string, string | null> = {};
  for (const key of allLineKeys()) lines[key] = null;
  return {
    lines,
    boxes: Array(TOTAL_BOXES).fill(null),
    scores: [0, 0],
  };
}

export const DotsAndBoxes: Game<DotsAndBoxesState> = {
  name: 'dots-and-boxes',
  setup: () => createInitialState(),
  turn: {
    minMoves: 1,
    maxMoves: TOTAL_LINES,
  },
  moves: {
    claimLine: ({ G, ctx, events }, lineId: string) => {
      if (typeof lineId !== 'string' || parseLineKey(lineId) === null) return INVALID_MOVE;
      if (!(lineId in G.lines) || G.lines[lineId] !== null) return INVALID_MOVE;

      const player = ctx.currentPlayer;
      G.lines[lineId] = player;

      let completed = 0;
      for (const boxIdx of boxesTouchingLine(lineId)) {
        if (G.boxes[boxIdx] !== null) continue;
        if (!isBoxComplete(G, boxIdx)) continue;
        G.boxes[boxIdx] = player;
        const seat = Number(player) as 0 | 1;
        G.scores[seat] += 1;
        completed += 1;
      }

      if (completed === 0) {
        events.endTurn();
      }
    },
  },
  endIf: ({ G }) => {
    if (unclaimedBoxes(G) === 0) {
      return resultFromScores(G.scores);
    }
    const early = earlyWinner(G);
    if (early !== null) return { winner: early };
  },
  ai: {
    enumerate: (G) => {
      const moves: { move: string; args: string[] }[] = [];
      for (const key of allLineKeys()) {
        if (G.lines[key] === null) moves.push({ move: 'claimLine', args: [key] });
      }
      return moves;
    },
  },
};
