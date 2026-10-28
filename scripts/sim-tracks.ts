/**
 * Headless TRACKS balance sim — greedy bots on the real rules engine.
 * Usage: npm run sim:tracks [--games=1000] [--players=2,3,4,6]
 */

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

type RunningStats = {
  label: string;
  games: number;
  completed: number;
  capHits: number;
  finalScoreSum: number;
  spreadSum: number;
  roundCount: number;
  turnSum: number;
  connectionRoundEnds: number;
  objectivesHeldStart: number;
  objectivesCleared: number;
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

function countObjectives(g: TracksState): number {
  return g.players.reduce((n, p) => n + p.objectives.length, 0);
}

function playGame(
  config: SimConfig,
  gameIndex: number,
  maxSteps: number,
): {
  completed: boolean;
  capHit: boolean;
  scores: number[];
  turnsPerRound: number[];
  connectionEnds: number;
  objectivesHeldStart: number;
  objectivesCleared: number;
} {
  const client = Client({
    game: { ...makeGame(config), seed: `${config.label}-${gameIndex}` },
    numPlayers: config.numPlayers,
    debug: false,
  });
  client.start();
  finishDraft(client);

  const turnsPerRound: number[] = [];
  let connectionEnds = 0;
  let turnsThisRound = 0;
  let guard = 0;
  let objectivesHeldStart = 0;
  let objectivesCleared = 0;
  let objectivesAtRoundStart = countObjectives(client.getState()?.G ?? ({} as TracksState));

  while (!client.getState()?.ctx.gameover && guard < maxSteps) {
    guard++;
    const before = client.getState();
    if (!before) break;
    const snapRound = before.G.round;
    const snapConnected = before.G.connectedOrder.length;
    const phase = before.ctx.phase;

    const outcome = playBotTurn(client, config.numPlayers);
    if (outcome === 'over') break;

    const after = client.getState();
    if (!after) break;
    const gAfter = after.G;

    if (phase === 'play') turnsThisRound++;

    if (gAfter.round > snapRound) {
      turnsPerRound.push(turnsThisRound);
      turnsThisRound = 0;
      if (snapConnected > 0 || gAfter.connectedOrder.length > 0) connectionEnds++;
      const heldAfter = countObjectives(gAfter);
      objectivesHeldStart += objectivesAtRoundStart;
      if (heldAfter < objectivesAtRoundStart) {
        objectivesCleared += objectivesAtRoundStart - heldAfter;
      }
      objectivesAtRoundStart = heldAfter;
    }
  }

  const final = client.getState();
  const g = final?.G;
  const completed = Boolean(final?.ctx.gameover);
  return {
    completed,
    capHit: !completed,
    scores: g?.scores ?? [],
    turnsPerRound,
    connectionEnds,
    objectivesHeldStart,
    objectivesCleared,
  };
}

function freshStats(label: string, games: number): RunningStats {
  return {
    label,
    games,
    completed: 0,
    capHits: 0,
    finalScoreSum: 0,
    spreadSum: 0,
    roundCount: 0,
    turnSum: 0,
    connectionRoundEnds: 0,
    objectivesHeldStart: 0,
    objectivesCleared: 0,
  };
}

function absorb(stats: RunningStats, result: ReturnType<typeof playGame>): void {
  if (result.completed) stats.completed++;
  else stats.capHits++;
  if (result.scores.length > 0) {
    stats.finalScoreSum += result.scores.reduce((a, b) => a + b, 0);
    stats.spreadSum += Math.max(...result.scores) - Math.min(...result.scores);
  }
  stats.roundCount += result.turnsPerRound.length;
  stats.turnSum += result.turnsPerRound.reduce((a, b) => a + b, 0);
  stats.connectionRoundEnds += result.connectionEnds;
  stats.objectivesHeldStart += result.objectivesHeldStart;
  stats.objectivesCleared += result.objectivesCleared;
}

function parseArg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const games = Number(parseArg('games', '1000'));
const playerList = parseArg('players', '2,3,4,6')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => n >= 1);

