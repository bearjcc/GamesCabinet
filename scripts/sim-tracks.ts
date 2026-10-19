/**
 * Headless TRACKS balance sim — greedy bots on the real rules engine.
 * Usage: npm run sim:tracks [--games=500] [--players=2,3,4,6]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } =
  require('boardgame.io/dist/cjs/client.js') as typeof import('boardgame.io/client');

import { finishDraft, playBotTurn } from '../src/games/tracks/bot';
import { dealRound, Tracks, type TracksState } from '../src/games/tracks/game';
import {
  type DeckManifestEntry,
  PLACEHOLDER_DECK_MANIFEST,
  PLACEHOLDER_DECK_MANIFEST_55,
} from '../src/games/tracks/placeholders';
import type { TracksSetupData } from '../src/games/tracks/setup';
import { buildPlayerDeck } from '../src/games/tracks/tiles';

type SimConfig = TracksSetupData & {
  numPlayers: number;
  games: number;
  deckManifest: DeckManifestEntry[];
  label: string;
};

type RoundSnapshot = {
  round: number;
  connectedOrder: string[];
};

type GameStats = {
  scores: number[];
  completed: boolean;
  turnsPerRound: number[];
  connectionEnds: number;
};

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

function connectionThreshold(numPlayers: number): number {
  if (numPlayers <= 2) return 1;
  return Math.min(2, numPlayers);
}

function roundEndedViaConnection(snap: RoundSnapshot, numPlayers: number): boolean {
  if (numPlayers === 1) return snap.connectedOrder.length > 0;
  return snap.connectedOrder.length >= connectionThreshold(numPlayers);
}

function snapshotRound(g: TracksState): RoundSnapshot {
  return { round: g.round, connectedOrder: [...g.connectedOrder] };
}

function playGame(config: SimConfig): GameStats {
  const client = Client({ game: makeGame(config), numPlayers: config.numPlayers, debug: false });
  client.start();
  finishDraft(client);

  const turnsPerRound: number[] = [];
  let connectionEnds = 0;
  let turnsThisRound = 0;
  let guard = 0;
  const maxSteps = 50_000;

  while (!client.getState()?.ctx.gameover && guard < maxSteps) {
    guard++;
    const before = client.getState();
    if (!before) break;
    const snap = snapshotRound(before.G);
    const phase = before.ctx.phase;

    const outcome = playBotTurn(client, config.numPlayers);
    if (outcome === 'over') break;
    if (outcome === 'stuck') break;

    const after = client.getState();
    if (!after) break;
    const gAfter = after.G;

    if (phase === 'play') turnsThisRound++;

    if (gAfter.round > snap.round) {
      turnsPerRound.push(turnsThisRound);
      turnsThisRound = 0;
      if (roundEndedViaConnection(snap, config.numPlayers)) connectionEnds++;
    }
  }

  const final = client.getState();
  const g = final?.G;
  return {
    scores: g?.scores ?? [],
    completed: Boolean(final?.ctx.gameover),
    turnsPerRound,
    connectionEnds,
  };
}

type Aggregate = {
  label: string;
  games: number;
  completed: number;
  avgFinalScore: number;
  avgSpread: number;
  pctRoundsViaConnection: number;
  avgTurnsPerRound: number;
};

function aggregate(config: SimConfig, results: GameStats[]): Aggregate {
  const completed = results.filter((r) => r.completed);
  const totals = completed.map((r) => r.scores.reduce((a, b) => a + b, 0));
  const spreads = completed.map((r) => Math.max(...r.scores) - Math.min(...r.scores));
  const avgFinalScore = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;

  let connectionRounds = 0;
  let scoredRounds = 0;
  let turnSum = 0;
  for (const r of completed) {
    connectionRounds += r.connectionEnds;
    scoredRounds += r.turnsPerRound.length;
    turnSum += r.turnsPerRound.reduce((a, b) => a + b, 0);
  }
  const pctRoundsViaConnection = scoredRounds > 0 ? (100 * connectionRounds) / scoredRounds : 0;
  const avgTurnsPerRound = scoredRounds > 0 ? turnSum / scoredRounds : 0;

  return {
    label: config.label,
    games: results.length,
    completed: completed.length,
    avgFinalScore,
    avgSpread,
    pctRoundsViaConnection,
    avgTurnsPerRound,
  };
}

function parseArg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const games = Number(parseArg('games', '500'));
const playerList = parseArg('players', '2,3,4,6')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => n >= 1);

const deckManifests: { label: string; manifest: DeckManifestEntry[] }[] = [
  { label: 'deck50', manifest: PLACEHOLDER_DECK_MANIFEST },
  { label: 'deck55', manifest: PLACEHOLDER_DECK_MANIFEST_55 },
];
const junctions: (1 | 2)[] = [1, 2];

console.log(`TRACKS sim — ${games} games × [${playerList.join(',')}] players × deck/junction grid`);
console.log(
  `Deck sizes: ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST).length} vs ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST_55).length} cards/player\n`,
);

console.log('label | completed | avgFinalScore | avgSpread | %roundsViaConnect | avgTurns/round');
console.log('--- | --- | --- | --- | --- | ---');

for (const numPlayers of playerList) {
  for (const deck of deckManifests) {
    for (const junctionPoints of junctions) {
      const config: SimConfig = {
        label: `p${numPlayers} ${deck.label} j${junctionPoints}`,
        numPlayers,
        games,
        deckManifest: deck.manifest,
        junctionPoints,
        discardDrawRule: '2023',
      };
      const results: GameStats[] = [];
      for (let i = 0; i < games; i++) results.push(playGame(config));
      const row = aggregate(config, results);
      console.log(
        `${row.label} | ${row.completed}/${row.games} | ${row.avgFinalScore.toFixed(1)} | ${row.avgSpread.toFixed(1)} | ${row.pctRoundsViaConnection.toFixed(1)}% | ${row.avgTurnsPerRound.toFixed(1)}`,
      );
    }
  }
}
