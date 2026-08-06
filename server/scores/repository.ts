import fs from 'node:fs';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import { scoreWithinCeiling } from './ceilings.ts';
import type { PruneOptions } from './prune.ts';
import { pruneScoresForGame } from './prune.ts';
import { sanitizeMeta } from './sanitize.ts';
import { LEADERBOARD_TZ, todayInTimezone } from './timezone.ts';
import type { ScoreInput, ScoreRecord, ScoresStoreFile } from './types.ts';

export { LEADERBOARD_TZ, todayInTimezone };

const idGen = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export type ScoresRepository = {
  add(gameId: string, input: ScoreInput): ScoreRecord;
  top(gameId: string, limit?: number): ScoreRecord[];
  topDaily(gameId: string, limit?: number, now?: Date): ScoreRecord[];
};

export type JsonScoresRepositoryOptions = {
  prune?: PruneOptions;
};

function emptyStore(): ScoresStoreFile {
  return { scores: [] };
}

function assertValidScore(gameId: string, score: number): void {
  if (!Number.isFinite(score) || score < 0 || !Number.isInteger(score)) {
    throw new Error('Invalid score');
  }
  if (!scoreWithinCeiling(gameId, score)) {
    throw new Error('Score exceeds maximum for this game');
  }
}

function buildRecord(gameId: string, input: ScoreInput): ScoreRecord {
  return {
    id: idGen(),
    gameId,
    playerName: (input.playerName?.trim() || 'Anonymous').slice(0, 50),
    score: input.score,
    moves: input.moves,
    wordsFound: input.wordsFound,
    puzzleNumber: input.puzzleNumber,
    datePlayed: todayInTimezone(LEADERBOARD_TZ),
    createdAt: new Date().toISOString(),
    meta: sanitizeMeta(input.meta),
  };
}

export function createJsonScoresRepository(
  filePath: string,
  options: JsonScoresRepositoryOptions = {},
): ScoresRepository {
  const dir = path.dirname(filePath);
  const pruneOptions = options.prune;

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
      assertValidScore(gameId, input.score);
      const store = read();
      const record = buildRecord(gameId, input);
      store.scores.push(record);
      store.scores = pruneScoresForGame(store.scores, gameId, new Date(), pruneOptions);
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
  options: JsonScoresRepositoryOptions = {},
): ScoresRepository & { records: ScoreRecord[] } {
  const records = [...seed];
  const pruneOptions = options.prune;
  return {
    records,
    add(gameId, input) {
      assertValidScore(gameId, input.score);
      const record = buildRecord(gameId, input);
      records.push(record);
      const pruned = pruneScoresForGame(records, gameId, new Date(), pruneOptions);
      records.length = 0;
      records.push(...pruned);
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
