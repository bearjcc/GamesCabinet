import { createRequire } from 'node:module';
import type { Context, Middleware } from 'koa';
import type { ScoresRepository } from './repository.ts';
import type { ScoreInput } from './types.ts';

const require = createRequire(import.meta.url);
const koaBody = require('koa-body') as () => Middleware;

type RouterLike = {
  get: (path: string, ...handlers: Middleware[]) => void;
  post: (path: string, ...handlers: Middleware[]) => void;
};

function readBody(ctx: Context): ScoreInput {
  const body = (ctx.request as { body?: unknown }).body;
  if (!body || typeof body !== 'object') return { score: Number.NaN };
  return body as ScoreInput;
}

export function mountScoreRoutes(router: RouterLike, repo: ScoresRepository): void {
  router.post('/api/scores/:gameId', koaBody(), async (ctx) => {
    const gameId = String(ctx.params.gameId || '').trim();
    if (!gameId) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing gameId' };
      return;
    }
    const input = readBody(ctx);
    try {
      const score = repo.add(gameId, input);
      ctx.status = 201;
      ctx.body = { success: true, score };
    } catch {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Invalid score payload' };
    }
  });

  router.get('/api/scores/:gameId', async (ctx) => {
    const gameId = String(ctx.params.gameId || '').trim();
    if (!gameId) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing gameId' };
      return;
    }
    ctx.body = { success: true, scores: repo.top(gameId) };
  });

  router.get('/api/scores/:gameId/daily', async (ctx) => {
    const gameId = String(ctx.params.gameId || '').trim();
    if (!gameId) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Missing gameId' };
      return;
    }
    ctx.body = { success: true, scores: repo.topDaily(gameId) };
  });
}