const deckManifests: { label: string; manifest: DeckManifestEntry[] }[] = [
  { label: 'deck50', manifest: PLACEHOLDER_DECK_MANIFEST },
  { label: 'deck55', manifest: PLACEHOLDER_DECK_MANIFEST_55 },
];
const junctions: (1 | 2)[] = [1, 2];

const reportLines: string[] = [];
const log = (line: string) => {
  console.log(line);
  reportLines.push(line);
};

log(`TRACKS sim — ${games} games × [${playerList.join(',')}] players × deck/junction grid`);
log(
  `Deck sizes: ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST).length} vs ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST_55).length} cards/player`,
);
log('');
log(
  'label | completed | cap% | avgFinalScore | avgSpread | avgTurns/round | objClear% | %roundsLapEnd',
);
log('--- | --- | --- | --- | --- | --- | --- | ---');

const allStats: RunningStats[] = [];

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
      const stats = freshStats(config.label, games);
      const maxSteps = numPlayers >= 6 ? 80_000 : 40_000;
      for (let i = 0; i < games; i++) {
        absorb(stats, playGame(config, i, maxSteps));
        if (games >= 100 && (i + 1) % 100 === 0) {
          console.error(`${config.label}: ${i + 1}/${games} games`);
        }
      }
      allStats.push(stats);
      const capPct = (100 * stats.capHits) / stats.games;
      const avgFinal = stats.completed > 0 ? stats.finalScoreSum / stats.completed : 0;
      const avgSpread = stats.completed > 0 ? stats.spreadSum / stats.completed : 0;
      const avgTurns = stats.roundCount > 0 ? stats.turnSum / stats.roundCount : 0;
      const objClear =
        stats.objectivesHeldStart > 0
          ? (100 * stats.objectivesCleared) / stats.objectivesHeldStart
          : 0;
      const lapPct =
        stats.roundCount > 0 ? (100 * stats.connectionRoundEnds) / stats.roundCount : 0;
      log(
        `${stats.label} | ${stats.completed}/${stats.games} | ${capPct.toFixed(1)}% | ${avgFinal.toFixed(1)} | ${avgSpread.toFixed(1)} | ${avgTurns.toFixed(1)} | ${objClear.toFixed(1)}% | ${lapPct.toFixed(1)}%`,
      );
    }
  }
}

const reportPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'tracks-sim-report.md',
);
const body = `# TRACKS sim report

Greedy route bots on the cabinet rules engine. Run date: ${new Date().toISOString().slice(0, 10)}. ${games} games per row; discard draw 2023. Step caps: 40k (2–4 players), 80k (6 players).

Multiplayer rounds end on the lap rule: first connection starts a wind-down, then play stops before the round starter would go again.

| Config | Completed | Cap hit | Avg total score | Avg spread | Avg turns / round | Objective clear % | Rounds ending after a connection |
| --- | --- | --- | --- | --- | --- | --- | --- |
${allStats
  .map((s) => {
    const capPct = (100 * s.capHits) / s.games;
    const avgFinal = s.completed > 0 ? s.finalScoreSum / s.completed : 0;
    const avgSpread = s.completed > 0 ? s.spreadSum / s.completed : 0;
    const avgTurns = s.roundCount > 0 ? s.turnSum / s.roundCount : 0;
    const objClear =
      s.objectivesHeldStart > 0 ? (100 * s.objectivesCleared) / s.objectivesHeldStart : 0;
    const lapPct = s.roundCount > 0 ? (100 * s.connectionRoundEnds) / s.roundCount : 0;
    return `| ${s.label} | ${s.completed}/${s.games} | ${capPct.toFixed(1)}% | ${avgFinal.toFixed(1)} | ${avgSpread.toFixed(1)} | ${avgTurns.toFixed(1)} | ${objClear.toFixed(1)}% | ${lapPct.toFixed(1)}% |`;
  })
  .join('\n')}

## Notes

- **Cap hit** — sim step limit (${playerList.map((p) => (p >= 6 ? '80k' : '40k')).join(' / ')} steps by table size) before game over.
- **Objective clear %** — secret objectives scored and removed, divided by objectives held entering scored rounds.
- **Lap end %** — rounds where at least one player had connected before scoring (expected ~100% in normal play).
`;

writeFileSync(reportPath, body);
log(`\nWrote ${reportPath}`);
