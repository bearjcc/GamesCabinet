import fs from 'node:fs';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import type { ScoreInput, ScoreRecord, ScoresStoreFile } from './types.ts';

const idGen = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

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

export type ScoresRepository = {
  add(gameId: string, input: ScoreInput): ScoreRecord;
  top(gameId: string, limit?: number): ScoreRecord[];
  topDaily(gameId: string, limit?: number, now?: Date): ScoreRecord[];
};

function emptyStore(): ScoresStoreFile {
  return { scores: [] };
}

export function createJsonScoresRepository(filePath: string): ScoresRepository {
  const dir = path.dirname(filePath);

  function read(): ScoresStoreFile {
    try {
      if (!fs.existsSync(filePath)) return emptyStore();
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as ScoresStoreFile;
      if (!parsed || !Array.isArray(parsed.scores)) return emptyStore();
      return parsed;
    } catch {
      return emptyStore();
    }
  }

  function write(store: ScoresStoreFile): void {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }

  return {
    add(gameId, input) {
      if (!Number.isFinite(input.score) || input.score < 0 || !Number.isInteger(input.score)) {
        throw new Error('Invalid score');
      }
      const store = read();
      const record: ScoreRecord = {
        id: idGen(),
        gameId,
        playerName: (input.playerName?.trim() || 'Anonymous').slice(0, 50),
        score: input.score,
        moves: input.moves,
        wordsFound: input.wordsFound,
        puzzleNumber: input.puzzleNumber,
        datePlayed: todayInTimezone(LEADERBOARD_TZ),
        createdAt: new Date().toISOString(),
        meta: input.meta,
      };
      store.scores.push(record);
      write(store);
      return record;
    },

    top(gameId, limit = 10) {
      return read()
        .scores.filter((s) => s.gameId === gameId)
        .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    topDaily(gameId, limit = 10, now = new Date()) {
      const day = todayInTimezone(LEADERBOARD_TZ, now);
      return read()
        .scores.filter((s) => s.gameId === gameId && s.datePlayed === day)
        .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}

/** In-memory repo for tests. */
export function createMemoryScoresRepository(
  seed: ScoreRecord[] = [],
): ScoresRepository & { records: ScoreRecord[] } {
  const records = [...seed];
  return {
    records,
    add(gameId, input) {
      if (!Number.isFinite(input.score) || input.score < 0 || !Number.isInteger(input.score)) {
        throw new Error('Invalid score');
      }
      const record: ScoreRecord = {
        id: idGen(),
        gameId,
        playerName: (input.playerName?.trim() || 'Anonymous').slice(0, 50),
        score: input.score,
        moves: input.moves,
        wordsFound: input.wordsFound,
        puzzleNumber: input.puzzleNumber,
        datePlayed: todayInTimezone(LEADERBOARD_TZ),
        createdAt: new Date().toISOString(),
        meta: input.meta,
      };
      records.push(record);
      return record;
    },
    top(gameId, limit = 10) {
      return records
        .filter((s) => s.gameId === gameId)
        .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    topDaily(gameId, limit = 10, now = new Date()) {
      const day = todayInTimezone(LEADERBOARD_TZ, now);
      return records
        .filter((s) => s.gameId === gameId && s.datePlayed === day)
        .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}
