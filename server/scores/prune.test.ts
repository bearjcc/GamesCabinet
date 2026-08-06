import { describe, expect, it } from 'vitest';
import { addCalendarDays, pruneScoresForGame } from './prune.ts';
import type { ScoreRecord } from './types.ts';

function record(
  overrides: Partial<ScoreRecord> & Pick<ScoreRecord, 'id' | 'gameId' | 'score' | 'datePlayed'>,
): ScoreRecord {
  return {
    playerName: 'P',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pruneScoresForGame', () => {
  it('adds calendar days on YYYY-MM-DD without shifting timezone', () => {
    expect(addCalendarDays('2026-08-06', -7)).toBe('2026-07-30');
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('keeps other games untouched and retains top + recent for the target game', () => {
    const now = new Date('2026-08-06T12:00:00+12:00');
    const scores: ScoreRecord[] = [
      record({ id: 'other', gameId: 'yatzy', score: 1, datePlayed: '2026-01-01' }),
      record({
        id: 'old-low',
        gameId: '2048',
        score: 10,
        datePlayed: '2026-01-01',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      record({
        id: 'old-high',
        gameId: '2048',
        score: 9_999,
        datePlayed: '2026-01-02',
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      record({
        id: 'recent',
        gameId: '2048',
        score: 5,
        datePlayed: '2026-08-05',
        createdAt: '2026-08-05T00:00:00.000Z',
      }),
    ];

    const pruned = pruneScoresForGame(scores, '2048', now, {
      topAllTime: 1,
      recentDays: 7,
      maxPerGame: 500,
    });

    expect(pruned.map((s) => s.id).sort()).toEqual(['old-high', 'other', 'recent']);
  });

  it('returns the store unchanged when the game has no rows', () => {
    const scores = [record({ id: 'y', gameId: 'yatzy', score: 1, datePlayed: '2026-08-06' })];
    expect(pruneScoresForGame(scores, '2048')).toEqual(scores);
  });

  it('hard-caps per gameId by score then recency', () => {
    const now = new Date('2026-08-06T12:00:00+12:00');
    const scores = Array.from({ length: 6 }, (_, i) =>
      record({
        id: `s${i}`,
        gameId: 'letter-walker',
        score: i,
        datePlayed: '2026-08-06',
        createdAt: `2026-08-06T00:00:0${i}.000Z`,
      }),
    );

    const pruned = pruneScoresForGame(scores, 'letter-walker', now, {
      topAllTime: 100,
      recentDays: 7,
      maxPerGame: 3,
    });

    expect(pruned.map((s) => s.id)).toEqual(['s5', 's4', 's3']);
  });
});
