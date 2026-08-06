import { createRequire } from 'node:module';
import type { Context, Middleware } from 'koa';
import { scoreWithinCeiling } from './ceilings.ts';
import {
  type RateLimitOptions,
  rateLimitKey,
  resolveRateLimitOptions,
  takeRateLimitSlot,
} from './rateLimit.ts';
import type { ScoresRepository } from './repository.ts';
import type { ScoreInput } from './types.ts';
import { isLeaderboardGame } from './whitelist.ts';

const require = createRequire(import.meta.url);
const koaBody = require('koa-body') as () => Middleware;

type RouterLike = {
  get: (path: string, ...handlers: Middleware[]) => void;
  post: (path: string, ...handlers: Middleware[]) => void;
};

export type ScoreRouteOptions = {
  rateLimit?: RateLimitOptions;
  getClientIp?: (ctx: Context) => string;
};

function readBody(ctx: Context): ScoreInput {
  const body = (ctx.request as { body?: unknown }).body;
  if (!body || typeof body !== 'object') return { score: Number.NaN };
  return body as ScoreInput;
}

function defaultClientIp(ctx: Context): string {
  const forwarded = ctx.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return ctx.ip || 'unknown';
}

function rejectBadGameId(ctx: Context, gameId: string): boolean {
  if (!gameId) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Missing gameId' };
    return true;
  }
  if (!isLeaderboardGame(gameId)) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'gameId is not a leaderboard game' };
    return true;
  }
  return false;
}

export function mountScoreRoutes(
  router: RouterLike,
  repo: ScoresRepository,
  options: ScoreRouteOptions = {},
): void {
  const rate = resolveRateLimitOptions(options.rateLimit);
  const getClientIp = options.getClientIp ?? defaultClientIp;

  router.post('/api/scores/:gameId', koaBody(), async (ctx) => {
    const gameId = String(ctx.params.gameId || '').trim();
    if (rejectBadGameId(ctx, gameId)) return;

    const ip = getClientIp(ctx);
    const slot = takeRateLimitSlot(rate.store, rateLimitKey(ip, gameId), {
      now: rate.now(),
      windowMs: rate.windowMs,
      max: rate.max,
    });
    if (!slot.allowed) {
      ctx.status = 429;
      ctx.body = { success: false, error: 'Rate limit exceeded' };
      return;
    }

    const input = readBody(ctx);
    if (Number.isFinite(input.score) && !scoreWithinCeiling(gameId, input.score)) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Score exceeds maximum for this game' };
      return;
    }

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
    if (rejectBadGameId(ctx, gameId)) return;
    ctx.body = { success: true, scores: repo.top(gameId) };
  });

  router.get('/api/scores/:gameId/daily', async (ctx) => {
    const gameId = String(ctx.params.gameId || '').trim();
    if (rejectBadGameId(ctx, gameId)) return;
    ctx.body = { success: true, scores: repo.topDaily(gameId) };
  });
}
