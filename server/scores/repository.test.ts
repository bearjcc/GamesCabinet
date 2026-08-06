import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createJsonScoresRepository,
  createMemoryScoresRepository,
  LEADERBOARD_TZ,
  todayInTimezone,
} from './repository.ts';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('ScoresRepository', () => {
  it('ranks all-time and daily scores', () => {
    const repo = createMemoryScoresRepository();
    repo.add('letter-walker', { playerName: 'A', score: 10 });
    repo.add('letter-walker', { playerName: 'B', score: 40 });
    repo.add('2048', { playerName: 'C', score: 999 });

    const top = repo.top('letter-walker');
    expect(top.map((s) => s.playerName)).toEqual(['B', 'A']);
    expect(repo.top('2048')).toHaveLength(1);

    const day = todayInTimezone(LEADERBOARD_TZ);
    expect(repo.topDaily('letter-walker').every((s) => s.datePlayed === day)).toBe(true);
  });

  it('persists to a JSON file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-scores-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'scores.json');
    const repo = createJsonScoresRepository(file);
    repo.add('letter-walker', { playerName: 'Bear', score: 55, moves: 3 });

    const again = createJsonScoresRepository(file);
    expect(again.top('letter-walker')[0]?.playerName).toBe('Bear');
    expect(again.top('letter-walker')[0]?.score).toBe(55);
  });

  it('rejects negative scores', () => {
    const repo = createMemoryScoresRepository();
    expect(() => repo.add('letter-walker', { score: -1 })).toThrow(/Invalid score/);
  });

  it('defaults anonymous names and breaks score ties by recency', () => {
    const repo = createMemoryScoresRepository();
    expect(repo.add('yatzy', { score: 10 }).playerName).toBe('Anonymous');

    const ranked = createMemoryScoresRepository([
      {
        id: 'older',
        gameId: '2048',
        playerName: 'A',
        score: 50,
        datePlayed: '2026-08-05',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'newer',
        gameId: '2048',
        playerName: 'B',
        score: 50,
        datePlayed: '2026-08-05',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(ranked.top('2048').map((s) => s.id)).toEqual(['newer', 'older']);

    const day = todayInTimezone(LEADERBOARD_TZ);
    const dailyRepo = createMemoryScoresRepository([
      {
        id: 'old',
        gameId: '2048',
        playerName: 'A',
        score: 20,
        datePlayed: day,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'new',
        gameId: '2048',
        playerName: 'B',
        score: 20,
        datePlayed: day,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(dailyRepo.topDaily('2048').map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('handles corrupt json store reads and json repo queries', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-scores-bad-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'scores.json');
    fs.writeFileSync(file, '{not json');
    const repo = createJsonScoresRepository(file);
    expect(repo.top('letter-walker')).toEqual([]);
    expect(() => repo.add('letter-walker', { score: -5 })).toThrow(/Invalid score/);
    fs.writeFileSync(file, JSON.stringify({ scores: 'bad' }));
    expect(createJsonScoresRepository(file).top('letter-walker')).toEqual([]);
    const fresh = createJsonScoresRepository(file);
    fresh.add('letter-walker', { score: 12 });
    fresh.add('letter-walker', { playerName: '  ', score: 12 });
    expect(fresh.top('letter-walker')).toHaveLength(2);
    expect(fresh.add('2048', { score: 5 }).playerName).toBe('Anonymous');
    expect(fresh.top('letter-walker', 0)).toEqual([]);
    expect(fresh.topDaily('letter-walker', 0)).toEqual([]);
  });

  it('rejects scores above the per-game ceiling', () => {
    const repo = createMemoryScoresRepository();
    expect(() => repo.add('2048', { score: 200_001 })).toThrow(/exceeds maximum/);
    expect(() => repo.add('yatzy', { score: 2_001 })).toThrow(/exceeds maximum/);
  });

  it('sanitizes meta and prunes per gameId on persist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-scores-prune-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'scores.json');
    const repo = createJsonScoresRepository(file, {
      prune: { topAllTime: 1, recentDays: 0, maxPerGame: 2 },
    });

    const first = repo.add('2048', {
      score: 10,
      meta: { mode: 'a', nested: { x: 1, deep: { y: 2 } }, arr: [1] },
    });
    expect(first.meta).toEqual({ mode: 'a', nested: { x: 1 } });

    repo.add('2048', { score: 20 });
    repo.add('2048', { score: 30 });
    repo.add('yatzy', { score: 50 });

    const again = createJsonScoresRepository(file);
    expect(again.top('2048').map((s) => s.score)).toEqual([30, 20]);
    expect(again.top('yatzy')).toHaveLength(1);
  });
});
