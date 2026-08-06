/**
 * Backgammon (no doubling cube)
 *
 * Points 1-24; each player has a bar and a bear-off tray.
 * Standard starting setup (15 checkers each):
 *   Player 0 (moves high→low, 24→1): 2 on 24, 5 on 13, 3 on 8, 5 on 6
 *   Player 1 (moves low→high, 1→24): 2 on 1, 5 on 12, 3 on 17, 5 on 19
 *
 * Player 0 home board: points 1-6. Player 1 home board: points 19-24.
 *
 * Turn: roll 2d6 (doubles = four moves of that value); then play remaining
 * dice sequentially via play(from, dieIndex). from=0 (BAR) means the bar.
 * Hit: land on a blot (exactly one opponent) → opponent checker to their bar.
 * Enter from bar: must use a die to an open point in the entry board —
 *   P0 enters on 25-die (19-24); P1 enters on die (1-6).
 * Bear off only when all own checkers are in the home board (none on bar).
 * Open point: empty, own checkers, or exactly one opponent.
 * Win: bear off all 15 checkers.
 */

import type { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';

/** Bar origin for play(from, dieIndex). */
export const BAR = 0;

export const CHECKERS = 15;

export type BackgammonState = {
  /** Index 0 unused; points[1..24] signed: >0 = P0 count, <0 = P1 count. */
  points: number[];
  bar: [number, number];
  borne: [number, number];
  /** Remaining die faces to play this turn (empty before roll). */
  dice: number[];
  hasRolled: boolean;
};

export type LegalPlay = {
  from: number;
  dieIndex: number;
  /** Destination point 1-24, or 0 when bearing off. */
  to: number;
};

export function pointOwner(value: number): '0' | '1' | null {
  if (value > 0) return '0';
  if (value < 0) return '1';
  return null;
}

export function checkerCount(value: number): number {
  return Math.abs(value);
}

export function createInitialState(): BackgammonState {
  const points = Array(25).fill(0);
  points[24] = 2;
  points[13] = 5;
  points[8] = 3;
  points[6] = 5;
  points[1] = -2;
  points[12] = -5;
  points[17] = -3;
  points[19] = -5;
  return {
    points,
    bar: [0, 0],
    borne: [0, 0],
    dice: [],
    hasRolled: false,
  };
}

function pid(player: string): 0 | 1 {
  return player === '0' ? 0 : 1;
}

function signFor(player: string): 1 | -1 {
  return player === '0' ? 1 : -1;
}

/** Distance from a point to bear-off for this player. */
function bearDistance(player: string, point: number): number {
  return player === '0' ? point : 25 - point;
}

function homePoints(player: string): number[] {
  return player === '0' ? [1, 2, 3, 4, 5, 6] : [19, 20, 21, 22, 23, 24];
}

function entryPoint(player: string, die: number): number {
  return player === '0' ? 25 - die : die;
}

export function isOpenPoint(points: number[], player: string, point: number): boolean {
  if (point < 1 || point > 24) return false;
  const v = points[point];
  const owner = pointOwner(v);
  if (owner === null || owner === player) return true;
  return checkerCount(v) === 1;
}

export function allInHome(G: BackgammonState, player: string): boolean {
  const i = pid(player);
  if (G.bar[i] > 0) return false;
  const home = new Set(homePoints(player));
  for (let p = 1; p <= 24; p++) {
    if (pointOwner(G.points[p]) !== player) continue;
    if (!home.has(p)) return false;
  }
  return true;
}

function highestHomeOccupied(G: BackgammonState, player: string): number | null {
  // Furthest from bearing off within the home board (largest bearDistance).
  let best: number | null = null;
  let bestDist = -1;
  for (const p of homePoints(player)) {
    if (pointOwner(G.points[p]) !== player) continue;
    const d = bearDistance(player, p);
    if (d > bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function destination(player: string, from: number, die: number): number {
  if (from === BAR) return entryPoint(player, die);
  if (player === '0') {
    const to = from - die;
    return to >= 1 ? to : 0; // 0 = bear off candidate
  }
  const to = from + die;
  return to <= 24 ? to : 0;
}

function canBearOff(G: BackgammonState, player: string, from: number, die: number): boolean {
  if (!allInHome(G, player)) return false;
  const dist = bearDistance(player, from);
  if (die === dist) return true;
  // Overshoot: only from the furthest-from-off occupied home point
  return die > dist && highestHomeOccupied(G, player) === from;
}

export function legalPlays(G: BackgammonState, player: string): LegalPlay[] {
  if (!G.hasRolled || G.dice.length === 0) return [];
  const i = pid(player);
  const plays: LegalPlay[] = [];
  const onBar = G.bar[i] > 0;

  for (let dieIndex = 0; dieIndex < G.dice.length; dieIndex++) {
    const die = G.dice[dieIndex];

    if (onBar) {
      const to = destination(player, BAR, die);
      if (isOpenPoint(G.points, player, to)) {
        plays.push({ from: BAR, dieIndex, to });
      }
      continue;
    }

    for (let from = 1; from <= 24; from++) {
      if (pointOwner(G.points[from]) !== player) continue;
      const to = destination(player, from, die);
      if (to === 0) {
        if (canBearOff(G, player, from, die)) {
          plays.push({ from, dieIndex, to: 0 });
        }
        continue;
      }
      if (isOpenPoint(G.points, player, to)) {
        plays.push({ from, dieIndex, to });
      }
    }
  }

  return plays;
}

function applyPlay(G: BackgammonState, player: string, play: LegalPlay): void {
  const i = pid(player);
  const s = signFor(player);
  const opp = player === '0' ? 1 : 0;

  if (play.from === BAR) {
    G.bar[i] -= 1;
  } else {
    G.points[play.from] -= s;
  }

  if (play.to === 0) {
    G.borne[i] += 1;
  } else {
    const landing = G.points[play.to];
    if (pointOwner(landing) !== null && pointOwner(landing) !== player) {
      // Hit blot
      G.points[play.to] = 0;
      G.bar[opp] += 1;
    }
    G.points[play.to] += s;
  }

  G.dice.splice(play.dieIndex, 1);
}

function clearTurnDice(G: BackgammonState): void {
  G.dice = [];
  G.hasRolled = false;
}

export const Backgammon: Game<BackgammonState> = {
  name: 'backgammon',
  setup: () => createInitialState(),
  turn: {
    minMoves: 1,
    maxMoves: 6,
  },
  moves: {
    roll: ({ G, random }) => {
      if (G.hasRolled) return INVALID_MOVE;
      const a = random.D6();
      const b = random.D6();
      G.dice = a === b ? [a, a, a, a] : [a, b];
      G.hasRolled = true;
    },
    play: ({ G, ctx, events }, from: number, dieIndex: number) => {
      if (!G.hasRolled) return INVALID_MOVE;
      if (!Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex >= G.dice.length) {
        return INVALID_MOVE;
      }
      if (!Number.isInteger(from) || from < 0 || from > 24) return INVALID_MOVE;
      const plays = legalPlays(G, ctx.currentPlayer);
      const match = plays.find((p) => p.from === from && p.dieIndex === dieIndex);
      if (!match) return INVALID_MOVE;
      applyPlay(G, ctx.currentPlayer, match);
      if (G.borne[pid(ctx.currentPlayer)] >= CHECKERS) {
        clearTurnDice(G);
        events.endTurn();
        return;
      }
      if (G.dice.length === 0) {
        clearTurnDice(G);
        events.endTurn();
      }
    },
    pass: ({ G, ctx, events }) => {
      if (!G.hasRolled) return INVALID_MOVE;
      if (legalPlays(G, ctx.currentPlayer).length > 0) return INVALID_MOVE;
      clearTurnDice(G);
      events.endTurn();
    },
  },
  endIf: ({ G }) => {
    if (G.borne[0] >= CHECKERS) return { winner: '0' };
    if (G.borne[1] >= CHECKERS) return { winner: '1' };
  },
  ai: {
    enumerate: (G, ctx: Ctx) => {
      if (!G.hasRolled) return [{ move: 'roll' }];
      const plays = legalPlays(G, ctx.currentPlayer);
      if (plays.length === 0) return [{ move: 'pass' }];
      return plays.map((p) => ({
        move: 'play',
        args: [p.from, p.dieIndex],
      }));
    },
  },
};
