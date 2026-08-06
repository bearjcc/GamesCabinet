import { MAX_SCORES_PER_GAME, RECENT_DAYS_KEEP, TOP_ALL_TIME_KEEP } from './limits.ts';
import { LEADERBOARD_TZ, todayInTimezone } from './timezone.ts';
import type { ScoreRecord } from './types.ts';

export type PruneOptions = {
  topAllTime?: number;
  recentDays?: number;
  maxPerGame?: number;
};

/** Calendar arithmetic on YYYY-MM-DD (UTC date parts; matches stored Auckland day strings). */
export function addCalendarDays(yyyyMmDd: string, delta: number): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function byScoreThenRecency(a: ScoreRecord, b: ScoreRecord): number {
  return b.score - a.score || b.createdAt.localeCompare(a.createdAt);
}

/**
 * Retain top all-time + recent Pacific/Auckland days for one gameId, hard-capped.
 * Other games' rows are left unchanged.
 */
export function pruneScoresForGame(
  allScores: ScoreRecord[],
  gameId: string,
  now = new Date(),
  options: PruneOptions = {},
): ScoreRecord[] {
  const topAllTime = options.topAllTime ?? TOP_ALL_TIME_KEEP;
  const recentDays = options.recentDays ?? RECENT_DAYS_KEEP;
  const maxPerGame = options.maxPerGame ?? MAX_SCORES_PER_GAME;

  const others = allScores.filter((s) => s.gameId !== gameId);
  const mine = allScores.filter((s) => s.gameId === gameId);
  if (mine.length === 0) return allScores;

  const today = todayInTimezone(LEADERBOARD_TZ, now);
  const recentCutoff = addCalendarDays(today, -recentDays);
  const recent = mine.filter((s) => s.datePlayed >= recentCutoff);
  const topAll = [...mine].sort(byScoreThenRecency).slice(0, topAllTime);

  const keptIds = new Set<string>();
  for (const s of recent) keptIds.add(s.id);
  for (const s of topAll) keptIds.add(s.id);

  let kept = mine.filter((s) => keptIds.has(s.id));
  if (kept.length > maxPerGame) {
    kept = [...kept].sort(byScoreThenRecency).slice(0, maxPerGame);
  }

  return [...others, ...kept];
}
