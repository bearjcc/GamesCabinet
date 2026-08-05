import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { customAlphabet } from 'nanoid';
import { gameList } from '../src/games/registry.ts';
import { createMatchStore } from './db.ts';
import { resolveOrigins } from './origins.ts';
import { normaliseRoomCode } from './roomCode.ts';
import { createJsonScoresRepository } from './scores/repository.ts';
import { mountScoreRoutes } from './scores/routes.ts';
import { readIndexHtml, shouldServeSpa } from './spaFallback.ts';

const require = createRequire(import.meta.url);
const { Server } = require('boardgame.io/server') as typeof import('boardgame.io/server');
const serve = require('koa-static') as typeof import('koa-static');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
const dist = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(dist, 'index.html');
const scoresPath = process.env.SCORES_PATH || path.join(__dirname, '..', 'data', 'scores.json');

/** Short room codes for URLs; credentials stay long via generateCredentials. */
const roomCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);

const db = createMatchStore();

const server = Server({
  games: gameList,
  origins: resolveOrigins(),
  ...(db ? { db: db as NonNullable<Parameters<typeof Server>[0]>['db'] } : {}),
  uuid: () => roomCode(),
  generateCredentials: () => customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24)(),
});

server.router.get('/health', (ctx) => {
  ctx.body = { ok: true };
});

/** Room codes are global match IDs; resolve game from metadata so join needs only the code. */
server.router.get('/rooms/:code', async (ctx) => {
  const matchID = normaliseRoomCode(String(ctx.params.code || ''));
  if (!matchID) {
    ctx.status = 400;
    ctx.body = { error: 'Missing room code' };
    return;
  }
  const { metadata } = await server.db.fetch(matchID, { metadata: true });
  if (!metadata?.gameName) {
    ctx.status = 404;
    ctx.body = { error: 'Room not found' };
    return;
  }
  ctx.body = { matchID, gameName: metadata.gameName };
});

mountScoreRoutes(server.router, createJsonScoresRepository(scoresPath));

const { app } = server;
app.use(serve(dist));

/** SPA fallback so deep links like /g/:game/:code serve the client shell. */
app.use(async (ctx, next) => {
  await next();
  if (!shouldServeSpa(ctx.method, ctx.status, ctx.path)) return;
  const page = readIndexHtml(indexHtml);
  if (!page) return;
  ctx.status = page.status;
  ctx.type = page.type;
  ctx.body = page.body;
});

server.run(PORT, () => {
  console.log(`GamesCabinet server on http://localhost:${PORT}`);
});
