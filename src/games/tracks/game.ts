/**
 * TRACKS (Rail Co.) - boardgame.io game. Multiplayer rules per the 2021-05-18
 * rules email with Zoe's 2021-06-28 discard-draw clarification and the
 * 2021-07-16 objective manifest. Rounds cycle draft -> play; boards reset each
 * round and all track cards reshuffle (per the end-of-round rule).
 */
import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  type Board,
  cellPoints,
  emptyBoard,
  isConnected,
  keptCells,
  placeError,
  placeTile,
  reachableFromStart,
  rightmostConnectedColumn,
} from './grid';
import {
  boardMetrics,
  buildObjectiveDeck,
  type ObjectiveId,
  objectiveDef,
  scoreObjective,
} from './objectives';
import { buildPlayerDeck, type Tile } from './tiles';

export const ROUNDS = 5;
export const HAND_SIZE = 4;

export type TracksPlayer = {
  board: Board;
  hand: Tile[];
  /** Held objectives (kept across rounds until completed). */
  objectives: ObjectiveId[];
  /** This round's two-card draft, pre-choice. */
  draft: ObjectiveId[];
};

export type TracksState = {
  deck: Tile[];
  /** Face-up pile; only the top (last) card may be drawn. */
  discard: Tile[];
  players: TracksPlayer[];
  scores: number[];
  round: number;
  /** Card drawn this turn; from-discard draws must be played immediately. */
  drawnId: string | null;
  drewFromDiscard: boolean;
  /** Player ids in the order they connected this round (Speed Layer input). */
  connectedOrder: string[];
  /** Ids still owed a final turn once two players have connected. */
  lastTurns: string[] | null;
  /** Test/puzzle seam: skip the round re-deal once when a board was pre-set. */
  prepared: boolean;
  /** Distinguishes "draft not dealt yet" from "all choices made". */
  draftsDealt: boolean;
};

function freshPlayer(): TracksPlayer {
  return { board: emptyBoard(), hand: [], objectives: [], draft: [] };
}

/** Round setup: fresh shuffled decks, new boards, deal hands and the draft. */
export function dealRound(G: TracksState, numPlayers: number, shuffle: <T>(xs: T[]) => T[]): void {
  const all: Tile[] = [];
  for (let d = 0; d < numPlayers; d++) {
    for (const t of buildPlayerDeck()) all.push({ ...t, id: `d${d}-${t.id}` });
  }
  const deck = shuffle(all);
  for (const p of G.players) {
    p.board = emptyBoard();
    p.hand = deck.splice(0, HAND_SIZE);
  }
  G.discard = deck.splice(0, 1);
  G.deck = deck;

  const held = G.players.flatMap((p) => p.objectives);
  const available = buildObjectiveDeck();
  for (const h of held) {
    const i = available.indexOf(h);
    if (i >= 0) available.splice(i, 1);
  }
  const objectiveDeck = shuffle(available);
  for (const p of G.players) {
    p.draft = objectiveDeck.splice(0, 2);
  }

  G.connectedOrder = [];
  G.lastTurns = null;
  G.drawnId = null;
  G.drewFromDiscard = false;
  G.draftsDealt = true;
}

/** Round scoring: connection, kept card values, held objectives, bonuses. */
export function scoreRound(G: TracksState): void {
  const metrics = G.players.map((p) => boardMetrics(p.board));
  G.players.forEach((p, i) => {
    const reachable = reachableFromStart(p.board);
    const kept = keptCells(p.board, reachable);
    let pts = isConnected(p.board, reachable) ? 10 : rightmostConnectedColumn(reachable);
    for (const k of kept) pts += cellPoints(p.board[k]);
    const remaining: ObjectiveId[] = [];
    for (const obj of p.objectives) {
      const s = scoreObjective(obj, i, metrics);
      if (s > 0) pts += s;
      else remaining.push(obj);
    }
    p.objectives = remaining;
    G.scores[i] += pts;
  });

  // Bonus objectives are only used with 4 or more players.
  if (G.players.length >= 4) {
    const first = G.connectedOrder[0];
    if (first !== undefined) G.scores[Number(first)] += objectiveDef('speed-layer').points;
    const filled = metrics.map((m) => m.filled);
    const best = Math.max(...filled);
    if (filled.filter((f) => f === best).length === 1) {
      G.scores[filled.indexOf(best)] += objectiveDef('land-baron').points;
    }
  }
}

function connectedThreshold(numPlayers: number): number {
  return Math.min(2, numPlayers);
}

/** After a turn action: consume final turns and end the turn. */
function endPlayTurn(
  G: TracksState,
  ctx: { currentPlayer: string },
  events: { endTurn: () => void },
): void {
  if (G.lastTurns) {
    G.lastTurns = G.lastTurns.filter((id) => id !== ctx.currentPlayer);
  }
  events.endTurn();
}

