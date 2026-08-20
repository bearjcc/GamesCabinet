import type { Game } from 'boardgame.io';
import { INVALID_MOVE } from '../invalidMove';
import {
  buildSoloDeck,
  canPlayFuel,
  canPlayReady,
  canPlaySatellite,
  crawlerReady,
  HAND_SIZE,
  HAZARD_ROUNDS,
  type HazardKind,
  hazardFromRoll,
  type OrbitsArea,
  type OrbitsCard,
  pointsValue,
  revealedUpgradeFor,
} from './cards';

export type PendingHazard = { hazard: HazardKind; countermeasureOnly: boolean };

export type LaunchState = {
  round: number;
  pending: PendingHazard | null;
};

/**
 * Solo variant state. Multiplayer (opponent hazard play, 2,500-point race)
 * is deferred; the solo rules remove Hazards and use d6 rolls per round.
 */
export type OrbitsState = {
  deck: OrbitsCard[];
  discard: OrbitsCard[];
  hands: OrbitsCard[][];
  areas: OrbitsArea[];
  scores: number[];
  failures: number;
  turns: number;
  drewThisTurn: boolean;
  refillPending: boolean;
  deckExhausted: boolean;
  launch: LaunchState | null;
};

export const MAX_FAILURES = 2;

function emptyArea(): OrbitsArea {
  return { satellites: [], fuel: [], upgrades: [], onCrawler: false };
}

function playerIndex(ctx: { currentPlayer: string }): number {
  return Number(ctx.currentPlayer);
}

/** Apply one solo d6 hazard roll to the current launch round. */
export function applyLaunchRoll(G: OrbitsState, area: OrbitsArea, roll: number): void {
  const launch = G.launch;
  if (!launch) return;
  const hazard = HAZARD_ROUNDS[launch.round];
  if (!hazard) return;
  if (revealedUpgradeFor(area, hazard)) {
    launch.round += 1;
    return;
  }
  const outcome = hazardFromRoll(roll);
  if (!outcome) {
    launch.round += 1;
    return;
  }
  launch.pending = { hazard, countermeasureOnly: outcome.countermeasureOnly };
}

/** Clear the pending hazard and advance; true when the launch succeeds. */
function advanceLaunch(G: OrbitsState): boolean {
  const launch = G.launch!;
  launch.pending = null;
  launch.round += 1;
  return launch.round >= HAZARD_ROUNDS.length;
}

function discardStack(G: OrbitsState, area: OrbitsArea): void {
  G.discard.push(...area.satellites, ...area.fuel);
  area.satellites = [];
  area.fuel = [];
  area.onCrawler = false;
}

/** Successful launch: score expended fuel (boosters discounted), clear the stack. */
function finalizeSuccess(G: OrbitsState, p: number): void {
  const area = G.areas[p];
  G.scores[p] += area.fuel.reduce((sum, c) => sum + pointsValue(c), 0);
  discardStack(G, area);
  G.launch = null;
  G.refillPending = true;
}

/** Abort keeps the stack on the crawler; failure discards it and counts. */
function concludeLaunch(G: OrbitsState, p: number, failed: boolean): void {
  if (failed) {
    discardStack(G, G.areas[p]);
    G.failures += 1;
  }
  G.launch = null;
  G.refillPending = true;
}

