/**
 * TRACKS (Rail Co.) - boardgame.io game.
 */
import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  type Board,
  cellPoints,
  emptyBoard,
  HEIGHT,
  isConnected,
  keptCells,
  placeError,
  placeTile,
  reachableFromStart,
  rightmostConnectedColumn,
  WIDTH,
} from './grid';
import {
  boardMetrics,
  buildObjectiveDeck,
  type ComparativeId,
  type ComparativeRace,
  comparativeIdsForState,
  initComparativeRaces,
  type ObjectiveId,
  publicObjectivesForPlayers,
  recordComparativeRace,
  scoreObjective,
  scorePublicObjectives,
} from './objectives';
import type { DeckManifestEntry } from './placeholders';
import { DEFAULT_TRACKS_SETUP, type TracksSetupData } from './setup';
import { allowedRotations, buildPlayerDeck, type Tile } from './tiles';

export const ROUNDS = 5;
export const HAND_SIZE = 4;

export type TracksPlayer = {
  board: Board;
  hand: Tile[];
  /** Secret objectives (kept across rounds until completed). */
  objectives: ObjectiveId[];
  /** This round's two-card draft, pre-choice. */
  draft: ObjectiveId[];
};

export type TracksState = {
  deck: Tile[];
  discard: Tile[];
  players: TracksPlayer[];
  scores: number[];
  round: number;
  drawnId: string | null;
  drewFromDiscard: boolean;
  discardDrawRule: '2021' | '2023';
  junctionPoints: 1 | 2;
  connectedOrder: string[];
  /** Multiplayer: after the first connection, finish the lap before the round starter acts again. */
  lapEnding: boolean;
  /** When the starter connected, skip ending until other seats have taken a turn. */
  lapGraceStarter: boolean;
  prepared: boolean;
  draftsDealt: boolean;
  soloDiscards?: number;
  /** Face-up objectives scored each round (ticket-style public goals). */
  publicObjectives: ObjectiveId[];
  /** First-to-the-lead order for comparative objectives this round. */
  objectiveRaces: Partial<Record<ComparativeId, ComparativeRace>>;
};

export const SOLO_DISCARD_LIMIT = 5;

const isSolo = (G: TracksState) => G.players.length === 1;

function freshPlayer(): TracksPlayer {
  return { board: emptyBoard(), hand: [], objectives: [], draft: [] };
}

