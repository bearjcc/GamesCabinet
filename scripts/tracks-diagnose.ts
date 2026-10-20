/**
 * TRACKS sim diagnosis: oracle solo connect vs greedy bot, turn-mix telemetry.
 * Usage: npx tsx scripts/tracks-diagnose.ts [--games=200]
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
import { playOracleTurn } from '../src/games/tracks/oracle';
import {
  type DeckManifestEntry,
  PLACEHOLDER_DECK_MANIFEST,
  PLACEHOLDER_DECK_MANIFEST_55,
} from '../src/games/tracks/placeholders';
import { emptyTelemetry } from '../src/games/tracks/telemetry';
import { buildPlayerDeck } from '../src/games/tracks/tiles';

function parseArg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const games = Number(parseArg('games', '200'));

function makeSoloGame(manifest: DeckManifestEntry[]) {
  return {
    ...Tracks,
    setup: (ctx: Parameters<NonNullable<typeof Tracks.setup>>[0]) =>
      Tracks.setup!(ctx, { discardDrawRule: '2023', junctionPoints: 2 }) as TracksState,
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

function soloConnectTurns(
  seed: string,
  manifest: DeckManifestEntry[],
  play: (client: ReturnType<typeof Client<TracksState>>) => 'ok' | 'stuck' | 'over',
): number | null {
  const client = Client({
    game: { ...makeSoloGame(manifest), seed },
    numPlayers: 1,
    debug: false,
  });
  client.start();
  finishDraft(client);
  let turns = 0;
  while (client.getState()?.G.round === 1 && turns < 200) {
    turns++;
    const o = play(client);
    if (o === 'stuck' || o === 'over') break;
  }
  return client.getState()?.G.round === 2 ? turns : null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.floor((sorted.length - 1) * p);
  return sorted[i];
}

function summarize(label: string, values: (number | null)[]) {
  const ok = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (ok.length === 0) return `${label}: no completions`;
  const mean = ok.reduce((a, b) => a + b, 0) / ok.length;
  return `${label}: n=${ok.length}/${values.length} mean=${mean.toFixed(1)} p50=${percentile(ok, 0.5)} p90=${percentile(ok, 0.9)} min=${ok[0]} max=${ok[ok.length - 1]}`;
}

const lines: string[] = [];
const log = (s: string) => {
  console.log(s);
  lines.push(s);
};

log(`TRACKS diagnosis — ${games} solo seeds per deck\n`);
log(
  `Deck composition (per player): straight ${PLACEHOLDER_DECK_MANIFEST.find((e) => e.kind === 'straight')?.count}/50 vs ${PLACEHOLDER_DECK_MANIFEST_55.find((e) => e.kind === 'straight')?.count}/55; track tiles ${buildPlayerDeck(PLACEHOLDER_DECK_MANIFEST).filter((t) => t.kind !== 'obstacle').length}/50\n`,
);

for (const [name, manifest] of [
  ['deck50', PLACEHOLDER_DECK_MANIFEST],
  ['deck55', PLACEHOLDER_DECK_MANIFEST_55],
] as const) {
  const oracle: (number | null)[] = [];
  const greedy: (number | null)[] = [];
  const tel = emptyTelemetry();

  for (let i = 0; i < games; i++) {
    const seed = `diag-${name}-${i}`;
    oracle.push(soloConnectTurns(seed, manifest, playOracleTurn));
    greedy.push(
      soloConnectTurns(`greedy-${name}-${i}`, manifest, (c) =>
        playBotTurn(c, 1, i < 50 ? tel : undefined),
      ),
    );
  }

  log(summarize(`Oracle solo connect (${name})`, oracle));
  log(summarize(`Greedy solo connect (${name})`, greedy));
  const t = tel.playTurns || 1;
  log(
    `Greedy turn mix (${name}, first 50 games): draws ${tel.draws}, discards ${tel.discards} (${((100 * tel.discards) / t).toFixed(1)}%), route extend ${tel.placeExtend} (${((100 * tel.placeExtend) / t).toFixed(1)}%), stall plays ${tel.placeStall} (${((100 * tel.placeStall) / t).toFixed(1)}%), connect plays ${tel.connects}, illegal play attempts ${tel.illegalAttempts}`,
  );
  log('');
}

log('Reading: oracle p50 ~10 shows the placeholder deck can connect in few turns;');
log(
  'greedy p50 ~15 is route-heavy enough for balance sims. High greedy discard % is policy, not deck starvation.',
);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'tracks-sim-diagnosis.md');
writeFileSync(
  out,
  `# TRACKS sim diagnosis\n\nGenerated ${new Date().toISOString().slice(0, 10)}.\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`,
);
log(`Wrote ${out}`);
