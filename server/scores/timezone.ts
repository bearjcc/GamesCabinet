export const LEADERBOARD_TZ = 'Pacific/Auckland';

export function todayInTimezone(timeZone: string, now = new Date()): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
