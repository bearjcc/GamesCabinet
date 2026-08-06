import { describe, expect, it } from 'vitest';
import { LEADERBOARD_TZ, todayInTimezone } from './timezone.ts';

describe('todayInTimezone', () => {
  it('formats Pacific/Auckland calendar days as YYYY-MM-DD', () => {
    // 2026-08-05 14:00 UTC is already 2026-08-06 in Auckland (UTC+12).
    const aucklandNextDay = new Date('2026-08-05T14:00:00.000Z');
    expect(todayInTimezone(LEADERBOARD_TZ, aucklandNextDay)).toBe('2026-08-06');

    const stillPreviousUtcDay = new Date('2026-08-05T10:00:00.000Z');
    expect(todayInTimezone(LEADERBOARD_TZ, stillPreviousUtcDay)).toBe('2026-08-05');
  });
});
