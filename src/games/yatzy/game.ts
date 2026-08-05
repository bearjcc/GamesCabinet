import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  emptyScorecard,
  grandTotal,
  type Scorecard,
  type ScoringCategory,
  scorecardComplete,
  scoreFns,
} from './scoring';

const DICE = 5;
const MAX_ROLLS = 3;

export type YatzyState = {
  dice: number[];
  held: boolean[];
  rolls: number;
  scores: Scorecard[];
};

export const Yatzy: Game<YatzyState> = {
  name: 'yatzy',
  setup: ({ ctx }) => ({
    dice: Array(DICE).fill(1),
    held: Array(DICE).fill(false),
    rolls: 0,
    scores: Array.from({ length: ctx.numPlayers }, () => emptyScorecard()),
  }),
  moves: {
    rollDice: ({ G, random }) => {
      if (G.rolls >= MAX_ROLLS) return INVALID_MOVE;
      for (let i = 0; i < DICE; i++) {
        if (!G.held[i]) G.dice[i] = random.D6();
      }
      G.rolls++;
    },
    toggleDie: ({ G }, dieIndex: number) => {
      if (dieIndex < 0 || dieIndex >= DICE) return INVALID_MOVE;
      if (G.rolls === 0 || G.rolls >= MAX_ROLLS) return INVALID_MOVE;
      G.held[dieIndex] = !G.held[dieIndex];
    },
    selectScore: ({ G, ctx, events }, category: ScoringCategory) => {
      if (!(category in scoreFns)) return INVALID_MOVE;
      if (G.rolls === 0) return INVALID_MOVE;
      const pid = Number(ctx.currentPlayer);
      if (G.scores[pid][category] !== null) return INVALID_MOVE;
      G.scores[pid][category] = scoreFns[category](G.dice);
      G.dice = Array(DICE).fill(1);
      G.held = Array(DICE).fill(false);
      G.rolls = 0;
      events.endTurn();
    },
  },
  endIf: ({ G }) => {
    if (!G.scores.every(scorecardComplete)) return;
    const totals = G.scores.map(grandTotal);
    const top = Math.max(...totals);
    const winners = totals
      .map((t, i) => (t === top ? String(i) : null))
      .filter((x): x is string => x !== null);
    if (winners.length > 1) return { draw: true, totals };
    return { winner: winners[0], totals };
  },
  ai: {
    enumerate: (G, ctx) => {
      const moves: { move: string; args?: unknown[] }[] = [];
      const pid = Number(ctx.currentPlayer);
      if (G.rolls === 0) {
        moves.push({ move: 'rollDice' });
        return moves;
      }
      if (G.rolls < MAX_ROLLS) {
        moves.push({ move: 'rollDice' });
        for (let i = 0; i < DICE; i++) {
          moves.push({ move: 'toggleDie', args: [i] });
        }
      }
      for (const category of Object.keys(scoreFns) as ScoringCategory[]) {
        if (G.scores[pid][category] === null) {
          moves.push({ move: 'selectScore', args: [category] });
        }
      }
      return moves;
    },
  },
};
