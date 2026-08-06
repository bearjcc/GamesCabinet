import type { Context, Middleware } from 'koa';
import { describe, expect, it } from 'vitest';
import { createRateLimitStore } from './rateLimit.ts';
import { createMemoryScoresRepository } from './repository.ts';
import { mountScoreRoutes } from './routes.ts';

type Handler = Middleware;

function createRouter() {
  const routes = new Map<string, Handler[]>();
  return {
    get(path: string, ...handlers: Handler[]) {
      routes.set(`GET ${path}`, handlers);
    },
    post(path: string, ...handlers: Handler[]) {
      routes.set(`POST ${path}`, handlers);
    },
    handler(method: string, path: string) {
      const handlers = routes.get(`${method} ${path}`);
      if (!handlers) throw new Error(`missing route ${method} ${path}`);
      return handlers[handlers.length - 1]!;
    },
  };
}

function ctx(
  overrides: {
    params?: Record<string, string>;
    body?: unknown;
    ip?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = overrides.headers ?? {};
  const context = {
    params: overrides.params ?? { gameId: '2048' },
    status: 200,
    body: undefined as unknown,
    ip: overrides.ip ?? '127.0.0.1',
    request: { body: overrides.body },
    get(name: string) {
      return headers[name.toLowerCase()] ?? '';
    },
  };
  return context as unknown as Context;
}

describe('mountScoreRoutes', () => {
  it('accepts POST scores and returns 201', async () => {
    const router = createRouter();
    const repo = createMemoryScoresRepository();
    mountScoreRoutes(router, repo);
    const context = ctx({ body: { playerName: 'Bear', score: 42 } });
    await router.handler('POST', '/api/scores/:gameId')(context, async () => {});
    expect(context.status).toBe(201);
    expect(context.body).toMatchObject({ success: true, score: { score: 42 } });
  });

  it('returns 400 for missing gameId and invalid payloads', async () => {
    const router = createRouter();
    mountScoreRoutes(router, createMemoryScoresRepository());
    const missing = ctx({ params: { gameId: '  ' }, body: { score: 1 } });
    await router.handler('POST', '/api/scores/:gameId')(missing, async () => {});
    expect(missing.status).toBe(400);

    const undefinedId = ctx({ params: {}, body: { score: 1 } });
    await router.handler('POST', '/api/scores/:gameId')(undefinedId, async () => {});
    expect(undefinedId.status).toBe(400);

    const invalid = ctx({ body: { score: -1 } });
    await router.handler('POST', '/api/scores/:gameId')(invalid, async () => {});
    expect(invalid.status).toBe(400);

    const nonObject = ctx({ body: null });
    await router.handler('POST', '/api/scores/:gameId')(nonObject, async () => {});
    expect(nonObject.status).toBe(400);
  });

  it('rejects non-leaderboard gameIds on POST and GET', async () => {
    const router = createRouter();
    mountScoreRoutes(router, createMemoryScoresRepository());

    const post = ctx({ params: { gameId: 'tic-tac-toe' }, body: { score: 1 } });
    await router.handler('POST', '/api/scores/:gameId')(post, async () => {});
    expect(post.status).toBe(400);
    expect(post.body).toMatchObject({
      success: false,
      error: 'gameId is not a leaderboard game',
    });

    const get = ctx({ params: { gameId: 'tic-tac-toe' } });
    await router.handler('GET', '/api/scores/:gameId')(get, async () => {});
    expect(get.status).toBe(400);
    expect(get.body).toMatchObject({
      success: false,
      error: 'gameId is not a leaderboard game',
    });

    const daily = ctx({ params: { gameId: 'not-a-game' } });
    await router.handler('GET', '/api/scores/:gameId/daily')(daily, async () => {});
    expect(daily.status).toBe(400);
  });

  it('rejects scores above the per-game ceiling', async () => {
    const router = createRouter();
    mountScoreRoutes(router, createMemoryScoresRepository());
    const context = ctx({ body: { score: 200_001 } });
    await router.handler('POST', '/api/scores/:gameId')(context, async () => {});
    expect(context.status).toBe(400);
    expect(context.body).toMatchObject({
      success: false,
      error: 'Score exceeds maximum for this game',
    });
  });

  it('rate-limits POST by IP and gameId', async () => {
    const router = createRouter();
    const store = createRateLimitStore();
    let now = 1_000_000;
    mountScoreRoutes(router, createMemoryScoresRepository(), {
      rateLimit: { store, max: 2, windowMs: 60_000, now: () => now },
    });

    const first = ctx({ ip: '9.9.9.9', body: { score: 1 } });
    await router.handler('POST', '/api/scores/:gameId')(first, async () => {});
    expect(first.status).toBe(201);

    now += 1;
    const second = ctx({ ip: '9.9.9.9', body: { score: 2 } });
    await router.handler('POST', '/api/scores/:gameId')(second, async () => {});
    expect(second.status).toBe(201);

    now += 1;
    const blocked = ctx({ ip: '9.9.9.9', body: { score: 3 } });
    await router.handler('POST', '/api/scores/:gameId')(blocked, async () => {});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, error: 'Rate limit exceeded' });

    const otherGame = ctx({
      params: { gameId: 'yatzy' },
      ip: '9.9.9.9',
      body: { score: 10 },
    });
    await router.handler('POST', '/api/scores/:gameId')(otherGame, async () => {});
    expect(otherGame.status).toBe(201);

    const otherIp = ctx({
      headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' },
      body: { score: 4 },
    });
    await router.handler('POST', '/api/scores/:gameId')(otherIp, async () => {});
    expect(otherIp.status).toBe(201);
  });

  it('falls back when x-forwarded-for is empty and ip is missing', async () => {
    const router = createRouter();
    const store = createRateLimitStore();
    mountScoreRoutes(router, createMemoryScoresRepository(), {
      rateLimit: { store, max: 1, windowMs: 60_000, now: () => 50 },
    });
    const context = ctx({
      ip: '',
      headers: { 'x-forwarded-for': '  , 9.9.9.9' },
      body: { score: 7 },
    });
    await router.handler('POST', '/api/scores/:gameId')(context, async () => {});
    expect(context.status).toBe(201);

    const blocked = ctx({
      ip: '',
      headers: { 'x-forwarded-for': '  , 9.9.9.9' },
      body: { score: 8 },
    });
    await router.handler('POST', '/api/scores/:gameId')(blocked, async () => {});
    expect(blocked.status).toBe(429);
  });

  it('returns leaderboard lists for GET routes', async () => {
    const router = createRouter();
    const repo = createMemoryScoresRepository();
    repo.add('2048', { playerName: 'Bear', score: 99 });
    mountScoreRoutes(router, repo);

    const all = ctx({});
    await router.handler('GET', '/api/scores/:gameId')(all, async () => {});
    expect(all.body).toMatchObject({ success: true, scores: [{ score: 99 }] });

    const daily = ctx({});
    await router.handler('GET', '/api/scores/:gameId/daily')(daily, async () => {});
    expect(daily.body).toMatchObject({ success: true, scores: [{ score: 99 }] });

    const missing = ctx({ params: { gameId: '' } });
    await router.handler('GET', '/api/scores/:gameId')(missing, async () => {});
    expect(missing.status).toBe(400);

    const missingDaily = ctx({ params: { gameId: '' } });
    await router.handler('GET', '/api/scores/:gameId/daily')(missingDaily, async () => {});
    expect(missingDaily.status).toBe(400);
  });
});
