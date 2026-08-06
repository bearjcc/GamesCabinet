import { describe, expect, it } from 'vitest';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './limits.ts';
import {
  checkRateLimit,
  createRateLimitStore,
  rateLimitKey,
  takeRateLimitSlot,
} from './rateLimit.ts';

describe('rateLimit helpers', () => {
  it('builds a stable per-IP per-game key', () => {
    expect(rateLimitKey('1.2.3.4', '2048')).toBe('1.2.3.4:2048');
  });

  it('allows requests under the sliding-window max', () => {
    const now = 1_000_000;
    const first = checkRateLimit([], now, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);
    expect(first.allowed).toBe(true);
    expect(first.timestamps).toEqual([now]);

    let stamps = first.timestamps;
    for (let i = 1; i < RATE_LIMIT_MAX; i++) {
      const next = checkRateLimit(stamps, now + i, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);
      expect(next.allowed).toBe(true);
      stamps = next.timestamps;
    }
    expect(stamps).toHaveLength(RATE_LIMIT_MAX);

    const blocked = checkRateLimit(
      stamps,
      now + RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.timestamps).toHaveLength(RATE_LIMIT_MAX);
  });

  it('drops timestamps outside the window', () => {
    const windowMs = 1_000;
    const stamps = [100, 200, 300];
    const result = checkRateLimit(stamps, 1_500, windowMs, 3);
    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([1_500]);
  });

  it('tracks slots in a shared store', () => {
    const store = createRateLimitStore();
    const key = rateLimitKey('10.0.0.1', 'yatzy');
    for (let i = 0; i < 3; i++) {
      expect(
        takeRateLimitSlot(store, key, { now: 10_000 + i, windowMs: 60_000, max: 3 }).allowed,
      ).toBe(true);
    }
    expect(takeRateLimitSlot(store, key, { now: 10_003, windowMs: 60_000, max: 3 }).allowed).toBe(
      false,
    );
    expect(
      takeRateLimitSlot(store, rateLimitKey('10.0.0.2', 'yatzy'), {
        now: 10_003,
        windowMs: 60_000,
        max: 3,
      }).allowed,
    ).toBe(true);
  });
});