export const Tracks: Game<TracksState> = {
  name: 'tracks',

  setup: ({ ctx }) => ({
    deck: [],
    discard: [],
    players: Array.from({ length: ctx.numPlayers }, freshPlayer),
    scores: Array(ctx.numPlayers).fill(0),
    round: 1,
    drawnId: null,
    drewFromDiscard: false,
    connectedOrder: [],
    lastTurns: null,
    prepared: false,
    draftsDealt: false,
  }),

  phases: {
    draft: {
      start: true,
      next: 'play',
      onBegin: ({ G, ctx, random }) => {
        if (G.prepared) {
          G.prepared = false;
          G.connectedOrder = [];
          G.lastTurns = null;
          G.draftsDealt = true;
          return;
        }
        dealRound(G, ctx.numPlayers, (xs) => random.Shuffle(xs));
      },
      turn: {
        // Sequential pass-and-play draft: same first player as the round.
        moveLimit: 1,
        order: {
          first: ({ G, ctx }) => (G.round - 1) % ctx.numPlayers,
          next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
      },
      moves: {
        chooseObjective: ({ G, ctx }, id: ObjectiveId) => {
          const p = G.players[Number(ctx.currentPlayer)];
          const i = p.draft.indexOf(id);
          if (i < 0) return INVALID_MOVE;
          p.objectives.push(id);
          // The unchosen card is discarded into next round's objective deck
          // (dealRound rebuilds that deck from the manifest minus held cards).
          p.draft = [];
        },
      },
      endIf: ({ G }) => G.draftsDealt && G.players.every((p) => p.draft.length === 0),
    },

    play: {
      next: 'draft',
      turn: {
        order: {
          // First player rotates clockwise each round.
          first: ({ G, ctx }) => (G.round - 1) % ctx.numPlayers,
          next: ({ G, ctx }) => {
            if (G.lastTurns && G.lastTurns.length > 0) {
              for (let i = 1; i <= ctx.numPlayers; i++) {
                const pos = (ctx.playOrderPos + i) % ctx.numPlayers;
                if (G.lastTurns.includes(ctx.playOrder[pos])) return pos;
              }
            }
            return (ctx.playOrderPos + 1) % ctx.numPlayers;
          },
        },
        onBegin: ({ G }) => {
          G.drawnId = null;
          G.drewFromDiscard = false;
        },
      },
      moves: {
        drawTile: ({ G, ctx, random }, source: 'deck' | 'discard') => {
          if (G.drawnId !== null) return INVALID_MOVE;
          if (source === 'discard') {
            const top = G.discard.pop();
            if (!top) return INVALID_MOVE;
            G.drawnId = top.id;
            G.drewFromDiscard = true;
            // The card is in limbo until played; track it on the pile top.
            G.discard.push(top);
            return;
          }
          if (G.deck.length === 0) {
            if (G.discard.length === 0) return INVALID_MOVE;
            G.deck = random.Shuffle(G.discard);
            G.discard = [];
          }
          const card = G.deck.shift()!;
          const p = G.players[Number(ctx.currentPlayer)];
          p.hand.push(card);
          G.drawnId = card.id;
        },

        playTile: (
          { G, ctx, events },
          cardId: string,
          target: number,
          row: number,
          col: number,
          rot: number,
        ) => {
          if (G.drawnId === null) return INVALID_MOVE;
          if (G.drewFromDiscard && cardId !== G.drawnId) return INVALID_MOVE;
          const me = Number(ctx.currentPlayer);
          const p = G.players[me];
          let fromDiscard: Tile | null = null;
          const idx = p.hand.findIndex((t) => t.id === cardId);
          if (idx < 0) {
            if (G.drewFromDiscard && G.discard[G.discard.length - 1]?.id === cardId) {
              fromDiscard = G.discard[G.discard.length - 1];
            } else {
              return INVALID_MOVE;
            }
          }
          const card = fromDiscard ?? p.hand[idx];
          const board = G.players[target]?.board;
          if (!board) return INVALID_MOVE;
          const error = placeError(board, card, row, col, rot, { foreign: target !== me });
          if (error) return INVALID_MOVE;

          if (fromDiscard) G.discard.pop();
          else p.hand.splice(idx, 1);
          placeTile(board, card, row, col, rot);

          const targetId = String(target);
          if (isConnected(board) && !G.connectedOrder.includes(targetId)) {
            G.connectedOrder.push(targetId);
            if (
              G.connectedOrder.length === connectedThreshold(G.players.length) &&
              G.lastTurns === null
            ) {
              // The other players take one last turn in turn order.
              G.lastTurns = ctx.playOrder.filter((id) => !G.connectedOrder.includes(id));
            }
          }
          endPlayTurn(G, ctx, events);
        },

        discardTile: ({ G, ctx, events }, cardId: string) => {
          if (G.drawnId === null) return INVALID_MOVE;
          if (G.drewFromDiscard) return INVALID_MOVE;
          const p = G.players[Number(ctx.currentPlayer)];
          const idx = p.hand.findIndex((t) => t.id === cardId);
          if (idx < 0) return INVALID_MOVE;
          G.discard.push(p.hand.splice(idx, 1)[0]);
          endPlayTurn(G, ctx, events);
        },
      },
      endIf: ({ G }) => G.lastTurns !== null && G.lastTurns.length === 0,
      onEnd: ({ G }) => {
        scoreRound(G);
        G.round += 1;
        // boardgame.io checks a phase's endIf before its onBegin: leave both
        // flags in their "not done" state so the next phases cannot auto-end
        // on stale round state.
        G.lastTurns = null;
        G.draftsDealt = false;
      },
    },
  },

  endIf: ({ G }) => {
    if (G.round <= ROUNDS) return;
    const best = Math.max(...G.scores);
    // Physical tiebreak is "best train noise"; a digital tie stands shared.
    return { winners: G.scores.flatMap((s, i) => (s === best ? [String(i)] : [])) };
  },
};
