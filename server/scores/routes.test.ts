import type { Context, Middleware } from 'koa';
import { describe, expect, it } from 'vitest';
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

function ctx(overrides: { params?: Record<string, string>; body?: unknown } = {}) {
  const context = {
    params: overrides.params ?? { gameId: '2048' },
    status: 200,
    body: undefined as unknown,
    request: { body: overrides.body },
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