export const Orbits: Game<OrbitsState> = {
  name: 'orbits',

  setup: ({ ctx, random }) => {
    const deck = random.Shuffle(buildSoloDeck());
    const hands: OrbitsCard[][] = [];
    const areas: OrbitsArea[] = [];
    for (let p = 0; p < ctx.numPlayers; p++) {
      hands.push(deck.splice(0, HAND_SIZE));
      areas.push(emptyArea());
    }
    return {
      deck,
      discard: [],
      hands,
      areas,
      scores: Array(ctx.numPlayers).fill(0),
      failures: 0,
      turns: 0,
      drewThisTurn: false,
      refillPending: false,
      deckExhausted: false,
      launch: null,
    };
  },

  turn: {
    onEnd: ({ G }) => {
      G.drewThisTurn = false;
    },
  },

  moves: {
    drawCard: ({ G, ctx }) => {
      if (G.refillPending || G.launch || G.drewThisTurn) return INVALID_MOVE;
      if (G.deck.length === 0) {
        G.deckExhausted = true;
        return;
      }
      G.hands[playerIndex(ctx)].push(G.deck.shift()!);
      G.drewThisTurn = true;
    },

    playCard: ({ G, ctx, events }, cardId: string) => {
      if (G.refillPending || G.launch || !G.drewThisTurn) return INVALID_MOVE;
      const p = playerIndex(ctx);
      const hand = G.hands[p];
      const idx = hand.findIndex((c) => c.id === cardId);
      if (idx < 0) return INVALID_MOVE;
      const card = hand[idx];
      const area = G.areas[p];
      switch (card.kind) {
        case 'satellite':
          if (!canPlaySatellite(area, card)) return INVALID_MOVE;
          area.satellites.push(card);
          break;
        case 'fuel':
        case 'booster':
          if (!canPlayFuel(area, card)) return INVALID_MOVE;
          area.fuel.push(card);
          break;
        case 'upgrade':
          area.upgrades.push({ card, revealed: false });
          break;
        case 'ready': {
          if (!canPlayReady(area, card)) return INVALID_MOVE;
          hand.splice(idx, 1);
          G.discard.push(card);
          G.launch = { round: 0, pending: null };
          return;
        }
        case 'countermeasure':
          return INVALID_MOVE;
      }
      hand.splice(idx, 1);
      G.turns += 1;
      events.endTurn();
    },

    discardCard: ({ G, ctx, events }, cardId: string) => {
      if (G.refillPending || G.launch || !G.drewThisTurn) return INVALID_MOVE;
      const hand = G.hands[playerIndex(ctx)];
      const idx = hand.findIndex((c) => c.id === cardId);
      if (idx < 0) return INVALID_MOVE;
      const [card] = hand.splice(idx, 1);
      G.discard.push(card);
      G.turns += 1;
      events.endTurn();
    },

    declareCrawler: ({ G, ctx }) => {
      if (G.refillPending || G.launch || !G.drewThisTurn) return INVALID_MOVE;
      const area = G.areas[playerIndex(ctx)];
      if (area.onCrawler || !crawlerReady(area)) return INVALID_MOVE;
      area.onCrawler = true;
    },

    rollHazard: ({ G, ctx, random }) => {
      const launch = G.launch;
      if (!launch || launch.pending || launch.round >= HAZARD_ROUNDS.length) {
        return INVALID_MOVE;
      }
      const p = playerIndex(ctx);
      applyLaunchRoll(G, G.areas[p], random.D6());
      if (launch.round >= HAZARD_ROUNDS.length && !launch.pending) {
        finalizeSuccess(G, p);
      }
    },

    resolveWithCountermeasure: ({ G, ctx }, cardId: string) => {
      const launch = G.launch;
      if (!launch?.pending) return INVALID_MOVE;
      const p = playerIndex(ctx);
      const hand = G.hands[p];
      const idx = hand.findIndex((c) => c.id === cardId);
      const card = idx >= 0 ? hand[idx] : undefined;
      if (card?.kind !== 'countermeasure' || card.resolves !== launch.pending.hazard) {
        return INVALID_MOVE;
      }
      hand.splice(idx, 1);
      G.discard.push(card);
      if (advanceLaunch(G)) finalizeSuccess(G, p);
    },

    resolveWithUpgrade: ({ G, ctx }, cardId: string) => {
      const launch = G.launch;
      if (!launch?.pending || launch.pending.countermeasureOnly) return INVALID_MOVE;
      const p = playerIndex(ctx);
      const played = G.areas[p].upgrades.find(
        (u) => !u.revealed && u.card.id === cardId && u.card.resolves === launch.pending!.hazard,
      );
      if (!played) return INVALID_MOVE;
      played.revealed = true;
      if (advanceLaunch(G)) finalizeSuccess(G, p);
    },

    playUpgradeFaceUp: ({ G, ctx }, cardId: string) => {
      const launch = G.launch;
      if (!launch?.pending || launch.pending.countermeasureOnly) return INVALID_MOVE;
      const p = playerIndex(ctx);
      const hand = G.hands[p];
      const idx = hand.findIndex((c) => c.id === cardId);
      const card = idx >= 0 ? hand[idx] : undefined;
      if (card?.kind !== 'upgrade' || card.resolves !== launch.pending.hazard) {
        return INVALID_MOVE;
      }
      hand.splice(idx, 1);
      G.areas[p].upgrades.push({ card, revealed: true });
      if (advanceLaunch(G)) finalizeSuccess(G, p);
    },

    resolveDesignFailure: ({ G, ctx }, cardId: string) => {
      const launch = G.launch;
      if (!launch?.pending || launch.pending.hazard !== 'design-failure') return INVALID_MOVE;
      const p = playerIndex(ctx);
      const area = G.areas[p];
      const fuelIdx = area.fuel.findIndex((c) => c.id === cardId);
      if (fuelIdx >= 0) {
        const [card] = area.fuel.splice(fuelIdx, 1);
        G.discard.push(card);
      } else {
        const upIdx = area.upgrades.findIndex((u) => u.card.id === cardId);
        if (upIdx < 0) return INVALID_MOVE;
        const [played] = area.upgrades.splice(upIdx, 1);
        G.discard.push(played.card);
      }
      if (advanceLaunch(G)) finalizeSuccess(G, p);
    },

    abortLaunch: ({ G, ctx }) => {
      const launch = G.launch;
      if (!launch) return INVALID_MOVE;
      // Unresolved design/weather rounds abort; engine/junk rounds fail the rocket.
      concludeLaunch(G, playerIndex(ctx), launch.round >= 2);
    },

    refillHand: ({ G, ctx, events }, discardAll: boolean) => {
      if (!G.refillPending || G.launch) return INVALID_MOVE;
      const hand = G.hands[playerIndex(ctx)];
      if (discardAll) {
        G.discard.push(...hand);
        hand.length = 0;
      }
      while (hand.length < HAND_SIZE && G.deck.length > 0) {
        hand.push(G.deck.shift()!);
      }
      if (hand.length < HAND_SIZE) G.deckExhausted = true;
      G.refillPending = false;
      G.turns += 1;
      events.endTurn();
    },
  },

  endIf: ({ G }) => {
    if (G.failures >= MAX_FAILURES) return { score: G.scores[0], reason: 'failures' };
    if (G.deckExhausted) return { score: G.scores[0], reason: 'deck' };
  },
};
