/**
 * Headless TRACKS balance sim — random/greedy bots on the real rules engine.
 * Usage: npm run sim:tracks [--games=300] [--players=3]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } =
  require('boardgame.io/dist/cjs/client.js') as typeof import('boardgame.io/client');

import { dealRound, Tracks, type TracksState } from '../src/games/tracks/game';
import { placeError, START_ROW, WIDTH } from '../src/games/tracks/grid';
import type { ObjectiveId } from '../src/games/tracks/objectives';
import {
  type DeckManifestEntry,
  PLACEHOLDER_DECK_MANIFEST,
  PLACEHOLDER_DECK_MANIFEST_55,
} from '../src/games/tracks/placeholders';
import type { TracksSetupData } from '../src/games/tracks/setup';
import { allowedRotations, buildPlayerDeck, type Tile } from '../src/games/tracks/tiles';

type SimConfig = TracksSetupData & {
  numPlayers: number;
  games: number;
  deckManifest: DeckManifestEntry[];
  label: string;
};

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Placement = { target: number; row: number; col: number; rot: number; cardId: string };

function legalPlacements(G: TracksState, player: number, card: Tile): Placement[] {
  const out: Placement[] = [];
  G.players.forEach((p, target) => {
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

function pickPlacement(rng: () => number, spots: Placement[]): Placement {
  const greedy = spots.filter((s) => s.row === START_ROW && s.col > 0);
  const pool = greedy.length > 0 ? greedy : spots;
  return pool[Math.floor(rng() * pool.length)];
}

function throughDraft(client: ReturnType<typeof Client>) {
  const g = client.getState()?.G as TracksState;
  const n = g.players.length;
  for (let p = 0; p < n; p++) {
    const state = client.getState();
    if (!state) return;
    const me = Number(state.ctx.currentPlayer ?? 0);
    const draft = (state.G as TracksState).players[me]?.draft[0] as ObjectiveId | undefined;
    if (!draft) return;
    client.moves.chooseObjective(draft);
  }
}

function makeGame(config: SimConfig) {
  const manifest = config.deckManifest;
  const setupData: TracksSetupData = {
    discardDrawRule: config.discardDrawRule,
    junctionPoints: config.junctionPoints,
  };
  return {
    ...Tracks,
    setup: (context: Parameters<NonNullable<typeof Tracks.setup>>[0]) =>
      Tracks.setup!(context, setupData) as TracksState,
    phases: {
      ...Tracks.phases,
      draft: {
        ...Tracks.phases!.draft,
        onBegin: (args: {
          G: TracksState;
          ctx: { numPlayers: number };
          random: { Shuffle: <T>(xs: T[]) => T[] };
        }) => {
          const { G, ctx, random } = args;
          if (G.prepared) {
            G.prepared = false;
            G.draftsDealt = true;
            return;
          }
          dealRound(G, ctx.numPlayers, (xs) => random.Shuffle(xs), manifest);
        },
      },
    },
  };
}

function playGames(config: SimConfig, baseSeed: number): number[][] {
  const rows: number[][] = [];
  const totals: number[][] = [];
  let completed = 0;
  const game = makeGame(config);
  for (let i = 0; i < config.games; i++) {
    const rng = mulberry32(baseSeed + i * 997);
    const client = Client({ game, numPlayers: config.numPlayers, debug: false });
    client.start();
    throughDraft(client);
    let guard = 0;
    while (!client.getState()?.ctx.gameover && guard < 12000) {
      guard++;
      const state = client.getState();
      if (!state) break;
      const g = state.G as TracksState;
      if (state.ctx.phase === 'draft') {
        throughDraft(client);
        continue;
      }
      const me = Number(state.ctx.currentPlayer);
      const hand = g.players[me]?.hand;
      if (!hand) break;
      if (g.drawnId === null) {
        if (g.deck.length > 0) {
          client.moves.drawTile('deck');
        } else if (g.discard.length > 0 && config.numPlayers > 1) {
          const top = g.discard[g.discard.length - 1];
          const spots = top ? legalPlacements(g, me, top) : [];
          if (spots.length > 0) client.moves.drawTile('discard');
          else break;
        } else {
          break;
        }
        continue;
      }
      const drawn =
        g.drewFromDiscard && g.discard[g.discard.length - 1]?.id === g.drawnId
          ? g.discard[g.discard.length - 1]
          : (hand.find((t) => t.id === g.drawnId) ?? hand[0]);
      if (!drawn) break;
      const spots = legalPlacements(g, me, drawn);
      if (spots.length > 0) {
        const spot = pickPlacement(rng, spots);
        client.moves.playTile(spot.cardId, spot.target, spot.row, spot.col, spot.rot);
      } else if (!g.drewFromDiscard) client.moves.discardTile(drawn.id);
      else break;
    }
    const final = client.getState();
    const g = final?.G as TracksState;
    rows.push(g.scores);
    totals.push(g.scores);
    if (final?.ctx.gameover) completed++;
  }
  return { rows, totals, completed };
}

function summarise(label: string, scores: number[][], completed: number, totals: number[][]): void {
  const spreads = scores.map((row) => Math.max(...row) - Math.min(...row));
  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const winCounts = new Array(scores[0]?.length ?? 0).fill(0);
  for (const row of scores) {
    const best = Math.max(...row);
    const winners = row.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
    if (winners.length === 1) winCounts[winners[0]]++;
  }
  const flatTotals = totals.flat();
  const avgTotal = flatTotals.reduce((a, b) => a + b, 0) / flatTotals.length;
  const std =
    Math.sqrt(flatTotals.reduce((sum, x) => sum + (x - avgTotal) ** 2, 0) / flatTotals.length) || 0;
  console.log(`\n${label}`);
  console.log(`  games: ${scores.length} (${completed} reached match end)`);
  console.log(`  avg in-game score spread (max-min): ${avgSpread.toFixed(2)}`);
  console.log(`  avg points per seat at stop: ${avgTotal.toFixed(1)} (σ ${std.toFixed(1)})`);
  console.log(`  seat win counts at stop: ${winCounts.join(', ')}`);
}

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) ? n : fallback;
}

const games = parseArg('games', 300);
const numPlayers = parseArg('players', 3);

const configs: SimConfig[] = [
  {
    label: 'deck50 junction2',
    numPlayers,
    games,
    deckManifest: PLACEHOLDER_DECK_MANIFEST,
    junctionPoints: 2,
    discardDrawRule: '2023',
  },
  {
    label: 'deck50 junction1',
    numPlayers,
    games,
    deckManifest: PLACEHOLDER_DECK_MANIFEST,
    junctionPoints: 1,
    discardDrawRule: '2023',
  },
  {
    label: 'deck55 junction2',
    numPlayers,
    games,
    deckManifest: PLACEHOLDER_DECK_MANIFEST_55,
    junctionPoints: 2,
    discardDrawRule: '2023',
  },
  {
    label: 'deck55 junction1',
    numPlayers,
    games,
    deckManifest: PLACEHOLDER_DECK_MANIFEST_55,
    junctionPoints: 1,
    discardDrawRule: '2023',
  },
];

console.log(`TRACKS sim — ${games} games × ${numPlayers} players per config`);
console.log(
  `Deck sizes: ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST).length} vs ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST_55).length} cards/player`,
);

for (const config of configs) {
  const { rows, totals, completed } = playGames(config, 42_001);
  summarise(config.label, rows, completed, totals);
}

console.log(
  '\nManufacturing note: 55-card decks often print as one 54-card sheet + 1; 50-card mixes may need a custom sheet or a 54+ spare tray.',
);
