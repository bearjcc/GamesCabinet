import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './limits.ts';

export type RateLimitStore = Map<string, number[]>;

export type RateLimitOptions = {
  now?: () => number;
  windowMs?: number;
  max?: number;
  store?: RateLimitStore;
};

export function createRateLimitStore(): RateLimitStore {
  return new Map();
}

export function rateLimitKey(ip: string, gameId: string): string {
  return `${ip}:${gameId}`;
}

/** Pure sliding-window check: drop expired stamps, then accept or reject. */
export function checkRateLimit(
  timestamps: number[],
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; timestamps: number[] } {
  const cutoff = now - windowMs;
  const recent = timestamps.filter((t) => t > cutoff);
  if (recent.length >= max) {
    return { allowed: false, timestamps: recent };
  }
  return { allowed: true, timestamps: [...recent, now] };
}

export function takeRateLimitSlot(
  store: RateLimitStore,
  key: string,
  options: { now: number; windowMs: number; max: number },
): { allowed: boolean } {
  const current = store.get(key) ?? [];
  const result = checkRateLimit(current, options.now, options.windowMs, options.max);
  store.set(key, result.timestamps);
  return { allowed: result.allowed };
}

export function resolveRateLimitOptions(options: RateLimitOptions = {}) {
  return {
    now: options.now ?? Date.now,
    windowMs: options.windowMs ?? RATE_LIMIT_WINDOW_MS,
    max: options.max ?? RATE_LIMIT_MAX,
    store: options.store ?? createRateLimitStore(),
  };
}