/** Round setup: fresh shuffled decks, new boards, deal hands and the draft. */
export function dealRound(
  G: TracksState,
  numPlayers: number,
  shuffle: <T>(xs: T[]) => T[],
  deckManifest?: DeckManifestEntry[],
): void {
  const all: Tile[] = [];
  for (let d = 0; d < numPlayers; d++) {
    for (const t of buildPlayerDeck(deckManifest)) all.push({ ...t, id: `d${d}-${t.id}` });
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

  G.publicObjectives = publicObjectivesForPlayers(numPlayers);
  G.objectiveRaces = initComparativeRaces(comparativeIdsForState(G.publicObjectives, numPlayers));
  G.connectedOrder = [];
  G.lapEnding = false;
  G.lapGraceStarter = false;
  G.drawnId = null;
  G.drewFromDiscard = false;
  G.draftsDealt = true;
  G.soloDiscards = 0;
}

function noteBoardChange(G: TracksState, playerIndex: number): void {
  const metrics = G.players.map((p) => boardMetrics(p.board));
  recordComparativeRace(G.objectiveRaces, metrics, String(playerIndex));
}

/** Round scoring: connection, kept card values, held objectives, bonuses. */
export function scoreRound(G: TracksState): void {
  const metrics = G.players.map((p) => boardMetrics(p.board));
  const pointOpts = { junctionPoints: G.junctionPoints };

  G.players.forEach((p, i) => {
    const reachable = reachableFromStart(p.board);
    const kept = keptCells(p.board, reachable);
    let pts = isConnected(p.board, reachable) ? 10 : rightmostConnectedColumn(reachable);
    for (const k of kept) pts += cellPoints(p.board[k], pointOpts);
    const remaining: ObjectiveId[] = [];
    for (const obj of p.objectives) {
      const s = scoreObjective(obj, i, metrics, {
        connectedFirst: G.connectedOrder[0] ? Number(G.connectedOrder[0]) : undefined,
        races: G.objectiveRaces,
      });
      if (s > 0) pts += s;
      else remaining.push(obj);
    }
    p.objectives = remaining;
    G.scores[i] += pts;
  });

  const connectedFirst = G.connectedOrder[0] ? Number(G.connectedOrder[0]) : undefined;
  scorePublicObjectives(G.publicObjectives, metrics, G.scores, G.objectiveRaces, connectedFirst);
}

export function roundStarter(round: number, numPlayers: number): number {
  return (round - 1) % numPlayers;
}

function endPlayTurn(
  G: TracksState,
  ctx: { currentPlayer: string },
  events: { endTurn: () => void },
): void {
  if (G.lapEnding && ctx.currentPlayer !== String(roundStarter(G.round, G.players.length))) {
    G.lapGraceStarter = false;
  }
  events.endTurn();
}

function multiplayerRoundOver(
  G: TracksState,
  ctx: { currentPlayer: string; numPlayers: number },
): boolean {
  if (!G.lapEnding || G.lapGraceStarter) return false;
  return ctx.currentPlayer === String(roundStarter(G.round, ctx.numPlayers));
}

export function hasLegalPlacement(G: TracksState, tile: Tile, me: number): boolean {
  return G.players.some((p, target) => {
    for (let row = 0; row < HEIGHT; row++) {
      for (let col = 0; col < WIDTH; col++) {
        for (const rot of allowedRotations(tile.kind)) {
          if (placeError(p.board, tile, row, col, rot, { foreign: target !== me }) === null) {
            return true;
          }
        }
      }
    }
    return false;
  });
}

function soloRoundOver(G: TracksState): boolean {
  if ((G.soloDiscards ?? 0) >= SOLO_DISCARD_LIMIT) return true;
  const board = G.players[0]?.board;
  if (board && isConnected(board)) return true;
  return G.deck.length === 0 && G.drawnId === null;
}

export const Tracks: Game<TracksState> = {
  name: 'tracks',

  setup: ({ ctx }, setupData?: TracksSetupData) => {
    const rules = setupData ?? DEFAULT_TRACKS_SETUP;
    return {
      deck: [],
      discard: [],
      players: Array.from({ length: ctx.numPlayers }, freshPlayer),
      scores: Array(ctx.numPlayers).fill(0),
      round: 1,
      drawnId: null,
      drewFromDiscard: false,
      discardDrawRule: rules.discardDrawRule,
      junctionPoints: rules.junctionPoints,
      connectedOrder: [],
      lapEnding: false,
      lapGraceStarter: false,
      prepared: false,
      draftsDealt: false,
      publicObjectives: publicObjectivesForPlayers(ctx.numPlayers),
      objectiveRaces: initComparativeRaces(
        comparativeIdsForState(publicObjectivesForPlayers(ctx.numPlayers), ctx.numPlayers),
      ),
    };
  },

  phases: {
    draft: {
      start: true,
      next: 'play',
      onBegin: ({ G, ctx, random }) => {
        if (G.prepared) {
          G.prepared = false;
          G.connectedOrder = [];
          G.lapEnding = false;
          G.lapGraceStarter = false;
          G.draftsDealt = true;
          G.publicObjectives = publicObjectivesForPlayers(ctx.numPlayers);
          G.objectiveRaces = initComparativeRaces(
            comparativeIdsForState(G.publicObjectives, ctx.numPlayers),
          );
          return;
        }
        dealRound(G, ctx.numPlayers, (xs) => random.Shuffle(xs));
      },
      turn: {
        moveLimit: 1,
        order: {
          first: ({ G, ctx }) => (G.round - 1) % ctx.numPlayers,
          next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
      },
      moves: {
        passDraft: ({ G, ctx, events }) => {
          const p = G.players[Number(ctx.currentPlayer)];
          if (p.draft.length > 0) return INVALID_MOVE;
          events.endTurn();
        },
        chooseObjective: ({ G, ctx }, id: ObjectiveId) => {
          const p = G.players[Number(ctx.currentPlayer)];
          const i = p.draft.indexOf(id);
          if (i < 0) return INVALID_MOVE;
          p.objectives.push(id);
          p.draft = [];
        },
      },
      endIf: ({ G }) => G.draftsDealt && G.players.every((p) => p.draft.length === 0),
    },

    play: {
      next: 'draft',
      turn: {
        order: {
          first: ({ G, ctx }) => roundStarter(G.round, ctx.numPlayers),
          next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
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
            if (isSolo(G)) return INVALID_MOVE;
            const top = G.discard.pop();
            if (!top) return INVALID_MOVE;
            const strictDiscard = G.discardDrawRule === '2023';
            if (strictDiscard && !hasLegalPlacement(G, top, Number(ctx.currentPlayer))) {
              G.discard.push(top);
              return INVALID_MOVE;
            }
            if (strictDiscard) {
              G.drawnId = top.id;
              G.drewFromDiscard = true;
              G.discard.push(top);
              return;
            }
            const p = G.players[Number(ctx.currentPlayer)];
            p.hand.push(top);
            G.drawnId = top.id;
            G.drewFromDiscard = false;
            return;
          }
          if (G.deck.length === 0) {
            if (isSolo(G) || G.discard.length === 0) return INVALID_MOVE;
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
          noteBoardChange(G, target);

          const targetId = String(target);
          if (isConnected(board) && !G.connectedOrder.includes(targetId)) {
            G.connectedOrder.push(targetId);
            if (!isSolo(G) && !G.lapEnding) {
              G.lapEnding = true;
              if (targetId === String(roundStarter(G.round, ctx.numPlayers))) {
                G.lapGraceStarter = true;
              }
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
          if (isSolo(G)) G.soloDiscards = (G.soloDiscards ?? 0) + 1;
          endPlayTurn(G, ctx, events);
        },
      },
      endIf: ({ G, ctx }) => {
        if (isSolo(G)) return soloRoundOver(G);
        return multiplayerRoundOver(G, ctx);
      },
      onEnd: ({ G }) => {
        scoreRound(G);
        G.round += 1;
        G.lapEnding = false;
        G.lapGraceStarter = false;
        G.draftsDealt = false;
        G.soloDiscards = 0;
      },
    },
  },

  endIf: ({ G }) => {
    if (G.round <= ROUNDS) return;
    const best = Math.max(...G.scores);
    return { winners: G.scores.flatMap((s, i) => (s === best ? [String(i)] : [])) };
  },
};
