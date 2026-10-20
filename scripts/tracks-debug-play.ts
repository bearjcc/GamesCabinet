import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } =
  require('boardgame.io/dist/cjs/client.js') as typeof import('boardgame.io/client');

import {
  finishDraft,
  legalPlacements,
  placementExtendsRoute,
  playBotTurn,
} from '../src/games/tracks/bot';
import { dealRound, Tracks } from '../src/games/tracks/game';
import { placeError } from '../src/games/tracks/grid';
import { PLACEHOLDER_DECK_MANIFEST } from '../src/games/tracks/placeholders';

const game = {
  ...Tracks,
  seed: 'greedy-diag-deck50-0',
  setup: (ctx: Parameters<NonNullable<typeof Tracks.setup>>[0]) =>
    Tracks.setup!(ctx, { discardDrawRule: '2023', junctionPoints: 2 }),
  phases: {
    ...Tracks.phases,
    draft: {
      ...Tracks.phases!.draft,
      onBegin: (args: {
        G: Parameters<typeof dealRound>[0];
        ctx: { numPlayers: number };
        random: { Shuffle: <T>(xs: T[]) => T[] };
      }) => {
        dealRound(
          args.G,
          args.ctx.numPlayers,
          (xs) => args.random.Shuffle(xs),
          PLACEHOLDER_DECK_MANIFEST,
        );
      },
    },
  },
};

const client = Client({ game, numPlayers: 1 });
client.start();
finishDraft(client);
playBotTurn(client, 1);
const s = client.getState()!;
const tile = s.G.players[0].hand.find((t) => t.id === s.G.drawnId)!;
const spots = legalPlacements(s.G, 0, tile, 0);
const ext = spots.filter((sp) =>
  placementExtendsRoute(s.G.players[0].board, tile, sp.row, sp.col, sp.rot),
);
console.log({ drawnId: s.G.drawnId, spots: spots.length, ext: ext.length, first: ext[0] });
if (ext[0]) {
  console.log(
    'placeError',
    placeError(s.G.players[0].board, tile, ext[0].row, ext[0].col, ext[0].rot, { foreign: false }),
  );
}
let steps = 0;
while (client.getState()?.G.round === 1 && steps < 80) {
  steps++;
  playBotTurn(client, 1);
}
console.log({ steps, round: client.getState()?.G.round });
