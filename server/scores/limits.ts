/** Per-game score ceilings (sensible upper bounds for solo leaderboards). */
export const SCORE_CEILINGS: Record<string, number> = {
  '2048': 200_000,
  yatzy: 2_000,
  'letter-walker': 5_000,
  klondike: 52,
  freecell: 52,
};

/** Fallback when a catalogue game has hasLeaderboard but no explicit ceiling. */
export const DEFAULT_SCORE_CEILING = 1_000_000;

/** POST rate limit: sliding window per IP + gameId. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 20;

/** Retention: top all-time + recent Auckland days, hard-capped per game. */
export const TOP_ALL_TIME_KEEP = 100;
export const RECENT_DAYS_KEEP = 7;
export const MAX_SCORES_PER_GAME = 500;

/** Bound unbounded client `meta` payloads. */
/** Root object plus one nested plain-object level of primitives. */
export const META_MAX_DEPTH = 1;
export const META_MAX_KEYS = 20;
export const META_MAX_STRING_LENGTH = 200;
export const META_MAX_JSON_BYTES = 2_048;
